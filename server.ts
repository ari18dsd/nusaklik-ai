import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  deleteStoredObject,
  getStorageDriver,
  getStoredObject,
  putStoredObject,
  validateMagicBytes,
  verifyStorageConnection,
} from './server/objectStorage.ts';
import { INITIAL_DEMO_PRODUCTS, LEGACY_APPS_SCRIPT_URL } from './src/data/catalogData.ts';

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId: string;
}

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig: FirebaseAppletConfig = JSON.parse(
  fs.readFileSync(configPath, 'utf-8')
);

const adminApp = getApps().length
  ? getApp()
  : initializeApp({ projectId: firebaseConfig.projectId });
const adminAuth = getAuth(adminApp);

const BOOTSTRAP_ADMIN_EMAIL = 'akunob300@gmail.com';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const configuredSigningSecret = (process.env.ORDER_SIGNING_SECRET || '').trim();
const IS_SIGNING_SECRET_CONFIGURED = configuredSigningSecret.length >= 32;
const EPHEMERAL_DEV_SIGNING_SECRET = IS_SIGNING_SECRET_CONFIGURED
  ? ''
  : crypto.randomBytes(32).toString('hex');

function getActiveSigningSecret(): string | null {
  if (IS_SIGNING_SECRET_CONFIGURED) {
    return configuredSigningSecret;
  }
  if (!IS_PRODUCTION) {
    return EPHEMERAL_DEV_SIGNING_SECRET;
  }
  return null;
}

const ROOT_DIR = process.cwd();
const PRIVATE_PRODUCTS_DIR = path.resolve(ROOT_DIR, 'private_storage', 'products');
const PRIVATE_PROOFS_DIR = path.resolve(ROOT_DIR, 'private_storage', 'proofs');
const PUBLIC_UPLOADS_DIR = path.resolve(ROOT_DIR, 'public_uploads');

fs.mkdirSync(PRIVATE_PRODUCTS_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_PROOFS_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function signOrderPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

interface FirestoreRestDoc {
  fields?: Record<string, FirestoreRestValue>;
}

interface FirestoreRestValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
}

const DOWNLOAD_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function readRestString(doc: FirestoreRestDoc, key: string): string {
  return doc.fields?.[key]?.stringValue ?? '';
}

function readRestNumber(doc: FirestoreRestDoc, key: string): number {
  const val = doc.fields?.[key];
  if (!val) return 0;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return Number(val.doubleValue);
  return 0;
}

function readRestBool(doc: FirestoreRestDoc, key: string): boolean {
  return Boolean(doc.fields?.[key]?.booleanValue);
}

function readRestTimestamp(doc: FirestoreRestDoc, key: string): number | null {
  const raw = doc.fields?.[key]?.timestampValue;
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchFirestoreDoc(
  collectionPath: string,
  docId: string,
  bearerToken?: string
): Promise<FirestoreRestDoc | null> {
  if (!SAFE_ID_REGEX.test(docId)) return null;
  const dbId = encodeURIComponent(firebaseConfig.firestoreDatabaseId || '(default)');
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    firebaseConfig.projectId
  )}/databases/${dbId}/documents/${collectionPath}/${encodeURIComponent(docId)}`;

  const headers: Record<string, string> = {};
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return (await res.json()) as FirestoreRestDoc;
}

interface AuthedRequest extends Request {
  adminEmail?: string;
  adminUid?: string;
  adminBearerToken?: string;
}

async function requireAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      res.status(401).json({ error: 'Token autentikasi admin diperlukan.' });
      return;
    }

    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email_verified) {
      res.status(403).json({ error: 'Email akun belum terverifikasi.' });
      return;
    }

    if (decoded.email === BOOTSTRAP_ADMIN_EMAIL) {
      req.adminEmail = decoded.email;
      req.adminUid = decoded.uid;
      req.adminBearerToken = token;
      next();
      return;
    }

    const adminDoc = await fetchFirestoreDoc('admins', decoded.uid, token);
    if (adminDoc && readRestString(adminDoc, 'uid') === decoded.uid) {
      req.adminEmail = decoded.email || '';
      req.adminUid = decoded.uid;
      req.adminBearerToken = token;
      next();
      return;
    }

    res.status(403).json({ error: 'Akun ini tidak memiliki hak akses admin.' });
  } catch {
    res.status(401).json({ error: 'Sesi autentikasi admin tidak valid.' });
  }
}

const memoryStorage = multer.memoryStorage();

const proofUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format file bukti pembayaran harus JPG, PNG, WebP, atau PDF.'));
    }
  },
});

const assetUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/x-icon',
      'image/vnd.microsoft.icon',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format aset harus berupa gambar (JPG, PNG, WebP, SVG, ICO).'));
    }
  },
});

const privateProductUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = ['.pdf', '.zip', '.xlsx', '.xls', '.docx', '.pptx', '.epub', '.csv'];
    if (allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format file produk digital tidak diizinkan.'));
    }
  },
});

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  app.use(
    '/uploads',
    express.static(PUBLIC_UPLOADS_DIR, {
      dotfiles: 'deny',
      index: false,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );

  // Public asset retrieval supporting both S3-compatible Object Storage and local fallback
  app.get('/api/assets/:filename', async (req: Request, res: Response) => {
    try {
      const filename = String(req.params.filename || '');
      if (!/^[a-zA-Z0-9._-]{4,140}$/.test(filename) || filename.includes('..')) {
        res.status(400).json({ error: 'Nama aset tidak valid.' });
        return;
      }
      const obj = await getStoredObject({
        localBaseDir: PUBLIC_UPLOADS_DIR,
        objectKey: `public/assets/${filename}`,
        fileName: filename,
      });
      if (!obj) {
        res.status(404).json({ error: 'Aset tidak ditemukan.' });
        return;
      }
      res.setHeader('Content-Type', obj.contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(obj.buffer);
    } catch {
      res.status(500).json({ error: 'Gagal memuat aset.' });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'NusaKlik.id',
      orderSigningConfigured: IS_SIGNING_SECRET_CONFIGURED,
      storageDriver: getStorageDriver(),
    });
  });

  // Admin System Readiness Check (No secret values ever returned)
  app.get('/api/admin/system-status', requireAdmin, (_req: Request, res: Response) => {
    res.json({
      nodeEnv: process.env.NODE_ENV || 'development',
      isProduction: IS_PRODUCTION,
      orderSigningSecretConfigured: IS_SIGNING_SECRET_CONFIGURED,
      storageDriver: getStorageDriver(),
      firebaseProjectId: firebaseConfig.projectId,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
    });
  });

  // Admin Live Storage Round-Trip Test (PUT -> GET -> Public Block Check -> DELETE)
  app.post('/api/admin/test-storage', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const result = await verifyStorageConnection(PRIVATE_PRODUCTS_DIR);
      if (!result.ok) {
        console.error(
          '[storage-test] failed:',
          JSON.stringify({
            driver: result.driver,
            bucket: result.bucketConfigured,
            region: result.regionConfigured,
            putOk: result.putOk,
            getOk: result.getOk,
            publicAccessBlocked: result.publicAccessBlocked,
            deleteOk: result.deleteOk,
            error: result.error,
          })
        );
      }
      res.status(result.ok ? 200 : 502).json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 200) : 'Kesalahan internal uji storage.';
      console.error('[storage-test] unexpected error:', msg);
      res.status(500).json({ ok: false, error: msg });
    }
  });

  // 1. Authoritative Server-Side Order Preparation & Price Recalculation
  app.post('/api/orders/prepare', async (req: Request, res: Response) => {
    try {
      const signingSecret = getActiveSigningSecret();
      if (!signingSecret) {
        res.status(503).json({
          error:
            'Konfigurasi server ORDER_SIGNING_SECRET belum disetel pada environment produksi. Hubungi admin toko.',
        });
        return;
      }

      const { customerName, customerEmail, customerWhatsapp, paymentMethod, items } = req.body ?? {};

      if (
        typeof customerName !== 'string' ||
        customerName.trim().length < 2 ||
        customerName.trim().length > 120
      ) {
        res.status(400).json({ error: 'Nama lengkap minimal 2 karakter.' });
        return;
      }

      if (
        typeof customerEmail !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) ||
        customerEmail.trim().length > 180
      ) {
        res.status(400).json({ error: 'Alamat email tidak valid.' });
        return;
      }

      const cleanWa =
        typeof customerWhatsapp === 'string'
          ? customerWhatsapp.replace(/[\s()-]/g, '')
          : '';
      if (!/^[0-9+]{8,20}$/.test(cleanWa)) {
        res.status(400).json({ error: 'Nomor WhatsApp harus berisi 8–20 digit angka.' });
        return;
      }

      if (paymentMethod !== 'Transfer Bank' && paymentMethod !== 'QRIS') {
        res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
        return;
      }

      if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
        res.status(400).json({ error: 'Keranjang pesanan kosong atau melebihi batas item.' });
        return;
      }

      const verifiedItems: Array<{
        productId: string;
        title: string;
        category: string;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
        isDemo: boolean;
      }> = [];

      let subtotal = 0;

      for (const rawItem of items) {
        const productId = typeof rawItem?.productId === 'string' ? rawItem.productId.trim() : '';
        const qty = Number(rawItem?.quantity);

        if (!SAFE_ID_REGEX.test(productId) || !Number.isInteger(qty) || qty < 1 || qty > 50) {
          res.status(400).json({ error: 'Data item atau jumlah produk tidak valid.' });
          return;
        }

        const fsDoc = await fetchFirestoreDoc('products', productId);
        let title = '';
        let category = '';
        let unitPrice = 0;
        let active = false;
        let isDemo = true;

        if (fsDoc && fsDoc.fields) {
          title = readRestString(fsDoc, 'title');
          category = readRestString(fsDoc, 'category');
          unitPrice = readRestNumber(fsDoc, 'price');
          active = readRestBool(fsDoc, 'active');
          isDemo = readRestBool(fsDoc, 'isDemo');
        } else {
          const fallback = INITIAL_DEMO_PRODUCTS.find((p) => p.id === productId);
          if (fallback) {
            title = fallback.title;
            category = fallback.category;
            unitPrice = fallback.price;
            active = fallback.active;
            isDemo = fallback.isDemo;
          }
        }

        if (!title || !active) {
          res.status(404).json({ error: `Produk "${productId}" tidak tersedia atau nonaktif.` });
          return;
        }

        const lineTotal = Math.round(unitPrice * qty);
        subtotal += lineTotal;

        verifiedItems.push({
          productId,
          title,
          category,
          unitPrice,
          quantity: qty,
          lineTotal,
          isDemo,
        });
      }

      if (subtotal <= 0) {
        res.status(400).json({ error: 'Total pembayaran harus lebih dari Rp0.' });
        return;
      }

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const orderCode = `NK-${dateStr}-${randHex}`;
      const accessKey = crypto.randomBytes(12).toString('hex');
      const accessKeyHash = sha256Hex(accessKey);
      const totalAmount = subtotal;

      const canonicalPayload = JSON.stringify({
        orderCode,
        subtotal,
        totalAmount,
        items: verifiedItems.map((i) => ({ id: i.productId, q: i.quantity, p: i.unitPrice })),
      });
      const serverSignature = signOrderPayload(canonicalPayload, signingSecret);

      res.json({
        orderCode,
        accessKey,
        accessKeyHash,
        serverSignature,
        items: verifiedItems,
        subtotal,
        totalAmount,
        ephemeralSignature: !IS_SIGNING_SECRET_CONFIGURED,
      });
    } catch {
      res.status(500).json({ error: 'Gagal memproses kalkulasi pesanan di server.' });
    }
  });

  // 2. Verify Server HMAC Signature on Order (Admin Audit Check)
  app.post('/api/orders/verify-signature', requireAdmin, (req: Request, res: Response) => {
    const signingSecret = getActiveSigningSecret();
    if (!signingSecret) {
      res.status(503).json({
        valid: false,
        error: 'ORDER_SIGNING_SECRET belum disetel pada environment produksi.',
      });
      return;
    }

    const { orderCode, subtotal, totalAmount, items, serverSignature } = req.body ?? {};
    if (
      typeof orderCode !== 'string' ||
      typeof serverSignature !== 'string' ||
      !Array.isArray(items)
    ) {
      res.status(400).json({ valid: false });
      return;
    }

    const canonicalPayload = JSON.stringify({
      orderCode,
      subtotal: Number(subtotal),
      totalAmount: Number(totalAmount),
      items: items.map((i: { productId?: string; quantity?: number; unitPrice?: number }) => ({
        id: i.productId,
        q: i.quantity,
        p: i.unitPrice,
      })),
    });
    const expected = signOrderPayload(canonicalPayload, signingSecret);
    const valid =
      expected.length === serverSignature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(serverSignature));

    res.json({ valid, persistentSecret: IS_SIGNING_SECRET_CONFIGURED });
  });

  // 3. Payment Proof Upload (Verified against order_receipts accessKeyHash + magic-bytes)
  app.post('/api/orders/proof', proofUpload.single('proof'), async (req: Request, res: Response) => {
    try {
      const orderCode = typeof req.body?.orderCode === 'string' ? req.body.orderCode.trim() : '';
      const accessKey = typeof req.body?.accessKey === 'string' ? req.body.accessKey.trim() : '';

      if (!SAFE_ID_REGEX.test(orderCode) || accessKey.length < 8) {
        res.status(400).json({ error: 'Kode pesanan atau kunci akses tidak valid.' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'File bukti pembayaran wajib dipilih.' });
        return;
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext) ? ext : '';
      if (!safeExt || !validateMagicBytes(req.file.buffer, safeExt)) {
        res.status(400).json({
          error: 'Isi file bukti pembayaran tidak cocok dengan format gambar/PDF yang diizinkan.',
        });
        return;
      }

      const receiptDoc = await fetchFirestoreDoc('order_receipts', orderCode);
      if (!receiptDoc || !receiptDoc.fields) {
        res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
        return;
      }

      const currentStatus = readRestString(receiptDoc, 'status');
      const existingProofUrl = readRestString(receiptDoc, 'proofUrl');
      if (currentStatus !== 'Menunggu Pembayaran' || existingProofUrl !== '') {
        res.status(409).json({
          error: 'Bukti pembayaran sudah pernah diunggah atau status pesanan tidak lagi menunggu pembayaran.',
        });
        return;
      }

      const storedHash = readRestString(receiptDoc, 'accessKeyHash');
      const incomingHash = sha256Hex(accessKey);
      if (
        !storedHash ||
        storedHash.length !== incomingHash.length ||
        !crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(incomingHash))
      ) {
        res.status(403).json({ error: 'Kunci akses pesanan tidak cocok.' });
        return;
      }

      const safeFilename = `proof_${crypto.randomUUID()}${safeExt}`;
      await putStoredObject({
        localBaseDir: PRIVATE_PROOFS_DIR,
        objectKey: `private/proofs/${safeFilename}`,
        fileName: safeFilename,
        buffer: req.file.buffer,
        contentType: req.file.mimetype,
      });

      res.json({
        proofUrl: `/api/proofs/${safeFilename}`,
        fileName: req.file.originalname,
      });
    } catch {
      res.status(500).json({ error: 'Gagal mengunggah bukti pembayaran.' });
    }
  });

  // 4. Protected Payment Proof Retrieval (Admin Bearer Token OR Exact Order Owner Proof Match)
  app.get('/api/proofs/:filename', async (req: Request, res: Response) => {
    try {
      const filename = String(req.params.filename || '');
      if (!/^proof_[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|pdf)$/.test(filename)) {
        res.status(400).json({ error: 'Nama file bukti tidak valid.' });
        return;
      }

      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

      let authorized = false;

      if (token) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          if (decoded.email_verified && decoded.email === BOOTSTRAP_ADMIN_EMAIL) {
            authorized = true;
          } else if (decoded.email_verified) {
            const adminDoc = await fetchFirestoreDoc('admins', decoded.uid, token);
            if (adminDoc && readRestString(adminDoc, 'uid') === decoded.uid) {
              authorized = true;
            }
          }
        } catch {
          authorized = false;
        }
      }

      if (!authorized) {
        const orderCode = typeof req.query.orderCode === 'string' ? req.query.orderCode.trim() : '';
        const accessKey = typeof req.query.key === 'string' ? req.query.key.trim() : '';
        if (SAFE_ID_REGEX.test(orderCode) && accessKey.length >= 8) {
          const receiptDoc = await fetchFirestoreDoc('order_receipts', orderCode);
          if (receiptDoc && receiptDoc.fields) {
            const storedHash = readRestString(receiptDoc, 'accessKeyHash');
            const storedProofUrl = readRestString(receiptDoc, 'proofUrl');
            const incomingHash = sha256Hex(accessKey);
            if (
              storedProofUrl === `/api/proofs/${filename}` &&
              storedHash.length === incomingHash.length &&
              crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(incomingHash))
            ) {
              authorized = true;
            }
          }
        }
      }

      if (!authorized) {
        res.status(403).json({ error: 'Akses bukti pembayaran ditolak.' });
        return;
      }

      const obj = await getStoredObject({
        localBaseDir: PRIVATE_PROOFS_DIR,
        objectKey: `private/proofs/${filename}`,
        fileName: filename,
      });
      if (!obj) {
        res.status(404).json({ error: 'Bukti pembayaran tidak ditemukan.' });
        return;
      }

      res.setHeader('Content-Type', obj.contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(obj.buffer);
    } catch {
      res.status(500).json({ error: 'Gagal memuat bukti pembayaran.' });
    }
  });

  // 5. Admin Brand / Cover Image Asset Upload
  app.post(
    '/api/admin/upload-asset',
    requireAdmin,
    assetUpload.single('file'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: 'File gambar wajib diunggah.' });
          return;
        }
        const ext = path.extname(req.file.originalname).toLowerCase();
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico'].includes(ext)
          ? ext
          : '';
        if (!safeExt || !validateMagicBytes(req.file.buffer, safeExt)) {
          res.status(400).json({ error: 'Isi file gambar tidak valid atau tidak sesuai format.' });
          return;
        }

        const safeFilename = `asset_${crypto.randomUUID()}${safeExt}`;
        await putStoredObject({
          localBaseDir: PUBLIC_UPLOADS_DIR,
          objectKey: `public/assets/${safeFilename}`,
          fileName: safeFilename,
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
        });

        res.json({
          url: `/api/assets/${safeFilename}`,
          fileName: req.file.originalname,
        });
      } catch {
        res.status(500).json({ error: 'Gagal menyimpan aset gambar.' });
      }
    }
  );

  // 6. Admin Private Digital Product File Upload (Never Publicly Exposed; replaces old file safely)
  app.post(
    '/api/admin/upload-product-file',
    requireAdmin,
    privateProductUpload.single('file'),
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: 'File produk digital wajib diunggah.' });
          return;
        }
        const ext = path.extname(req.file.originalname).toLowerCase();
        const allowedExt = ['.pdf', '.zip', '.xlsx', '.xls', '.docx', '.pptx', '.epub', '.csv'];
        if (!allowedExt.includes(ext) || !validateMagicBytes(req.file.buffer, ext)) {
          res.status(400).json({
            error: 'Isi file produk digital tidak valid atau tidak sesuai dengan ekstensi yang dipilih.',
          });
          return;
        }

        const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : '';
        if (productId && SAFE_ID_REGEX.test(productId) && req.adminBearerToken) {
          const existingMeta = await fetchFirestoreDoc(
            'product_files',
            productId,
            req.adminBearerToken
          );
          const oldFileId = existingMeta ? readRestString(existingMeta, 'fileId') : '';
          if (oldFileId) {
            await deleteStoredObject({
              localBaseDir: PRIVATE_PRODUCTS_DIR,
              objectKey: `private/products/${oldFileId}`,
              fileName: oldFileId,
            });
          }
        }

        const safeFilename = `prodfile_${crypto.randomUUID()}${ext}`;
        await putStoredObject({
          localBaseDir: PRIVATE_PRODUCTS_DIR,
          objectKey: `private/products/${safeFilename}`,
          fileName: safeFilename,
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
        });

        res.json({
          fileId: safeFilename,
          fileName: path.basename(req.file.originalname).slice(0, 200),
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
        });
      } catch {
        res.status(500).json({ error: 'Gagal menyimpan file produk digital privat.' });
      }
    }
  );

  // 7. Admin Delete Private Product File from Storage
  app.delete(
    '/api/admin/product-file/:productId',
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      try {
        const productId = String(req.params.productId || '');
        if (!SAFE_ID_REGEX.test(productId)) {
          res.status(400).json({ error: 'ID produk tidak valid.' });
          return;
        }
        if (req.adminBearerToken) {
          const existingMeta = await fetchFirestoreDoc(
            'product_files',
            productId,
            req.adminBearerToken
          );
          const oldFileId = existingMeta ? readRestString(existingMeta, 'fileId') : '';
          if (oldFileId) {
            await deleteStoredObject({
              localBaseDir: PRIVATE_PRODUCTS_DIR,
              objectKey: `private/products/${oldFileId}`,
              fileName: oldFileId,
            });
          }
        }
        res.json({ deleted: true });
      } catch {
        res.status(500).json({ error: 'Gagal menghapus file privat dari penyimpanan.' });
      }
    }
  );

  // 8. Secure Private Digital Product Download (Requires Admin-Minted Download Token)
  app.get('/api/download/:productId', async (req: Request, res: Response) => {
    try {
      const productId = String(req.params.productId || '');
      const tokenId = typeof req.query.token === 'string' ? req.query.token.trim() : '';

      if (!SAFE_ID_REGEX.test(productId) || !SAFE_ID_REGEX.test(tokenId)) {
        res.status(400).json({ error: 'Parameter unduhan tidak valid.' });
        return;
      }

      const tokenDoc = await fetchFirestoreDoc('download_tokens', tokenId);
      if (!tokenDoc || !tokenDoc.fields) {
        res.status(403).json({ error: 'Token unduhan tidak ditemukan atau tidak sah.' });
        return;
      }

      const enabled = readRestBool(tokenDoc, 'enabled');
      const tokenProductId = readRestString(tokenDoc, 'productId');
      const orderCode = readRestString(tokenDoc, 'orderCode');
      const fileId = readRestString(tokenDoc, 'fileId');
      const rawFileName = readRestString(tokenDoc, 'fileName') || 'produk-nusaklik';
      const safeDownloadName = path.basename(rawFileName).replace(/["\r\n]/g, '_');

      if (!enabled || tokenProductId !== productId || !fileId || !SAFE_ID_REGEX.test(orderCode)) {
        res.status(403).json({ error: 'Hak akses unduhan belum disetujui atau tidak sesuai.' });
        return;
      }

      const createdAtMs = readRestTimestamp(tokenDoc, 'createdAt');
      const expiresAtMs = readRestTimestamp(tokenDoc, 'expiresAt');
      const nowMs = Date.now();
      if (
        createdAtMs === null ||
        nowMs - createdAtMs > DOWNLOAD_TOKEN_TTL_MS ||
        (expiresAtMs !== null && nowMs > expiresAtMs)
      ) {
        res.status(403).json({ error: 'Token unduhan telah kedaluwarsa. Hubungi admin NusaKlik.id.' });
        return;
      }

      const receiptDoc = await fetchFirestoreDoc('order_receipts', orderCode);
      const orderStatus = receiptDoc?.fields ? readRestString(receiptDoc, 'status') : '';
      if (orderStatus !== 'Dibayar' && orderStatus !== 'Selesai') {
        res.status(403).json({
          error: 'Akses unduhan ditolak karena status pesanan tidak aktif atau belum disetujui.',
        });
        return;
      }

      const obj = await getStoredObject({
        localBaseDir: PRIVATE_PRODUCTS_DIR,
        objectKey: `private/products/${fileId}`,
        fileName: fileId,
      });
      if (!obj) {
        res.status(404).json({ error: 'File digital privat tidak ditemukan di penyimpanan server.' });
        return;
      }

      res.setHeader('Content-Type', obj.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(obj.buffer);
    } catch {
      res.status(500).json({ error: 'Gagal memproses unduhan produk.' });
    }
  });

  // 9. Legacy Google Sheets / Apps Script Read-Only Proxy
  app.get('/api/legacy/products', async (_req: Request, res: Response) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(`${LEGACY_APPS_SCRIPT_URL}?action=products`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        res.status(502).json({ error: 'Endpoint Apps Script lama tidak merespons.', products: [] });
        return;
      }

      const raw = await response.json();
      const rows = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.products)
          ? raw.products
          : Array.isArray(raw?.data)
            ? raw.data
            : [];

      const allowedCategories = [
        'E-book',
        'Template Website',
        'Template Bisnis',
        'Panduan Praktis',
        'Produk Edukasi',
        'Cerita Anak',
        'Karya Digital',
      ];

      const sanitized = rows.slice(0, 100).map((row: Record<string, unknown>, idx: number) => {
        const rawTitle = String(
          row.nama || row.title || row.name || row.Nama || `Produk Sheets ${idx + 1}`
        ).trim();
        const rawCategory = String(
          row.kategori || row.category || row.Kategori || 'Karya Digital'
        ).trim();
        const rawPrice = Number(
          String(row.harga ?? row.price ?? row.Harga ?? 0).replace(/[^0-9]/g, '')
        );
        const rawDesc = String(
          row.deskripsi ||
            row.description ||
            row.Deskripsi ||
            'Produk dari katalog Google Sheets NusaKlik.id'
        ).trim();
        const rawCover = String(
          row.cover || row.coverUrl || row.gambar || row.Gambar || ''
        ).trim();
        const rawStatus = String(row.status || row.aktif || 'aktif').toLowerCase();

        const safeId =
          String(row.id || row.ID || `sheets-${idx + 1}`)
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .slice(0, 64) || `sheets-${idx + 1}`;

        return {
          id: safeId,
          title: rawTitle.slice(0, 160),
          category: allowedCategories.includes(rawCategory) ? rawCategory : 'Karya Digital',
          price: Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0,
          shortDescription: rawDesc.slice(0, 300),
          fullDescription: rawDesc.slice(0, 3500),
          coverUrl: rawCover.startsWith('https://') ? rawCover : '',
          active: rawStatus !== 'nonaktif' && rawStatus !== 'false' && rawStatus !== '0',
        };
      });

      res.json({ products: sanitized, count: sanitized.length });
    } catch {
      res.status(200).json({
        products: [],
        count: 0,
        warning: 'Endpoint katalog lama tidak dapat dijangkau saat ini.',
      });
    }
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(400).json({ error: err.message || 'Permintaan tidak valid.' });
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const parsedPort = Number(process.env.PORT);
  const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`NusaKlik.id server running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
