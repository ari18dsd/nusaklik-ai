import { useState } from 'react';
import { Eye, ShieldCheck, X } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { updateOrderStatusAdmin } from '../../lib/firestoreService';
import { formatRupiah } from '../../lib/format';
import type {
  OrderReceipt,
  OrderRecord,
  OrderStatus,
  ProductFileMeta,
} from '../../types/store';

interface AdminOrdersTabProps {
  orders: OrderRecord[];
  receipts: Record<string, OrderReceipt>;
  productFiles: Record<string, ProductFileMeta>;
  getIdToken: () => Promise<string>;
  onRefresh: () => Promise<void>;
  showToast: (msg: string, tone?: 'info' | 'error') => void;
}

const ORDER_STATUSES: OrderStatus[] = [
  'Menunggu Pembayaran',
  'Menunggu Verifikasi',
  'Dibayar',
  'Ditolak',
  'Selesai',
  'Dibatalkan',
];

export function AdminOrdersTab({
  orders,
  receipts,
  productFiles,
  getIdToken,
  onRefresh,
  showToast,
}: AdminOrdersTabProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus>('Menunggu Verifikasi');
  const [adminNote, setAdminNote] = useState('');
  const [proofBlobUrl, setProofBlobUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState('');
  const [signatureValid, setSignatureValid] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const closeOrder = () => {
    if (proofBlobUrl) {
      URL.revokeObjectURL(proofBlobUrl);
    }
    setProofBlobUrl(null);
    setProofError('');
    setProofLoading(false);
    setSelectedOrder(null);
  };

  const openOrder = async (ord: OrderRecord) => {
    if (proofBlobUrl) {
      URL.revokeObjectURL(proofBlobUrl);
    }
    setSelectedOrder(ord);
    const receipt = receipts[ord.orderCode];
    setNextStatus(receipt?.status || ord.status);
    setAdminNote(receipt?.adminNote || ord.adminNote || '');
    setProofBlobUrl(null);
    setProofError('');
    setProofLoading(Boolean(receipt?.proofUrl));
    setSignatureValid(null);

    try {
      const token = await getIdToken();

      // Verify server HMAC signature on price integrity
      const sigRes = await fetch('/api/orders/verify-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderCode: ord.orderCode,
          subtotal: ord.subtotal,
          totalAmount: ord.totalAmount,
          items: ord.items,
          serverSignature: ord.serverSignature,
        }),
      });
      if (sigRes.ok) {
        const sigText = await sigRes.text();
        try {
          const sigData = JSON.parse(sigText);
          setSignatureValid(Boolean(sigData.valid));
        } catch {
          // ignore non-JSON signature response
        }
      }

      // Fetch private proof image securely with Bearer token
      if (receipt?.proofUrl) {
        const proofRes = await fetch(receipt.proofUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (proofRes.ok) {
          const blob = await proofRes.blob();
          setProofBlobUrl(URL.createObjectURL(blob));
        } else {
          setProofError(`Bukti pembayaran gagal dimuat (HTTP ${proofRes.status}).`);
        }
      }
    } catch {
      if (receipt?.proofUrl) {
        setProofError('Gagal memuat pratinjau bukti pembayaran.');
      }
    } finally {
      setProofLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      await updateOrderStatusAdmin({
        order: selectedOrder,
        receipt: receipts[selectedOrder.orderCode],
        newStatus: nextStatus,
        adminNote,
        productFiles,
      });
      await onRefresh();
      setSelectedOrder(null);
      showToast(`Status pesanan ${selectedOrder.orderCode} diperbarui menjadi "${nextStatus}".`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal memperbarui status pesanan.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#244A83]">
          Kelola & Verifikasi Pesanan
        </h1>
        <p className="text-sm text-[#292D35]/75 mt-1">
          Tinjau informasi pembeli, periksa bukti pembayaran privat, dan setujui pesanan secara manual untuk membuka tautan unduhan digital.
        </p>
      </div>

      {/* Order Verification Detail Drawer / Card */}
      {selectedOrder && (
        <div className="bg-white border border-[#244A83]/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-start justify-between border-b border-[#DCE8F6] pb-4">
            <div>
              <p className="text-xs font-semibold uppercase text-[#5686C5]">Detail Pesanan</p>
              <h2 className="text-xl font-bold font-mono text-[#244A83]">
                {selectedOrder.orderCode}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeOrder}
              className="p-2 rounded-lg text-[#292D35]/70 hover:bg-[#DCE8F6]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <h3 className="font-bold text-[#244A83]">Data Pembeli</h3>
              <p>
                Nama: <strong>{selectedOrder.customerName}</strong>
              </p>
              <p>Email: {selectedOrder.customerEmail}</p>
              <p>WhatsApp: {selectedOrder.customerWhatsapp}</p>
              <p>Metode: {selectedOrder.paymentMethod}</p>

              {signatureValid !== null && (
                <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-[#244A83]">
                  <ShieldCheck className="w-4 h-4 text-[#E9C477]" />
                  <span>
                    {signatureValid
                      ? 'Integritas harga server terverifikasi sah'
                      : 'Peringatan: Tanda tangan kalkulasi harga tidak cocok'}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-[#244A83]">Item & Total</h3>
              {selectedOrder.items.map((item) => (
                <div key={item.productId} className="flex justify-between">
                  <span>
                    {item.title} (×{item.quantity})
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatRupiah(item.lineTotal)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-[#DCE8F6] flex justify-between font-bold text-[#244A83]">
                <span>Total Pembayaran</span>
                <span className="font-mono tabular-nums">
                  {formatRupiah(selectedOrder.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Proof Viewer */}
          <div className="bg-[#F7F8FB] border border-[#DCE8F6] rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-[#244A83]">Bukti Pembayaran</p>
            {proofBlobUrl ? (
              receipts[selectedOrder.orderCode]?.proofUrl?.toLowerCase().endsWith('.pdf') ? (
                <a
                  href={proofBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#244A83] text-white text-xs font-semibold hover:bg-[#5686C5]"
                >
                  Buka Bukti Pembayaran (PDF)
                </a>
              ) : (
                <img
                  src={proofBlobUrl}
                  alt="Bukti transfer pelanggan"
                  className="max-h-72 rounded-lg border border-[#DCE8F6] object-contain"
                />
              )
            ) : proofLoading ? (
              <p className="text-xs text-[#292D35]/70">Memuat pratinjau bukti pembayaran...</p>
            ) : proofError ? (
              <p className="text-xs text-[#292D35] font-medium">{proofError}</p>
            ) : (
              <p className="text-xs text-[#292D35]/70">
                Pembeli belum mengunggah bukti pembayaran melalui halaman konfirmasi.
              </p>
            )}
          </div>

          {/* Status Update Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#DCE8F6]">
            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Ubah Status Pesanan
              </label>
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
              >
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Catatan Admin untuk Pembeli (opsional)
              </label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Contoh: Pembayaran diterima, silakan unduh file Anda."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeOrder}
              className="px-5 py-2.5 rounded-lg border border-[#DCE8F6] text-sm font-semibold"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveStatus}
              className="px-6 py-2.5 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5] disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Status & Terbitkan Akses'}
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white border border-[#DCE8F6] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#DCE8F6]/60 text-xs uppercase text-[#244A83]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Kode Pesanan</th>
                <th className="px-5 py-3.5 font-semibold">Pembeli</th>
                <th className="px-5 py-3.5 font-semibold">Total</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE8F6]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[#292D35]/70">
                    Belum ada pesanan masuk.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const effStatus = receipts[ord.orderCode]?.status || ord.status;
                  return (
                    <tr key={ord.orderCode} className="hover:bg-[#F7F8FB]">
                      <td className="px-5 py-4 font-mono font-bold text-[#244A83]">
                        {ord.orderCode}
                        <span className="block text-[11px] font-sans font-normal text-[#292D35]/60">
                          {ord.paymentMethod}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#292D35]">{ord.customerName}</p>
                        <p className="text-xs text-[#292D35]/65">{ord.customerWhatsapp}</p>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-[#244A83] tabular-nums">
                        {formatRupiah(ord.totalAmount)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={effStatus} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openOrder(ord)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#244A83] text-white text-xs font-semibold hover:bg-[#5686C5]"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#E9C477]" />
                          <span>Periksa & Verifikasi</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
