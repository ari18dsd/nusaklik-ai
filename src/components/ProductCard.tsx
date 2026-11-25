import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupiah } from '../lib/format';
import type { Product } from '../types/store';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useStore();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const handleBuyNow = () => {
    addToCart(product, 1);
    navigate('/checkout');
  };

  return (
    <article className="group bg-white border border-[#DCE8F6] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link
        to={`/produk/${product.id}`}
        className="block relative aspect-[4/3] bg-[#DCE8F6]/40 overflow-hidden"
      >
        {product.coverUrl && !imgError ? (
          <img
            src={product.coverUrl}
            alt={product.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#244A83] to-[#5686C5] text-white">
            <BookOpen className="w-9 h-9 text-[#E9C477] mb-2" />
            <span className="text-xs font-medium text-[#DCE8F6]">{product.category}</span>
          </div>
        )}
      </Link>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 text-xs text-[#5686C5] font-medium mb-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <span>{product.category}</span>
            {product.featured && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#9E7722] font-semibold">Unggulan</span>
              </>
            )}
          </div>
          {product.isDemo && (
            <span className="shrink-0 px-2 py-0.5 text-[11px] font-semibold bg-[#E9C477]/25 text-[#244A83] rounded">
              DEMO
            </span>
          )}
        </div>

        <Link to={`/produk/${product.id}`} className="block mb-2">
          <h3 className="text-base font-semibold text-[#292D35] group-hover:text-[#244A83] transition-colors line-clamp-2 leading-snug">
            {product.title}
          </h3>
        </Link>

        <p className="text-sm text-[#292D35]/75 line-clamp-2 leading-relaxed mb-4 flex-1">
          {product.shortDescription}
        </p>

        <div className="pt-3 border-t border-[#DCE8F6] space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[#292D35]/60">Harga</span>
            <span className="text-lg font-bold text-[#244A83] font-mono tabular-nums">
              {formatRupiah(product.price)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/produk/${product.id}`}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-[#DCE8F6] text-xs font-semibold text-[#244A83] hover:bg-[#DCE8F6]/50 transition-colors whitespace-nowrap"
            >
              Detail
            </Link>
            <button
              type="button"
              onClick={handleBuyNow}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[#244A83] text-white text-xs font-semibold hover:bg-[#5686C5] transition-colors whitespace-nowrap"
            >
              Beli Sekarang
            </button>
          </div>

          <button
            type="button"
            onClick={() => addToCart(product, 1)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#F7F8FB] border border-[#DCE8F6] text-xs font-medium text-[#292D35] hover:border-[#5686C5] hover:text-[#244A83] transition-colors whitespace-nowrap"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Tambah ke Keranjang</span>
          </button>
        </div>
      </div>
    </article>
  );
}
