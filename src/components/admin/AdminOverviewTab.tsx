import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  Database,
  Package,
  ShoppingCart,
} from 'lucide-react';
import { seedInitialCatalogToFirestore } from '../../lib/firestoreService';
import { formatRupiah } from '../../lib/format';
import type { OrderReceipt, OrderRecord, Product, StoreSettings } from '../../types/store';

interface SystemStatusInfo {
  nodeEnv: string;
  isProduction: boolean;
  orderSigningSecretConfigured: boolean;
  storageDriver: 'object_storage' | 'local_ephemeral';
  firebaseProjectId: string;
  firestoreDatabaseId: string;
}

interface AdminOverviewTabProps {
  products: Product[];
  orders: OrderRecord[];
  receipts: Record<string, OrderReceipt>;
  settings: StoreSettings;
  getIdToken: () => Promise<string>;
  onRefresh: () => Promise<void>;
  showToast: (msg: string, tone?: 'info' | 'error') => void;
}

export function AdminOverviewTab({
  products,
  orders,
  receipts,
  settings,
  getIdToken,
  onRefresh,
  showToast,
}: AdminOverviewTabProps) {
  const [seeding, setSeeding] = useState(false);
  const [sysStatus, setSysStatus] = useState<SystemStatusInfo | null>(null);
  const [testingStorage, setTestingStorage] = useState(false);
  const [storageDiag, setStorageDiag] = useState<{
    ok: boolean;
    bucketConfigured?: string;
    putOk?: boolean;
    getOk?: boolean;
    publicAccessBlocked?: boolean;
    deleteOk?: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    getIdToken()
      .then((token) =>
        fetch('/api/admin/system-status', {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) setSysStatus(data as SystemStatusInfo);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [getIdToken]);

  const getEffectiveStatus = (ord: OrderRecord) =>
    receipts[ord.orderCode]?.status || ord.status;

  const paidOrders = orders.filter((o) => {
    const st = getEffectiveStatus(o);
    return st === 'Dibayar' || st === 'Selesai';
  });

  const pendingVerification = orders.filter(
    (o) => getEffectiveStatus(o) === 'Menunggu Verifikasi'
  );

  const totalRevenue = paidOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

  const statusCounts = [
    'Menunggu Pembayaran',
    'Menunggu Verifikasi',
    'Dibayar',
    'Selesai',
    'Ditolak',
    'Dibatalkan',
  ].map((status) => ({
    status,
    count: orders.filter((o) => getEffectiveStatus(o) === status).length,
  }));

  const handleSeedInitial = async () => {
    setSeeding(true);
    try {
      const res = await seedInitialCatalogToFirestore();
      await onRefresh();
      showToast(
        `Inisialisasi aman selesai: ${res.createdProducts} produk, ${res.createdReviews} ulasan ditambahkan (data lama tidak ditimpa).`
      );
    } catch {
      showToast('Gagal menginisialisasi data awal ke Firestore.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleTestStorage = async () => {
    setTestingStorage(true);
    setStorageDiag(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/test-storage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const rawText = await res.text();
      let data: {
        ok?: boolean;
        bucketConfigured?: string;
        putOk?: boolean;
        getOk?: boolean;
        publicAccessBlocked?: boolean;
        deleteOk?: boolean;
        error?: string;
      } | null = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        const cleanText = rawText
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 180);
        const fallbackMsg = `Respons non-JSON (HTTP ${res.status})${cleanText ? `: ${cleanText}` : ''}`;
        setStorageDiag({ ok: false, error: fallbackMsg });
        showToast(fallbackMsg, 'error');
        return;
      }

      if (data?.ok) {
        setStorageDiag({ ok: true, ...data });
        showToast('Koneksi Supabase Storage S3 & privasi bucket terverifikasi berhasil.');
      } else {
        const stepSummary = data
          ? `PUT:${data.putOk ? 'OK' : 'GAGAL'} · GET:${data.getOk ? 'OK' : 'GAGAL'} · PRIVAT:${data.publicAccessBlocked ? 'OK' : 'GAGAL'} · DELETE:${data.deleteOk ? 'OK' : 'GAGAL'}`
          : '';
        const errMsg =
          data?.error ||
          `HTTP ${res.status}${stepSummary ? ` (${stepSummary})` : ' — Pengujian koneksi Storage gagal.'}`;
        setStorageDiag({ ok: false, ...data, error: errMsg });
        showToast(errMsg, 'error');
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? `Gagal menjalankan uji koneksi Storage: ${err.message}`
          : 'Gagal menjalankan uji koneksi Storage.';
      setStorageDiag({ ok: false, error: msg });
      showToast(msg, 'error');
    } finally {
      setTestingStorage(false);
    }
  };

  const bankReady = Boolean(settings.bankName?.trim() && settings.bankAccountNumber?.trim());
  const contactReady = Boolean(settings.whatsappNumber?.trim() && settings.contactEmail?.trim());

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#244A83]">
            Ringkasan Dashboard
          </h1>
          <p className="text-sm text-[#292D35]/75 mt-1">
            Pantau katalog produk digital, verifikasi pesanan masuk, dan kesiapan sistem NusaKlik.id.
          </p>
        </div>

        <button
          type="button"
          disabled={seeding}
          onClick={handleSeedInitial}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E9C477] text-[#244A83] text-sm font-bold hover:bg-[#f0d290] transition-colors disabled:opacity-60 shrink-0"
        >
          <Database className="w-4 h-4" />
          <span>{seeding ? 'Memeriksa...' : 'Inisialisasi Data Awal (Aman)'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white border border-[#DCE8F6] rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5686C5]">
              Total Produk
            </span>
            <Package className="w-5 h-5 text-[#244A83]" />
          </div>
          <p className="text-3xl font-bold text-[#244A83] font-mono tabular-nums">
            {products.length}
          </p>
          <p className="text-xs text-[#292D35]/65 mt-1">
            {products.filter((p) => p.active).length} aktif di katalog publik
          </p>
        </div>

        <div className="bg-[#DCE8F6] border border-[#5686C5]/25 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#244A83]">
              Total Pesanan
            </span>
            <ShoppingCart className="w-5 h-5 text-[#244A83]" />
          </div>
          <p className="text-3xl font-bold text-[#244A83] font-mono tabular-nums">
            {orders.length}
          </p>
          <p className="text-xs text-[#244A83]/80 mt-1">
            {paidOrders.length} pesanan telah disetujui
          </p>
        </div>

        <div className="bg-white border border-[#DCE8F6] rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5686C5]">
              Total Penjualan
            </span>
            <Banknote className="w-5 h-5 text-[#9E7722]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#244A83] font-mono tabular-nums">
            {formatRupiah(totalRevenue)}
          </p>
          <p className="text-xs text-[#292D35]/65 mt-1">
            Dari pesanan berstatus Dibayar & Selesai
          </p>
        </div>

        <div className="bg-[#DCE8F6] border border-[#5686C5]/25 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#244A83]">
              Menunggu Verifikasi
            </span>
            <Clock className="w-5 h-5 text-[#244A83]" />
          </div>
          <p className="text-3xl font-bold text-[#244A83] font-mono tabular-nums">
            {pendingVerification.length}
          </p>
          <p className="text-xs text-[#244A83]/80 mt-1">
            Bukti pembayaran perlu ditinjau admin
          </p>
        </div>
      </div>

      {/* Production Readiness Status */}
      <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 space-y-4">
        <h2 className="font-editorial text-xl font-bold text-[#244A83]">
          Status Kesiapan Konfigurasi & Keamanan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#F7F8FB] border border-[#DCE8F6] flex items-start gap-3">
            {sysStatus?.orderSigningSecretConfigured ? (
              <CheckCircle2 className="w-4 h-4 text-[#244A83] shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#9E7722] shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-[#292D35]">ORDER_SIGNING_SECRET (HMAC Pesanan)</p>
              <p className="text-[#292D35]/75 mt-0.5">
                {sysStatus?.orderSigningSecretConfigured
                  ? 'Terkonfigurasi di environment server (konsisten lintas restart).'
                  : 'Belum disetel di Secrets/Environment. Saat ini memakai kunci sementara untuk preview. Wajib diisi minimal 32 karakter sebelum Publish.'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8FB] border border-[#DCE8F6] flex items-start gap-3">
            {sysStatus?.storageDriver === 'object_storage' ? (
              <CheckCircle2 className="w-4 h-4 text-[#244A83] shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#9E7722] shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-bold text-[#292D35]">Penyimpanan File Digital & Bukti</p>
              <p className="text-[#292D35]/75 mt-0.5">
                {sysStatus?.storageDriver === 'object_storage'
                  ? 'Object Storage Persisten aktif (aman lintas redeploy container).'
                  : 'Mode preview aktif (penyimpanan lokal sementara). Untuk penyimpanan persisten gratis tanpa kartu kredit, isi variabel OBJECT_STORAGE_* (mis. Supabase Storage S3 Free Plan 1 GB).'}
              </p>
              {sysStatus?.storageDriver === 'object_storage' && (
                <div className="mt-2 space-y-1.5">
                  <button
                    type="button"
                    disabled={testingStorage}
                    onClick={handleTestStorage}
                    className="px-3 py-1.5 rounded-lg bg-[#244A83] text-white font-semibold hover:bg-[#5686C5] transition-colors disabled:opacity-50"
                  >
                    {testingStorage ? 'Menguji Bucket...' : 'Uji Upload/Get/Hapus Bucket'}
                  </button>
                  {storageDiag && (
                    <p className="text-[11px] text-[#244A83] font-medium">
                      {storageDiag.ok
                        ? `Berhasil (${storageDiag.bucketConfigured}): Upload OK · Unduh OK · URL Publik Ditolak OK · Hapus OK`
                        : `Gagal: ${storageDiag.error || 'Periksa konfigurasi bucket & key.'}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8FB] border border-[#DCE8F6] flex items-start gap-3">
            {bankReady ? (
              <CheckCircle2 className="w-4 h-4 text-[#244A83] shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#9E7722] shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-[#292D35]">Rekening Bank / QRIS Resmi</p>
              <p className="text-[#292D35]/75 mt-0.5">
                {bankReady
                  ? `${settings.bankName} — ${settings.bankAccountNumber}`
                  : 'Belum dikonfigurasi. Lengkapi di tab Pengaturan Toko sebelum transaksi nyata.'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8FB] border border-[#DCE8F6] flex items-start gap-3">
            {contactReady ? (
              <CheckCircle2 className="w-4 h-4 text-[#244A83] shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#9E7722] shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-[#292D35]">WhatsApp & Email Resmi Toko</p>
              <p className="text-[#292D35]/75 mt-0.5">
                {contactReady
                  ? `${settings.whatsappNumber} · ${settings.contactEmail}`
                  : 'Belum dikonfigurasi lengkap di tab Pengaturan Toko.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Status Breakdown */}
      <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 space-y-4">
        <h2 className="font-editorial text-xl font-bold text-[#244A83]">
          Distribusi Status Pesanan
        </h2>
        <div className="space-y-3">
          {statusCounts.map((item) => {
            const pct = orders.length > 0 ? Math.round((item.count / orders.length) * 100) : 0;
            return (
              <div key={item.status} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-[#292D35]">{item.status}</span>
                  <span className="font-mono tabular-nums text-[#244A83]">
                    {item.count} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#DCE8F6]/60 overflow-hidden">
                  <div
                    className="h-full bg-[#244A83] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
