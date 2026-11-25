import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  ChevronDown,
  FileText,
  GraduationCap,
  Layout,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { StoreLayout } from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { INITIAL_DEMO_PRODUCTS, INITIAL_DEMO_REVIEWS } from '../data/catalogData';
import { fetchActiveProducts, fetchVisibleReviews } from '../lib/firestoreService';
import type { CustomerReview, Product } from '../types/store';

const CATEGORY_CARDS = [
  { name: 'E-book', desc: 'Bacaan praktis & mendalam untuk keahlian baru.', icon: BookOpen },
  { name: 'Template Website', desc: 'Rancangan halaman modern siap pakai.', icon: Layout },
  { name: 'Template Bisnis', desc: 'Dokumen operasional & keuangan usaha.', icon: Briefcase },
  { name: 'Panduan Praktis', desc: 'Langkah terstruktur untuk eksekusi cepat.', icon: FileText },
  { name: 'Produk Edukasi', desc: 'Materi belajar sistematis bagi pelajar & tim.', icon: GraduationCap },
  { name: 'Cerita Anak', desc: 'Kisah bergambar sarat nilai & imajinasi.', icon: Sparkles },
];

const SHORT_FAQS = [
  {
    q: 'Bagaimana cara membeli produk digital di NusaKlik.id?',
    a: 'Pilih produk di katalog, tambahkan ke keranjang atau klik Beli Sekarang, isi data pembeli pada halaman Checkout, lalu lakukan pembayaran melalui Transfer Bank atau QRIS dan unggah bukti pembayaran.',
  },
  {
    q: 'Apakah pembayaran diverifikasi secara otomatis?',
    a: 'Saat ini seluruh pembayaran diverifikasi secara manual oleh admin NusaKlik.id agar transaksi tetap akurat dan aman. Setelah status pesanan berubah menjadi Dibayar, tautan unduhan privat akan aktif.',
  },
  {
    q: 'Apa arti label DEMO pada beberapa produk?',
    a: 'Label DEMO menandakan produk contoh awal sebelum file produk digital asli diunggah oleh pemilik toko melalui Ruang Admin. Tidak ada file unduhan palsu yang diberikan.',
  },
];

export function HomePage() {
  const { settings } = useStore();
  const [products, setProducts] = useState<Product[]>(INITIAL_DEMO_PRODUCTS);
  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_DEMO_REVIEWS);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [heroImgError, setHeroImgError] = useState(false);

  useEffect(() => {
    fetchActiveProducts()
      .then((res) => setProducts(res.products))
      .catch(() => {});
    fetchVisibleReviews()
      .then((res) => setReviews(res.reviews))
      .catch(() => {});
  }, []);

  const featuredProducts = products.filter((p) => p.featured).slice(0, 3);
  const newestProducts = products.slice(0, 4);

  return (
    <StoreLayout>
      {/* 1. Hero Banner: Royal Blue to Soft Blue gradient */}
      <section className="bg-gradient-to-br from-[#244A83] via-[#2F5B9B] to-[#5686C5] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-[#E9C477]">
                {settings.storeName || 'NusaKlik.id'} · Koleksi Produk Digital
              </p>

              <h1
                className="font-editorial text-4xl sm:text-5xl lg:text-[54px] font-bold leading-[1.12] text-white"
                style={{ textWrap: 'balance' }}
              >
                {settings.heroTitle || 'Temukan Ide, Wujudkan Karya.'}
              </h1>

              <p className="text-base sm:text-lg text-[#DCE8F6] leading-relaxed max-w-xl">
                {settings.heroDescription ||
                  'Temukan e-book, template, panduan, dan berbagai produk digital untuk mendukung ide serta kreativitasmu.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/katalog"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#E9C477] text-[#244A83] text-sm font-bold hover:bg-[#f1d28e] transition-colors shadow-sm whitespace-nowrap"
                >
                  <span>Jelajahi Produk</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/katalog"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-white/40 text-white text-sm font-semibold hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  <span>Lihat Katalog</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="w-full rounded-2xl overflow-hidden border border-white/20 shadow-xl bg-[#1D3B69] min-h-[280px] lg:min-h-[380px]">
                {settings.bannerUrl && !heroImgError ? (
                  <img
                    src={settings.bannerUrl}
                    alt="Koleksi karya digital NusaKlik.id"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center bg-[#1D3B69]">
                    <BookOpen className="w-12 h-12 text-[#E9C477] mb-3" />
                    <p className="font-editorial text-2xl font-bold text-white">
                      NusaKlik.id
                    </p>
                    <p className="text-sm text-[#DCE8F6] mt-1">
                      Temukan Ide, Wujudkan Karya.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Kategori Produk (Ice Blue tinted surface) */}
      <section className="bg-[#DCE8F6]/55 border-y border-[#DCE8F6] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[#5686C5] mb-2">
                Kategori Pilihan
              </p>
              <h2 className="font-editorial text-3xl font-bold text-[#244A83]">
                Eksplorasi Sesuai Kebutuhanmu
              </h2>
            </div>
            <Link
              to="/katalog"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#244A83] hover:text-[#5686C5] transition-colors whitespace-nowrap"
            >
              <span>Semua Kategori</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORY_CARDS.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={`/katalog?kategori=${encodeURIComponent(cat.name)}`}
                  className="bg-white border border-[#DCE8F6] rounded-xl p-6 flex items-start gap-4 hover:border-[#5686C5] hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-11 h-11 rounded-lg bg-[#DCE8F6] text-[#244A83] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#292D35] mb-1">
                      {cat.name}
                    </h3>
                    <p className="text-sm text-[#292D35]/70 leading-relaxed">{cat.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Produk Unggulan & Produk Terbaru (Cloud White) */}
      <section className="bg-[#F7F8FB] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-[#9E7722] mb-2">
                  Rekomendasi Utama
                </p>
                <h2 className="font-editorial text-3xl font-bold text-[#244A83]">
                  Produk Unggulan
                </h2>
              </div>
              <Link
                to="/katalog?unggulan=true"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#244A83] hover:text-[#5686C5] transition-colors"
              >
                <span>Lihat Produk Unggulan</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(featuredProducts.length > 0 ? featuredProducts : products.slice(0, 3)).map(
                (product) => (
                  <ProductCard key={product.id} product={product} />
                )
              )}
            </div>
          </div>

          <div className="pt-12 border-t border-[#DCE8F6]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-[#5686C5] mb-2">
                  Katalog Terkini
                </p>
                <h2 className="font-editorial text-3xl font-bold text-[#244A83]">
                  Produk Terbaru
                </h2>
              </div>
              <Link
                to="/katalog"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#244A83] hover:text-[#5686C5] transition-colors"
              >
                <span>Buka Katalog Lengkap</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newestProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Keunggulan NusaKlik (Ice Blue surface) */}
      <section className="bg-[#DCE8F6] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold tracking-wider uppercase text-[#244A83] mb-2">
              Mengapa NusaKlik.id
            </p>
            <h2 className="font-editorial text-3xl font-bold text-[#244A83]">
              Dirancang untuk Kemudahan dan Kualitas Nyata
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-[#5686C5]/25">
              <BookOpen className="w-6 h-6 text-[#244A83] mb-4" />
              <h3 className="text-lg font-semibold text-[#292D35] mb-2">
                Materi Runtut & Praktis
              </h3>
              <p className="text-sm text-[#292D35]/75 leading-relaxed">
                Setiap e-book dan template disusun agar mudah dipahami pemula sekaligus langsung siap dipakai pada pekerjaan nyata.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-[#5686C5]/25">
              <ShieldCheck className="w-6 h-6 text-[#244A83] mb-4" />
              <h3 className="text-lg font-semibold text-[#292D35] mb-2">
                Verifikasi & Akses Privat
              </h3>
              <p className="text-sm text-[#292D35]/75 leading-relaxed">
                File produk digital disimpan pada ruang privat dan hanya dapat diunduh setelah pembayaran diverifikasi oleh admin.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-[#5686C5]/25">
              <Layout className="w-6 h-6 text-[#244A83] mb-4" />
              <h3 className="text-lg font-semibold text-[#292D35] mb-2">
                Harga Jelas & Terjangkau
              </h3>
              <p className="text-sm text-[#292D35]/75 leading-relaxed">
                Tanpa biaya tersembunyi. Total tagihan dihitung konsisten di server dan tersedia opsi pembayaran Transfer Bank maupun QRIS.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Ulasan Pelanggan (Cloud White) */}
      <section className="bg-[#F7F8FB] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-xs font-semibold tracking-wider uppercase text-[#5686C5] mb-2">
              Pengalaman Pembeli
            </p>
            <h2 className="font-editorial text-3xl font-bold text-[#244A83]">
              Ulasan Pelanggan
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.slice(0, 6).map((rev) => (
              <div
                key={rev.id}
                className="bg-white border border-[#DCE8F6] rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-1 text-[#E9C477]">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="w-4 h-4 fill-[#E9C477] text-[#E9C477]" />
                      ))}
                    </div>
                    {rev.isDemo && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#DCE8F6] text-[#244A83]">
                        DEMO
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#292D35]/85 leading-relaxed mb-5">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-[#DCE8F6]">
                  {rev.avatarUrl ? (
                    <img
                      src={rev.avatarUrl}
                      alt={rev.customerName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#244A83] text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {rev.customerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#292D35] truncate">
                      {rev.customerName}
                    </p>
                    <p className="text-xs text-[#292D35]/60 truncate">
                      {rev.roleOrCity ? `${rev.roleOrCity} · ` : ''}
                      {rev.dateLabel}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ Singkat (Ice Blue tint) */}
      <section className="bg-[#DCE8F6]/50 border-t border-[#DCE8F6] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[#5686C5] mb-2">
                Pertanyaan Umum
              </p>
              <h2 className="font-editorial text-3xl font-bold text-[#244A83]">
                FAQ Singkat
              </h2>
            </div>
            <Link
              to="/faq"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#244A83] hover:text-[#5686C5] transition-colors"
            >
              <span>Lihat Semua FAQ</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {SHORT_FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="bg-white border border-[#DCE8F6] rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-semibold text-[#292D35] hover:text-[#244A83] transition-colors"
                  >
                    <span className="text-sm sm:text-base">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#244A83] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-[#292D35]/80 leading-relaxed border-t border-[#DCE8F6]/60 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}
