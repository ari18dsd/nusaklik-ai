import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Download,
  FileCheck2,
  Lock,
  MessageCircle,
  Printer,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { StoreLayout } from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { fetchOrderReceipt, submitOrderProofToReceipt } from '../lib/firestoreService';
import { formatRupiah, formatWhatsAppLink } from '../lib/format';
import type { OrderReceipt } from '../types/store';

export function ConfirmationPage() {
  const { orderCode: paramCode } = useParams<{ orderCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings, showToast } = useStore();

  const [lookupCode, setLookupCode] = useState(paramCode || '');
  const [accessKey, setAccessKey] = useState(searchParams.get('key') || '');
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const hasWa = Boolean(settings.whatsappNumber && settings.whatsappNumber.trim());
  const hasBankInfo = Boolean(settings.bankName?.trim() && settings.bankAccountNumber?.trim());

  const loadReceipt = useCallback(async (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await fetchOrderReceipt(clean);
      if (!data) {
        setReceipt(null);
        setNotFound(true);
      } else {
        setReceipt(data);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const urlKey = searchParams.get('key') || '';

  useEffect(() => {
    if (paramCode) {
      setLookupCode(paramCode);
      setUploadError('');
      setSelectedFile(null);
      if (urlKey) {
        setAccessKey(urlKey);
      } else {
        try {
          const saved = sessionStorage.getItem(`nusaklik_receipt_${paramCode}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.accessKey) setAccessKey(parsed.accessKey);
          }
        } catch {
          // ignore
        }
      }
      loadReceipt(paramCode);
    }
  }, [paramCode, urlKey, loadReceipt]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = lookupCode.trim();
    if (!cleanCode) return;
    const cleanKey = accessKey.trim();
    const targetUrl = `/konfirmasi/${encodeURIComponent(cleanCode)}${
      cleanKey ? `?key=${encodeURIComponent(cleanKey)}` : ''
    }`;
    if (cleanCode === paramCode && cleanKey === urlKey) {
      loadReceipt(cleanCode);
    } else {
      navigate(targetUrl);
    }
  };

  const handleProofUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt || !selectedFile) return;
    setUploadError('');

    if (!accessKey.trim()) {
      setUploadError(
        'Kunci akses pesanan diperlukan untuk mengunggah bukti. Gunakan tautan konfirmasi yang Anda terima saat checkout.'
      );
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('orderCode', receipt.orderCode);
      formData.append('accessKey', accessKey.trim());
      formData.append('proof', selectedFile);

      const res = await fetch('/api/orders/proof', {
        method: 'POST',
        body: formData,
      });
      const rawText = await res.text();
      let data: { error?: string; proofUrl?: string } = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Respons server tidak valid (HTTP ${res.status}).`);
      }
      if (!res.ok || !data.proofUrl) {
        throw new Error(data.error || 'Gagal mengunggah bukti pembayaran.');
      }

      await submitOrderProofToReceipt(receipt.orderCode, data.proofUrl);
      setSelectedFile(null);
      await loadReceipt(receipt.orderCode);
      showToast('Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah bukti pembayaran.';
      setUploadError(msg);
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const isApproved = receipt?.status === 'Dibayar' || receipt?.status === 'Selesai';
  const proofPreviewSrc =
    receipt?.proofUrl && accessKey
      ? `${receipt.proofUrl}?orderCode=${encodeURIComponent(
          receipt.orderCode
        )}&key=${encodeURIComponent(accessKey)}`
      : '';

  return (
    <StoreLayout>
      <section className="bg-gradient-to-r from-[#244A83] to-[#5686C5] text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#E9C477] mb-1">
            Status & Verifikasi Pesanan
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-white">
            Konfirmasi Pembayaran
          </h1>
        </div>
      </section>

      <section className="bg-[#F7F8FB] py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Lookup Box */}
          <form
            onSubmit={handleLookupSubmit}
            className="bg-white border border-[#DCE8F6] rounded-2xl p-6 space-y-4 print:hidden"
          >
            <h2 className="text-base font-bold text-[#244A83]">Cek Status Pesanan Anda</h2>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder="Kode Pesanan (contoh: NK-20261124-...)"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm font-mono focus:outline-none focus:border-[#244A83]"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Kunci Akses Pesanan"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm font-mono focus:outline-none focus:border-[#244A83]"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5] transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Cari</span>
                </button>
              </div>
            </div>
          </form>

          {loading && (
            <div className="bg-white border border-[#DCE8F6] rounded-2xl p-10 text-center text-sm text-[#244A83]">
              Memuat detail pesanan...
            </div>
          )}

          {notFound && !loading && (
            <div className="bg-white border border-[#DCE8F6] rounded-2xl p-10 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-[#5686C5] mx-auto" />
              <h2 className="font-editorial text-2xl font-bold text-[#244A83]">
                Pesanan Tidak Ditemukan
              </h2>
              <p className="text-sm text-[#292D35]/75">
                Periksa kembali kode pesanan Anda, atau hubungi admin NusaKlik.id jika memerlukan bantuan.
              </p>
            </div>
          )}

          {receipt && !loading && (
            <div className="space-y-6">
              {/* Order Summary Card */}
              <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#DCE8F6]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#5686C5]">
                      Kode Pesanan Unik
                    </p>
                    <p className="text-2xl font-bold font-mono text-[#244A83] tabular-nums mt-0.5 break-all">
                      {receipt.orderCode}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={receipt.status} />
                    <button
                      type="button"
                      onClick={() => loadReceipt(receipt.orderCode)}
                      title="Muat ulang status pesanan"
                      className="p-2 rounded-lg border border-[#DCE8F6] text-[#244A83] hover:bg-[#DCE8F6]/50 print:hidden"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      title="Cetak nota pesanan"
                      className="p-2 rounded-lg border border-[#DCE8F6] text-[#244A83] hover:bg-[#DCE8F6]/50 print:hidden"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Items */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[#244A83] uppercase tracking-wider">
                      Rincian Produk
                    </h3>
                    <div className="divide-y divide-[#DCE8F6] border border-[#DCE8F6] rounded-xl px-4 bg-[#F7F8FB]">
                      {receipt.itemSummaries.map((item) => (
                        <div
                          key={item.productId}
                          className="py-3 flex items-center justify-between gap-3 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-[#292D35]">{item.title}</p>
                            <p className="text-xs text-[#292D35]/65 tabular-nums">
                              {item.quantity} × {formatRupiah(item.unitPrice)}
                              {item.isDemo ? ' · DEMO' : ''}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-[#244A83] tabular-nums shrink-0">
                            {formatRupiah(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-bold text-[#292D35]">Total Tagihan</span>
                      <span className="text-2xl font-bold font-mono text-[#244A83] tabular-nums">
                        {formatRupiah(receipt.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Instructions */}
                  <div className="bg-[#DCE8F6]/45 border border-[#DCE8F6] rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-bold text-[#244A83] uppercase tracking-wider">
                      Tujuan Pembayaran ({receipt.paymentMethod})
                    </h3>
                    {receipt.paymentMethod === 'Transfer Bank' ? (
                      hasBankInfo ? (
                        <div className="text-sm space-y-1">
                          <p className="font-bold text-[#244A83]">{settings.bankName}</p>
                          <p className="font-mono text-lg font-bold text-[#292D35] tabular-nums break-all">
                            {settings.bankAccountNumber}
                          </p>
                          {settings.bankAccountHolder && (
                            <p className="text-xs text-[#292D35]/80">
                              Atas Nama: <strong>{settings.bankAccountHolder}</strong>
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-[#292D35]/80">
                          Nomor rekening bank resmi belum dikonfigurasi oleh admin.
                        </p>
                      )
                    ) : settings.qrisUrl ? (
                      <img
                        src={settings.qrisUrl}
                        alt="QRIS NusaKlik.id"
                        referrerPolicy="no-referrer"
                        className="w-44 h-44 object-contain bg-white p-2 rounded-lg border border-[#DCE8F6]"
                      />
                    ) : (
                      <p className="text-xs text-[#292D35]/80">
                        Gambar QRIS belum tersedia. Hubungi admin untuk informasi pembayaran.
                      </p>
                    )}

                    {settings.paymentInstructions && (
                      <p className="text-xs text-[#292D35]/80 leading-relaxed pt-2 border-t border-[#5686C5]/20">
                        {settings.paymentInstructions}
                      </p>
                    )}

                    {hasWa && (
                      <a
                        href={formatWhatsAppLink(
                          settings.whatsappNumber,
                          `Halo Admin NusaKlik.id, saya ingin konfirmasi pembayaran untuk pesanan ${receipt.orderCode} sebesar ${formatRupiah(
                            receipt.totalAmount
                          )}.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#244A83] text-white text-xs font-semibold hover:bg-[#5686C5] transition-colors print:hidden"
                      >
                        <MessageCircle className="w-4 h-4 text-[#E9C477]" />
                        <span>Konfirmasi via WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>

                {receipt.adminNote && (
                  <div className="bg-[#DCE8F6]/50 border border-[#5686C5]/30 rounded-xl p-4 text-sm text-[#292D35]">
                    <strong className="text-[#244A83]">Catatan Admin:</strong> {receipt.adminNote}
                  </div>
                )}
              </div>

              {/* Upload Proof Form */}
              {receipt.status === 'Menunggu Pembayaran' && !receipt.proofUrl && (
                <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 sm:p-8 space-y-4 print:hidden">
                  <div className="flex items-center gap-2.5">
                    <FileCheck2 className="w-5 h-5 text-[#244A83]" />
                    <h2 className="font-editorial text-2xl font-bold text-[#244A83]">
                      Unggah Bukti Pembayaran
                    </h2>
                  </div>

                  <p className="text-sm text-[#292D35]/75">
                    Unggah tangkapan layar atau foto struk transfer (JPG, PNG, WebP, atau PDF maks. 5 MB). Bukti disimpan secara privat dan hanya dapat dilihat oleh admin untuk verifikasi manual.
                  </p>

                  {uploadError && (
                    <div className="bg-[#292D35] text-[#E9C477] rounded-lg p-3.5 text-xs">
                      {uploadError}
                    </div>
                  )}

                  <form onSubmit={handleProofUpload} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="flex-1 text-sm text-[#292D35] file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#DCE8F6] file:text-[#244A83] hover:file:bg-[#5686C5]/30"
                    />
                    <button
                      type="submit"
                      disabled={uploading || !selectedFile}
                      className="px-6 py-2.5 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploading ? 'Mengunggah...' : 'Kirim Bukti'}</span>
                    </button>
                  </form>
                </div>
              )}

              {receipt.proofUrl && (
                <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 space-y-3">
                  <p className="text-xs font-bold text-[#244A83] uppercase tracking-wider">
                    Status Bukti Pembayaran
                  </p>
                  <p className="text-sm text-[#292D35]/80">
                    Bukti pembayaran telah diterima sistem dan tersimpan privat untuk ditinjau admin.
                  </p>
                  {proofPreviewSrc && (
                    receipt.proofUrl.toLowerCase().endsWith('.pdf') ? (
                      <a
                        href={proofPreviewSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DCE8F6] text-[#244A83] text-xs font-semibold hover:bg-[#5686C5]/30"
                      >
                        Buka File Bukti Pembayaran (PDF)
                      </a>
                    ) : (
                      <img
                        src={proofPreviewSrc}
                        alt="Bukti pembayaran"
                        className="max-h-64 rounded-lg border border-[#DCE8F6] object-contain"
                      />
                    )
                  )}
                </div>
              )}

              {/* Digital Product Download Area */}
              <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2.5">
                  {isApproved ? (
                    <Download className="w-5 h-5 text-[#244A83]" />
                  ) : (
                    <Lock className="w-5 h-5 text-[#5686C5]" />
                  )}
                  <h2 className="font-editorial text-2xl font-bold text-[#244A83]">
                    Akses Produk Digital Privat
                  </h2>
                </div>

                {!isApproved ? (
                  <p className="text-sm text-[#292D35]/75 leading-relaxed">
                    Akses unduhan produk digital terkunci hingga pembayaran Anda berstatus{' '}
                    <strong>Dibayar</strong> atau <strong>Selesai</strong> setelah diverifikasi secara manual oleh admin NusaKlik.id.
                  </p>
                ) : receipt.downloadGrants && receipt.downloadGrants.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[#292D35]/80">
                      Pembayaran Anda telah disetujui. Silakan unduh file produk digital Anda melalui tautan aman berikut:
                    </p>
                    {receipt.downloadGrants.map((grant) => (
                      <div
                        key={grant.tokenId}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#DCE8F6]/50 border border-[#DCE8F6]"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#244A83]">
                            {grant.productTitle}
                          </p>
                          <p className="text-xs text-[#292D35]/70 font-mono">{grant.fileName}</p>
                        </div>
                        <a
                          href={`/api/download/${encodeURIComponent(
                            grant.productId
                          )}?token=${encodeURIComponent(grant.tokenId)}`}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#244A83] text-white text-xs font-bold hover:bg-[#5686C5] transition-colors shrink-0"
                        >
                          <Download className="w-4 h-4 text-[#E9C477]" />
                          <span>Unduh File Privat</span>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#DCE8F6]/50 border border-[#DCE8F6] rounded-xl p-4 text-sm text-[#292D35]/85">
                    Pembayaran telah disetujui, namun produk pada pesanan ini bertanda <strong>DEMO</strong> atau belum memiliki file digital privat yang diunggah oleh admin.
                  </div>
                )}

                <div className="pt-2 print:hidden">
                  <Link
                    to="/katalog"
                    className="text-xs font-semibold text-[#244A83] hover:text-[#5686C5] transition-colors"
                  >
                    ← Kembali ke Katalog Produk
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </StoreLayout>
  );
}
