import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Info,
  Layers,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { StoreLayout } from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { INITIAL_DEMO_PRODUCTS } from '../data/catalogData';
import { fetchActiveProducts, fetchProductById } from '../lib/firestoreService';
import { formatRupiah } from '../lib/format';
import type { Product } from '../types/store';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, settings } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setImgError(false);
    setQuantity(1);

    Promise.all([fetchProductById(id), fetchActiveProducts()])
      .then(([found, allRes]) => {
        setProduct(found);
        const others = (allRes.products.length ? allRes.products : INITIAL_DEMO_PRODUCTS).filter(
          (p) => p.id !== id && p.active
        );
        setRelated(others.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="h-96 bg-white border border-[#DCE8F6] rounded-xl animate-pulse" />
        </div>
      </StoreLayout>
    );
  }

  if (!product) {
    return (
      <StoreLayout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="font-editorial text-3xl font-bold text-[#244A83] mb-3">
            Produk Tidak Ditemukan
          </h1>
          <p className="text-sm text-[#292D35]/75 mb-6">
            Produk yang Anda cari tidak tersedia atau telah dinonaktifkan.
          </p>
          <Link
            to="/katalog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Katalog</span>
          </Link>
        </div>
      </StoreLayout>
    );
  }

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigate('/checkout');
  };

  return (
    <StoreLayout>
      <div className="bg-[#DCE8F6]/40 border-b border-[#DCE8F6] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 text-xs text-[#244A83] font-medium">
          <Link to="/" className="hover:underline">
            Beranda
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/katalog" className="hover:underline">
            Katalog
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-[#292D35]/75">{product.title}</span>
        </div>
      </div>

      {/* Main Contiguous PDP */}
      <section className="bg-[#F7F8FB] py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left: Cover */}
            <div className="lg:col-span-6 lg:sticky lg:top-24">
              <div className="relative bg-white border border-[#DCE8F6] rounded-2xl overflow-hidden shadow-sm aspect-[4/3]">
                {product.coverUrl && !imgError ? (
                  <img
                    src={product.coverUrl}
                    alt={product.title}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#244A83] to-[#5686C5] text-white p-8">
                    <BookOpen className="w-14 h-14 text-[#E9C477] mb-3" />
                    <span className="text-sm font-medium text-[#DCE8F6]">{product.category}</span>
                  </div>
                )}
                {settings.watermarkUrl && (
                  <img
                    src={settings.watermarkUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="pointer-events-none select-none absolute bottom-3 right-3 h-8 w-auto opacity-75 object-contain"
                  />
                )}
              </div>
            </div>

            {/* Right: Contiguous Purchase Module */}
            <div className="lg:col-span-6 bg-white border border-[#DCE8F6] rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5686C5] mb-2">
                  <span>{product.category}</span>
                  {product.targetAudience && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Target: {product.targetAudience}</span>
                    </>
                  )}
                  {product.featured && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#9E7722] font-semibold">Unggulan</span>
                    </>
                  )}
                  {product.isDemo && (
                    <span className="ml-auto px-2.5 py-0.5 rounded bg-[#E9C477]/30 text-[#244A83] font-bold">
                      PRODUK DEMO
                    </span>
                  )}
                </div>

                <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#244A83] leading-snug mb-3">
                  {product.title}
                </h1>

                <p className="text-3xl font-bold text-[#244A83] font-mono tabular-nums">
                  {formatRupiah(product.price)}
                </p>
              </div>

              {product.isDemo && (
                <div className="bg-[#DCE8F6]/60 border border-[#5686C5]/30 rounded-xl p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#244A83] shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-[#292D35] leading-relaxed">
                    <strong>Status DEMO:</strong> Item ini merupakan produk contoh awal sebelum file produk digital asli diunggah oleh admin NusaKlik.id. Sistem tidak menyediakan file unduhan palsu.
                  </p>
                </div>
              )}

              <div className="space-y-3 text-sm text-[#292D35]/85 leading-relaxed">
                <h2 className="font-sans text-sm font-bold text-[#244A83] uppercase tracking-wider">
                  Deskripsi Lengkap
                </h2>
                <p className="whitespace-pre-line">{product.fullDescription}</p>
              </div>

              {/* Quantity & CTA */}
              <div className="pt-4 border-t border-[#DCE8F6] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#292D35]">Jumlah</span>
                  <div className="inline-flex items-center border border-[#DCE8F6] rounded-lg bg-[#F7F8FB]">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Kurangi jumlah"
                      className="p-2.5 text-[#244A83] hover:bg-[#DCE8F6]/60 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold tabular-nums font-mono">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                      aria-label="Tambah jumlah"
                      className="p-2.5 text-[#244A83] hover:bg-[#DCE8F6]/60 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="w-full py-3.5 px-5 rounded-lg bg-[#244A83] text-white text-sm font-bold hover:bg-[#5686C5] transition-colors"
                  >
                    Beli Sekarang
                  </button>
                  <button
                    type="button"
                    onClick={() => addToCart(product, quantity)}
                    className="w-full py-3.5 px-5 rounded-lg bg-[#E9C477] text-[#244A83] text-sm font-bold hover:bg-[#f0d290] transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Tambah ke Keranjang</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#292D35]/70 pt-1">
                  <ShieldCheck className="w-4 h-4 text-[#244A83] shrink-0" />
                  <span>
                    Akses unduhan file privat aktif setelah pembayaran diverifikasi manual oleh admin.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits & Contents */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 sm:p-8">
              <h2 className="font-editorial text-2xl font-bold text-[#244A83] mb-4">
                Manfaat Produk
              </h2>
              {product.benefits && product.benefits.length > 0 ? (
                <ul className="space-y-3">
                  {product.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#292D35]/85">
                      <Check className="w-4 h-4 text-[#244A83] shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#292D35]/70">
                  Dirancang untuk mempercepat pemahaman dan membantu penyelesaian proyek digital Anda secara praktis.
                </p>
              )}
            </div>

            <div className="bg-[#DCE8F6]/50 border border-[#DCE8F6] rounded-2xl p-6 sm:p-8">
              <h2 className="font-editorial text-2xl font-bold text-[#244A83] mb-4">
                Informasi Isi Produk
              </h2>
              {product.contents && product.contents.length > 0 ? (
                <ul className="space-y-3">
                  {product.contents.map((c, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#292D35]">
                      <Layers className="w-4 h-4 text-[#244A83] shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#292D35]/75">
                  Materi lengkap disajikan dalam format file digital rapi yang dapat diakses setelah konfirmasi pembayaran disetujui.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="bg-[#DCE8F6]/45 border-t border-[#DCE8F6] py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#244A83] mb-8">
              Produk Terkait
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </StoreLayout>
  );
}
