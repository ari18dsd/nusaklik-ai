import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { StoreLayout } from '../components/StoreLayout';
import { INITIAL_DEMO_PRODUCTS } from '../data/catalogData';
import { fetchActiveProducts } from '../lib/firestoreService';
import { PRODUCT_CATEGORIES, type Product } from '../types/store';

const PAGE_SIZE = 9;

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>(INITIAL_DEMO_PRODUCTS);
  const [fromFirestore, setFromFirestore] = useState(false);
  const [loading, setLoading] = useState(true);

  const [queryText, setQueryText] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('kategori') || 'Semua'
  );
  const [featuredOnly, setFeaturedOnly] = useState(
    searchParams.get('unggulan') === 'true'
  );
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetchActiveProducts()
      .then((res) => {
        setProducts(res.products);
        setFromFirestore(res.fromFirestore);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const cat = searchParams.get('kategori');
    if (cat) setSelectedCategory(cat);
    const feat = searchParams.get('unggulan');
    if (feat === 'true') setFeaturedOnly(true);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    let list = products.filter((p) => p.active);

    if (selectedCategory !== 'Semua') {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (featuredOnly) {
      list = list.filter((p) => p.featured);
    }
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, queryText, selectedCategory, featuredOnly, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (cat === 'Semua') {
      next.delete('kategori');
    } else {
      next.set('kategori', cat);
    }
    setSearchParams(next);
  };

  return (
    <StoreLayout>
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-[#244A83] to-[#5686C5] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#E9C477] mb-2">
            Katalog Produk Digital
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-white mb-3">
            Jelajahi Koleksi NusaKlik.id
          </h1>
          <p className="text-sm sm:text-base text-[#DCE8F6] max-w-2xl">
            Temukan e-book, template website, template bisnis, panduan praktis, produk edukasi, dan cerita anak sesuai kebutuhanmu.
          </p>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="bg-[#DCE8F6]/50 border-b border-[#DCE8F6] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-[#244A83] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={queryText}
                onChange={(e) => {
                  setQueryText(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari judul e-book, template, atau topik..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-[#DCE8F6] text-sm text-[#292D35] focus:outline-none focus:border-[#244A83]"
              />
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#244A83] shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'default' | 'price-asc' | 'price-desc')}
                aria-label="Urutkan produk"
                className="w-full px-3 py-2.5 rounded-lg bg-white border border-[#DCE8F6] text-sm text-[#292D35] focus:outline-none focus:border-[#244A83]"
              >
                <option value="default">Urutan: Rekomendasi</option>
                <option value="price-asc">Harga: Terendah ke Tertinggi</option>
                <option value="price-desc">Harga: Tertinggi ke Terendah</option>
              </select>
            </div>

            <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-[#244A83] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={featuredOnly}
                  onChange={(e) => {
                    setFeaturedOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 accent-[#244A83] rounded"
                />
                <span>Produk Unggulan</span>
              </label>
            </div>
          </div>

          {/* Category segmented controls */}
          <div className="flex flex-wrap items-center gap-2">
            {['Semua', ...PRODUCT_CATEGORIES].map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#244A83] text-white'
                      : 'bg-white text-[#292D35] border border-[#DCE8F6] hover:border-[#5686C5] hover:text-[#244A83]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="bg-[#F7F8FB] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-6 text-xs text-[#292D35]/70">
            <p className="tabular-nums">
              Menampilkan <strong className="text-[#244A83]">{filtered.length}</strong> produk aktif
              {!fromFirestore && !loading ? ' · Katalog awal (DEMO)' : ''}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-[#DCE8F6] rounded-xl h-96 animate-pulse"
                />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="bg-white border border-[#DCE8F6] rounded-xl p-12 text-center">
              <h2 className="font-editorial text-2xl font-bold text-[#244A83] mb-2">
                Produk Tidak Ditemukan
              </h2>
              <p className="text-sm text-[#292D35]/75 mb-6">
                Coba ubah kata kunci pencarian atau pilih kategori lain untuk melihat koleksi produk kami.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQueryText('');
                  setSelectedCategory('Semua');
                  setFeaturedOnly(false);
                  setPage(1);
                  setSearchParams({});
                }}
                className="px-5 py-2.5 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5] transition-colors"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginated.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pNum = idx + 1;
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => setPage(pNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-semibold tabular-nums transition-colors ${
                          currentPage === pNum
                            ? 'bg-[#244A83] text-white'
                            : 'bg-white border border-[#DCE8F6] text-[#244A83] hover:bg-[#DCE8F6]/50'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </StoreLayout>
  );
}
