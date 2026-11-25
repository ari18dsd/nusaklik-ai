import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  QrCode,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { StoreLayout } from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { LEGACY_GOOGLE_FORM_URL } from '../data/catalogData';
import { createOrderAndReceipt } from '../lib/firestoreService';
import { formatRupiah } from '../lib/format';
import type { PaymentMethod } from '../types/store';

export function CheckoutPage() {
  const { cart, cartSubtotal, settings, user, clearCart, showToast } = useStore();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transfer Bank');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const hasBankInfo = Boolean(
    settings.bankName?.trim() && settings.bankAccountNumber?.trim()
  );

  if (cart.length === 0) {
    return (
      <StoreLayout>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <ShoppingBag className="w-12 h-12 text-[#5686C5] mx-auto mb-4" />
          <h1 className="font-editorial text-3xl font-bold text-[#244A83] mb-3">
            Belum Ada Produk di Keranjang
          </h1>
          <p className="text-sm text-[#292D35]/75 mb-6">
            Silakan pilih produk digital dari katalog sebelum melanjutkan ke checkout.
          </p>
          <Link
            to="/katalog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5]"
          >
            <span>Lihat Katalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </StoreLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (customerName.trim().length < 2) {
      setErrorMsg('Mohon masukkan nama lengkap minimal 2 karakter.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setErrorMsg('Mohon masukkan alamat email yang valid.');
      return;
    }
    const cleanWa = customerWhatsapp.replace(/[\s()-]/g, '');
    if (!/^[0-9+]{8,20}$/.test(cleanWa)) {
      setErrorMsg('Mohon masukkan nomor WhatsApp yang valid (8–20 digit).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerWhatsapp: cleanWa,
          paymentMethod,
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyiapkan pesanan di server.');
      }

      await createOrderAndReceipt({
        orderCode: data.orderCode,
        buyerUid: user?.uid || 'guest',
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerWhatsapp: cleanWa,
        paymentMethod,
        items: data.items,
        subtotal: data.subtotal,
        totalAmount: data.totalAmount,
        accessKeyHash: data.accessKeyHash,
        serverSignature: data.serverSignature,
      });

      try {
        sessionStorage.setItem(
          `nusaklik_receipt_${data.orderCode}`,
          JSON.stringify({ orderCode: data.orderCode, accessKey: data.accessKey })
        );
      } catch {
        // ignore sessionStorage errors
      }

      clearCart();
      showToast(`Pesanan ${data.orderCode} berhasil dibuat.`);
      navigate(`/konfirmasi/${data.orderCode}?key=${encodeURIComponent(data.accessKey)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses checkout.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StoreLayout>
      <section className="bg-gradient-to-r from-[#244A83] to-[#5686C5] text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#E9C477] mb-1">
            Langkah Pemesanan
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-white">
            Checkout & Metode Pembayaran
          </h1>
        </div>
      </section>

      <section className="bg-[#F7F8FB] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Form */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 sm:p-8 space-y-5">
                <h2 className="font-editorial text-2xl font-bold text-[#244A83]">
                  Data Pembeli
                </h2>

                {errorMsg && (
                  <div className="bg-[#292D35] text-[#E9C477] rounded-xl p-4 flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="checkout-name"
                    className="block text-sm font-semibold text-[#292D35] mb-1.5"
                  >
                    Nama Lengkap
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    maxLength={120}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm text-[#292D35] focus:outline-none focus:border-[#244A83]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="checkout-email"
                      className="block text-sm font-semibold text-[#292D35] mb-1.5"
                    >
                      Alamat Email
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      required
                      maxLength={180}
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm text-[#292D35] focus:outline-none focus:border-[#244A83]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-wa"
                      className="block text-sm font-semibold text-[#292D35] mb-1.5"
                    >
                      Nomor WhatsApp
                    </label>
                    <input
                      id="checkout-wa"
                      type="tel"
                      required
                      maxLength={20}
                      value={customerWhatsapp}
                      onChange={(e) => setCustomerWhatsapp(e.target.value)}
                      placeholder="0812-3456-7890"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm text-[#292D35] focus:outline-none focus:border-[#244A83]"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 sm:p-8 space-y-5">
                <h2 className="font-editorial text-2xl font-bold text-[#244A83]">
                  Metode Pembayaran
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Transfer Bank')}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                      paymentMethod === 'Transfer Bank'
                        ? 'border-[#244A83] bg-[#DCE8F6]/60 text-[#244A83]'
                        : 'border-[#DCE8F6] bg-white text-[#292D35] hover:border-[#5686C5]'
                    }`}
                  >
                    <Building2 className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">Transfer Bank</p>
                      <p className="text-xs opacity-75">Verifikasi manual admin</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                      paymentMethod === 'QRIS'
                        ? 'border-[#244A83] bg-[#DCE8F6]/60 text-[#244A83]'
                        : 'border-[#DCE8F6] bg-white text-[#292D35] hover:border-[#5686C5]'
                    }`}
                  >
                    <QrCode className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">QRIS</p>
                      <p className="text-xs opacity-75">Verifikasi manual admin</p>
                    </div>
                  </button>
                </div>

                {/* Live Store Payment Info */}
                <div className="bg-[#DCE8F6]/45 border border-[#DCE8F6] rounded-xl p-5 space-y-3 text-sm">
                  {paymentMethod === 'Transfer Bank' ? (
                    hasBankInfo ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#5686C5]">
                          Rekening Tujuan
                        </p>
                        <p className="font-bold text-[#244A83] text-base">
                          {settings.bankName}
                        </p>
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
                      <div className="bg-white border border-[#DCE8F6] rounded-lg p-4 text-xs text-[#292D35]/80">
                        Nomor rekening bank resmi belum dikonfigurasi oleh admin di Pengaturan Toko. Silakan lengkapi di Dashboard Admin sebelum melakukan transaksi riil.
                      </div>
                    )
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#5686C5]">
                        Kode QRIS NusaKlik.id
                      </p>
                      {settings.qrisUrl ? (
                        <img
                          src={settings.qrisUrl}
                          alt="QRIS Pembayaran NusaKlik.id"
                          referrerPolicy="no-referrer"
                          className="w-52 h-52 object-contain bg-white p-2 rounded-lg border border-[#DCE8F6]"
                        />
                      ) : (
                        <div className="bg-white border border-[#DCE8F6] rounded-lg p-4 text-xs text-[#292D35]/80">
                          Gambar QRIS belum diunggah oleh admin di Pengaturan Toko.
                        </div>
                      )}
                    </div>
                  )}

                  {settings.paymentInstructions && (
                    <p className="text-xs text-[#292D35]/80 leading-relaxed pt-2 border-t border-[#5686C5]/20">
                      {settings.paymentInstructions}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Summary */}
            <div className="lg:col-span-5 bg-white border border-[#DCE8F6] rounded-2xl p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
              <h2 className="font-editorial text-2xl font-bold text-[#244A83]">
                Ringkasan Pesanan
              </h2>

              <div className="divide-y divide-[#DCE8F6]">
                {cart.map((item) => (
                  <div key={item.productId} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#292D35]">{item.title}</p>
                      <p className="text-xs text-[#292D35]/65 tabular-nums">
                        {item.quantity} × {formatRupiah(item.price)}
                        {item.isDemo ? ' · DEMO' : ''}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[#244A83] font-mono tabular-nums shrink-0">
                      {formatRupiah(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#DCE8F6] pt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#292D35]/75">Subtotal</span>
                  <span className="font-semibold font-mono tabular-nums">
                    {formatRupiah(cartSubtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#DCE8F6]">
                  <span className="font-bold text-[#292D35]">Total Pembayaran</span>
                  <span className="text-2xl font-bold text-[#244A83] font-mono tabular-nums">
                    {formatRupiah(cartSubtotal)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-lg bg-[#244A83] text-white text-sm font-bold hover:bg-[#5686C5] transition-colors disabled:opacity-60"
              >
                {submitting ? 'Membuat Pesanan...' : 'Buat Pesanan & Lanjut Pembayaran'}
              </button>

              <div className="bg-[#DCE8F6]/45 rounded-lg p-3.5 space-y-2 text-xs text-[#292D35]/80">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#244A83] shrink-0 mt-0.5" />
                  <span>
                    ID pesanan unik dibuat otomatis dan total harga dihitung ulang di server. Verifikasi dilakukan manual oleh admin (bukan payment gateway otomatis).
                  </span>
                </div>
                <p className="text-[11px] text-[#292D35]/65 pl-6">
                  Butuh formulir cadangan?{' '}
                  <a
                    href={LEGACY_GOOGLE_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#244A83] underline hover:text-[#5686C5]"
                  >
                    Buka Google Form Pemesanan Lama
                  </a>
                </p>
              </div>
            </div>
          </form>
        </div>
      </section>
    </StoreLayout>
  );
}
