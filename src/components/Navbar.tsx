import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const NAV_LINKS = [
  { to: '/', label: 'Beranda' },
  { to: '/katalog', label: 'Katalog' },
  { to: '/tentang', label: 'Tentang Kami' },
  { to: '/faq', label: 'FAQ' },
  { to: '/kontak', label: 'Kontak' },
];

export function Navbar() {
  const { settings, cartCount } = useStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [promoDismissed, setPromoDismissed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-full">
      {settings.showPromo && settings.promoText && !promoDismissed && (
        <div className="bg-[#1D3B69] text-[#F7F8FB] text-xs py-2 px-4 border-b border-[#5686C5]/30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <p className="truncate font-medium text-[#E9C477]">{settings.promoText}</p>
            <button
              type="button"
              onClick={() => setPromoDismissed(true)}
              aria-label="Tutup informasi promo"
              className="text-white/80 hover:text-[#E9C477] transition-colors shrink-0 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#244A83] text-white border-b border-[#5686C5]/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#E9C477] rounded"
          >
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.storeName}
                referrerPolicy="no-referrer"
                className="h-8 w-auto object-contain"
              />
            ) : null}
            <span className="font-editorial">{settings.storeName || 'NusaKlik.id'}</span>
          </Link>

          {/* Zone 2: Concise single-line navigation links */}
          <nav
            aria-label="Navigasi utama"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {NAV_LINKS.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    active
                      ? 'text-[#E9C477] border-[#E9C477]'
                      : 'text-white border-transparent hover:text-[#DCE8F6] hover:border-[#5686C5]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action (Keranjang) + Mobile Menu Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/keranjang"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#E9C477] text-[#244A83] hover:bg-[#f0d290] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Keranjang</span>
              <span className="tabular-nums font-mono text-xs bg-[#244A83] text-white px-1.5 py-0.5 rounded">
                {cartCount}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label="Buka menu navigasi"
              className="md:hidden p-2 rounded-lg text-white hover:bg-[#5686C5]/30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden bg-[#1D3B69] border-t border-[#5686C5]/30 px-4 py-4 space-y-1">
            {NAV_LINKS.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#244A83] text-[#E9C477]'
                      : 'text-white hover:bg-[#244A83]/60 hover:text-[#DCE8F6]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-2 mt-2 border-t border-[#5686C5]/30 space-y-1">
              <Link
                to="/konfirmasi"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 rounded-lg text-sm font-medium text-[#DCE8F6] hover:bg-[#244A83]/60"
              >
                Konfirmasi Pembayaran
              </Link>
              <Link
                to="/admin/login"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 rounded-lg text-sm font-medium text-[#E9C477] hover:bg-[#244A83]/60"
              >
                Ruang Admin
              </Link>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
