import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { StoreLayout } from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { formatWhatsAppLink } from '../lib/format';

const FAQ_ITEMS = [
  {
    q: 'Produk digital apa saja yang tersedia di NusaKlik.id?',
    a: 'Kami menyediakan e-book panduan praktis, template website, template operasional bisnis, produk edukasi, dan buku cerita anak digital yang dapat dipelajari maupun disesuaikan untuk kebutuhan pribadi dan usaha.',
  },
  {
    q: 'Bagaimana alur pemesanan hingga mendapatkan file produk?',
    a: 'Pilih produk yang diinginkan, masuk ke halaman Checkout, lengkapi Nama Lengkap, Email, dan Nomor WhatsApp, lalu pilih metode pembayaran Transfer Bank atau QRIS. Setelah melakukan pembayaran, unggah bukti transfer di halaman Konfirmasi Pembayaran. Admin kami akan memverifikasi secara manual dan mengaktifkan akses unduhan privat Anda.',
  },
  {
    q: 'Apakah sistem pembayaran terverifikasi otomatis oleh payment gateway?',
    a: 'Tidak. Seluruh pembayaran diverifikasi secara manual oleh tim admin NusaKlik.id untuk menjaga keakuratan transaksi serta menekan biaya operasional agar harga produk tetap terjangkau.',
  },
  {
    q: 'Apakah file produk aman dan tidak dapat diakses sembarang orang?',
    a: 'Ya. File produk digital disimpan di penyimpanan privat server dan tidak pernah ditampilkan di katalog publik. Tautan unduhan hanya dibuat oleh admin setelah status pesanan resmi disetujui menjadi Dibayar atau Selesai.',
  },
  {
    q: 'Mengapa terdapat produk atau ulasan berlabel DEMO?',
    a: 'Label DEMO menandakan item contoh awal sebelum pemilik toko mengunggah file produk asli atau testimoni pelanggan nyata melalui Dashboard Admin. Kami tidak menyediakan tautan unduhan palsu untuk item demo.',
  },
  {
    q: 'Bagaimana jika saya mengalami kendala saat mengunggah bukti pembayaran?',
    a: 'Anda dapat langsung menghubungi admin kami melalui tombol WhatsApp dengan menyertakan kode pesanan unik Anda (contoh: NK-20261124-XXXXXX).',
  },
];

export function FaqPage() {
  const { settings } = useStore();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <StoreLayout>
      <section className="bg-gradient-to-r from-[#244A83] to-[#5686C5] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#E9C477] mb-2">
            Pusat Bantuan
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-white">
            Pertanyaan yang Sering Diajukan (FAQ)
          </h1>
        </div>
      </section>

      <section className="bg-[#F7F8FB] py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={item.q}
                className="bg-white border border-[#DCE8F6] rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-semibold text-[#292D35] hover:text-[#244A83] transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#244A83] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 pt-3 text-sm text-[#292D35]/85 leading-relaxed border-t border-[#DCE8F6]/70">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-10 bg-[#DCE8F6] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="font-editorial text-2xl font-bold text-[#244A83] mb-1">
                Masih Ada Pertanyaan?
              </h2>
              <p className="text-sm text-[#292D35]/80">
                Hubungi admin NusaKlik.id atau periksa status pesanan Anda langsung.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              {settings.whatsappNumber?.trim() ? (
                <a
                  href={formatWhatsAppLink(
                    settings.whatsappNumber,
                    'Halo Admin NusaKlik.id, saya ingin bertanya mengenai produk digital.'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5] transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#E9C477]" />
                  <span>Chat WhatsApp</span>
                </a>
              ) : (
                <Link
                  to="/kontak"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5] transition-colors"
                >
                  <span>Halaman Kontak</span>
                </Link>
              )}
              <Link
                to="/konfirmasi"
                className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-[#244A83] text-sm font-semibold border border-[#5686C5]/30 hover:bg-[#F7F8FB]"
              >
                Cek Pesanan
              </Link>
            </div>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}
