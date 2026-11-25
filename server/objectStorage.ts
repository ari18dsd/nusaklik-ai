import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface ObjectStorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export type StorageDriver = 'object_storage' | 'local_ephemeral';

export function getObjectStorageConfig(): ObjectStorageConfig | null {
  const endpoint = (process.env.OBJECT_STORAGE_ENDPOINT || '').trim().replace(/\/+$/, '');
  const bucket = (process.env.OBJECT_STORAGE_BUCKET || '').trim();
  const accessKeyId = (process.env.OBJECT_STORAGE_ACCESS_KEY || '').trim();
  const secretAccessKey = (process.env.OBJECT_STORAGE_SECRET_KEY || '').trim();
  const region = (process.env.OBJECT_STORAGE_REGION || 'auto').trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

export function getStorageDriver(): StorageDriver {
  return getObjectStorageConfig() ? 'object_storage' : 'local_ephemeral';
}

const S3_TIMEOUT_MS = 10_000;

function extractSafeS3Error(rawText: string): string {
  const codeMatch = rawText.match(/<Code>([^<]{1,80})<\/Code>/i);
  const msgMatch = rawText.match(/<Message>([^<]{1,180})<\/Message>/i);
  if (codeMatch || msgMatch) {
    const parts = [codeMatch?.[1], msgMatch?.[1]].filter(Boolean);
    return parts.join(': ').slice(0, 220);
  }
  return rawText
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function encodeS3Path(objectKey: string): string {
  return objectKey
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function signS3Request(params: {
  cfg: ObjectStorageConfig;
  method: 'PUT' | 'GET' | 'DELETE';
  objectKey: string;
  payload: Buffer;
  contentType?: string;
}): { url: string; headers: Record<string, string> } {
  const { cfg, method, objectKey, payload, contentType } = params;
  const parsed = new URL(cfg.endpoint);
  const basePath = parsed.pathname.replace(/\/+$/, '');
  const canonicalUri = `${basePath}/${encodeURIComponent(cfg.bucket)}/${encodeS3Path(objectKey)}`;
  const url = `${parsed.origin}${canonicalUri}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(payload);

  const headersToSign: Record<string, string> = {
    host: parsed.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) {
    headersToSign['content-type'] = contentType;
  }

  const sortedKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headersToSign[k]}\n`).join('');
  const signedHeaders = sortedKeys.join(';');

  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, cfg.region);
  const kService = hmacSha256(kRegion, 's3');
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign)
    .digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url,
    headers: {
      ...headersToSign,
      Authorization: authorization,
    },
  };
}

export async function putStoredObject(params: {
  localBaseDir: string;
  objectKey: string;
  fileName: string;
  buffer: Buffer;
  contentType: string;
}): Promise<void> {
  const cfg = getObjectStorageConfig();
  if (cfg) {
    const signed = signS3Request({
      cfg,
      method: 'PUT',
      objectKey: params.objectKey,
      payload: params.buffer,
      contentType: params.contentType,
    });
    const res = await fetch(signed.url, {
      method: 'PUT',
      headers: signed.headers,
      body: new Uint8Array(params.buffer),
      signal: AbortSignal.timeout(S3_TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const detail = extractSafeS3Error(text);
      throw new Error(
        `PUT gagal (HTTP ${res.status})${detail ? `: ${detail}` : ''}`
      );
    }
    return;
  }

  const resolved = resolveSafeLocalPath(params.localBaseDir, params.fileName);
  if (!resolved) {
    throw new Error('Nama file penyimpanan lokal tidak aman.');
  }
  fs.mkdirSync(params.localBaseDir, { recursive: true });
  fs.writeFileSync(resolved, params.buffer);
}

async function getStoredObjectInternal(params: {
  localBaseDir: string;
  objectKey: string;
  fileName: string;
}): Promise<{
  ok: boolean;
  status?: number;
  error?: string;
  data: { buffer: Buffer; contentType: string } | null;
}> {
  const cfg = getObjectStorageConfig();
  if (cfg) {
    const signed = signS3Request({
      cfg,
      method: 'GET',
      objectKey: params.objectKey,
      payload: Buffer.alloc(0),
    });
    const res = await fetch(signed.url, {
      method: 'GET',
      headers: signed.headers,
      signal: AbortSignal.timeout(S3_TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const detail = extractSafeS3Error(text);
      return {
        ok: false,
        status: res.status,
        error: `GET gagal (HTTP ${res.status})${detail ? `: ${detail}` : ''}`,
        data: null,
      };
    }
    const arr = await res.arrayBuffer();
    return {
      ok: true,
      status: res.status,
      data: {
        buffer: Buffer.from(arr),
        contentType: res.headers.get('content-type') || 'application/octet-stream',
      },
    };
  }

  const resolved = resolveSafeLocalPath(params.localBaseDir, params.fileName);
  if (!resolved || !fs.existsSync(resolved)) {
    return { ok: false, status: 404, data: null };
  }
  return {
    ok: true,
    status: 200,
    data: {
      buffer: fs.readFileSync(resolved),
      contentType: inferContentType(params.fileName),
    },
  };
}

export async function getStoredObject(params: {
  localBaseDir: string;
  objectKey: string;
  fileName: string;
}): Promise<{ buffer: Buffer; contentType: string } | null> {
  const res = await getStoredObjectInternal(params);
  return res.data;
}

export async function deleteStoredObject(params: {
  localBaseDir: string;
  objectKey: string;
  fileName: string;
}): Promise<void> {
  const cfg = getObjectStorageConfig();
  if (cfg) {
    const signed = signS3Request({
      cfg,
      method: 'DELETE',
      objectKey: params.objectKey,
      payload: Buffer.alloc(0),
    });
    await fetch(signed.url, {
      method: 'DELETE',
      headers: signed.headers,
      signal: AbortSignal.timeout(S3_TIMEOUT_MS),
    }).catch(() => {});
    return;
  }

  const resolved = resolveSafeLocalPath(params.localBaseDir, params.fileName);
  if (resolved && fs.existsSync(resolved)) {
    fs.unlinkSync(resolved);
  }
}

export async function verifyStorageConnection(localTempDir: string): Promise<{
  ok: boolean;
  driver: StorageDriver;
  bucketConfigured: string;
  regionConfigured: string;
  putOk: boolean;
  getOk: boolean;
  publicAccessBlocked: boolean;
  deleteOk: boolean;
  error?: string;
}> {
  const cfg = getObjectStorageConfig();
  if (!cfg) {
    return {
      ok: false,
      driver: 'local_ephemeral',
      bucketConfigured: '',
      regionConfigured: '',
      putOk: false,
      getOk: false,
      publicAccessBlocked: true,
      deleteOk: false,
      error: 'Variabel OBJECT_STORAGE_* belum dikonfigurasi lengkap.',
    };
  }

  const testFileName = `diag_${crypto.randomUUID()}.pdf`;
  const objectKey = `private/verify/${testFileName}`;
  const samplePdf = Buffer.from(`%PDF-1.4\n% NusaKlik Storage Check\n%%EOF\n`, 'utf-8');

  let putOk = false;
  let getOk = false;
  let publicAccessBlocked = false;
  let deleteOk = false;

  try {
    await putStoredObject({
      localBaseDir: localTempDir,
      objectKey,
      fileName: testFileName,
      buffer: samplePdf,
      contentType: 'application/pdf',
    });
    putOk = true;

    const fetchedRes = await getStoredObjectInternal({
      localBaseDir: localTempDir,
      objectKey,
      fileName: testFileName,
    });
    if (!fetchedRes.ok || !fetchedRes.data) {
      throw new Error(fetchedRes.error || 'GET gagal mengambil file uji dari bucket.');
    }
    if (Buffer.compare(fetchedRes.data.buffer, samplePdf) !== 0) {
      throw new Error('GET gagal: isi file unduhan tidak cocok dengan file uji.');
    }
    getOk = true;

    const parsed = new URL(cfg.endpoint);
    const basePath = parsed.pathname.replace(/\/+$/, '');
    const unauthS3 = await fetch(
      `${parsed.origin}${basePath}/${encodeURIComponent(cfg.bucket)}/${encodeS3Path(objectKey)}`,
      { signal: AbortSignal.timeout(S3_TIMEOUT_MS) }
    ).catch(() => null);
    const unauthPublic = await fetch(
      `${parsed.origin}/storage/v1/object/public/${encodeURIComponent(cfg.bucket)}/${encodeS3Path(objectKey)}`,
      { signal: AbortSignal.timeout(S3_TIMEOUT_MS) }
    ).catch(() => null);

    publicAccessBlocked =
      (!unauthS3 || unauthS3.status !== 200) && (!unauthPublic || unauthPublic.status !== 200);

    const delSigned = signS3Request({
      cfg,
      method: 'DELETE',
      objectKey,
      payload: Buffer.alloc(0),
    });
    const delRes = await fetch(delSigned.url, {
      method: 'DELETE',
      headers: delSigned.headers,
      signal: AbortSignal.timeout(S3_TIMEOUT_MS),
    });
    if (!delRes.ok) {
      const delText = await delRes.text().catch(() => '');
      const delDetail = extractSafeS3Error(delText);
      throw new Error(
        `DELETE gagal (HTTP ${delRes.status})${delDetail ? `: ${delDetail}` : ''}`
      );
    }
    const afterDel = await getStoredObject({
      localBaseDir: localTempDir,
      objectKey,
      fileName: testFileName,
    });
    deleteOk = afterDel === null;
    if (!deleteOk) {
      throw new Error('DELETE merespons sukses, tetapi file uji masih terbaca di bucket.');
    }
    if (!publicAccessBlocked) {
      throw new Error('Peringatan privasi: file uji dapat diakses via URL publik tanpa otorisasi.');
    }

    return {
      ok: true,
      driver: 'object_storage',
      bucketConfigured: cfg.bucket,
      regionConfigured: cfg.region,
      putOk,
      getOk,
      publicAccessBlocked,
      deleteOk,
    };
  } catch (err) {
    await deleteStoredObject({
      localBaseDir: localTempDir,
      objectKey,
      fileName: testFileName,
    }).catch(() => {});
    const safeMsg = err instanceof Error ? err.message : 'Gagal terhubung ke Object Storage.';
    return {
      ok: false,
      driver: 'object_storage',
      bucketConfigured: cfg.bucket,
      regionConfigured: cfg.region,
      putOk,
      getOk,
      publicAccessBlocked,
      deleteOk,
      error: safeMsg.slice(0, 220),
    };
  }
}

export function resolveSafeLocalPath(baseDir: string, filename: string): string | null {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }
  const resolved = path.resolve(baseDir, filename);
  if (!resolved.startsWith(baseDir + path.sep)) {
    return null;
  }
  return resolved;
}

export function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;
  switch (ext) {
    case '.pdf':
      return buffer.subarray(0, 4).toString('ascii') === '%PDF';
    case '.png':
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case '.jpg':
    case '.jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case '.webp':
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case '.zip':
    case '.xlsx':
    case '.docx':
    case '.pptx':
    case '.epub':
      return buffer[0] === 0x50 && buffer[1] === 0x4b; // PK zip header
    case '.ico':
      return buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00;
    case '.svg': {
      const head = buffer.subarray(0, 512).toString('utf-8').toLowerCase();
      return head.includes('<svg') && !head.includes('<script');
    }
    case '.xls':
      return buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
    case '.csv':
      return !buffer.subarray(0, 256).includes(0x00);
    default:
      return false;
  }
}

function inferContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.epub': 'application/epub+zip',
    '.csv': 'text/csv; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  return map[ext] || 'application/octet-stream';
}
