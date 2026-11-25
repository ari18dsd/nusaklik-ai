import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { StoreLayout } from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { formatRupiah } from '../lib/format';

export function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart, cartSubtotal, cartCount } = useStore();
  const navigate = useNavigate();

  return (
    <StoreLayout>
      <section className="bg-gradient-to-r from-[#244A83] to-[#5686C5] text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#E9C477] mb-1">
            Ringkasan Belanja
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-white">
            Keranjang Belanja
          </h1>
        </div>
      </section>

      <section className="bg-[#F7F8FB] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {cart.length === 0 ? (
            <div className="bg-white border border-[#DCE8F6] rounded-2xl p-12 text-center max-w-2xl mx-auto">
              <ShoppingBag className="w-12 h-12 text-[#5686C5] mx-auto mb-4" />
              <h2 className="font-editorial text-2xl font-bold text-[#244A83] mb-2">
                Keranjang Anda Masih Kosong
              </h2>
              <p className="text-sm text-[#292D35]/75 mb-6">
                Jelajahi e-book, template website, template bisnis, dan karya digital pilihan kami terlebih dahulu.
              </p>
              <Link
                to="/katalog"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5] transition-colors"
              >
                <span>Jelajahi Katalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Items List */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#292D35] tabular-nums">
                    {cartCount} item dipilih
                  </p>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs font-semibold text-[#5686C5] hover:text-[#244A83] transition-colors"
                  >
                    Kosongkan Keranjang
                  </button>
                </div>

                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="bg-white border border-[#DCE8F6] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <Link
                      to={`/produk/${item.productId}`}
                      className="w-full sm:w-28 aspect-[4/3] rounded-lg overflow-hidden bg-[#DCE8F6]/50 shrink-0"
                    >
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#244A83] text-white">
                          <BookOpen className="w-6 h-6 text-[#E9C477]" />
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#5686C5] font-medium mb-1">
                        {item.category}
                        {item.isDemo ? ' · DEMO' : ''}
                      </p>
                      <Link
                        to={`/produk/${item.productId}`}
                        className="text-base font-semibold text-[#292D35] hover:text-[#244A83] transition-colors block truncate"
                      >
                        {item.title}
                      </Link>
                      <p className="text-sm font-bold text-[#244A83] font-mono tabular-nums mt-1">
                        {formatRupiah(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="inline-flex items-center border border-[#DCE8F6] rounded-lg bg-[#F7F8FB]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          aria-label="Kurangi jumlah"
                          className="p-2 text-[#244A83] hover:bg-[#DCE8F6]/60"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-9 text-center text-sm font-semibold tabular-nums font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          aria-label="Tambah jumlah"
                          className="p-2 text-[#244A83] hover:bg-[#DCE8F6]/60"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right min-w-[96px]">
                        <p className="text-xs text-[#292D35]/60">Subtotal</p>
                        <p className="text-sm font-bold text-[#292D35] font-mono tabular-nums">
                          {formatRupiah(item.price * item.quantity)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        aria-label={`Hapus ${item.title}`}
                        className="p-2 rounded-lg text-[#292D35]/60 hover:text-[#244A83] hover:bg-[#DCE8F6]/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-4 bg-white border border-[#DCE8F6] rounded-2xl p-6 space-y-5 lg:sticky lg:top-24">
                <h2 className="font-editorial text-2xl font-bold text-[#244A83]">
                  Ringkasan Pesanan
                </h2>

                <div className="space-y-3 text-sm border-y border-[#DCE8F6] py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#292D35]/75">Jumlah Item</span>
                    <span className="font-semibold tabular-nums font-mono">{cartCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#292D35]/75">Subtotal</span>
                    <span className="font-semibold tabular-nums font-mono">
                      {formatRupiah(cartSubtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#DCE8F6]">
                    <span className="font-bold text-[#292D35]">Total Estimasi</span>
                    <span className="text-xl font-bold text-[#244A83] tabular-nums font-mono">
                      {formatRupiah(cartSubtotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="w-full py-3.5 px-5 rounded-lg bg-[#244A83] text-white text-sm font-bold hover:bg-[#5686C5] transition-colors inline-flex items-center justify-center gap-2"
                >
                  <span>Lanjut ke Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="bg-[#DCE8F6]/50 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-[#292D35]/80">
                  <ShieldCheck className="w-4 h-4 text-[#244A83] shrink-0 mt-0.5" />
                  <span>
                    Harga dihitung ulang dan diverifikasi di server sebelum pesanan dibuat.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </StoreLayout>
  );
}
