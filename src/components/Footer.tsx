import { Link } from 'react-router-dom';
import { Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatWhatsAppLink } from '../lib/format';

export function Footer() {
  const { settings } = useStore();
  const hasWa = Boolean(settings.whatsappNumber && settings.whatsappNumber.trim());
  const hasEmail = Boolean(settings.contactEmail && settings.contactEmail.trim());

  return (
    <footer className="bg-[#292D35] text-white border-t border-[#5686C5]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.storeName}
                  referrerPolicy="no-referrer"
                  className="h-8 w-auto object-contain"
                />
              ) : null}
              <span className="font-editorial text-2xl font-bold text-white">
                {settings.storeName || 'NusaKlik.id'}
              </span>
            </div>
            <p className="text-sm font-medium text-[#E9C477]">
              {settings.tagline || 'Temukan Ide, Wujudkan Karya.'}
            </p>
            <p className="text-sm text-gray-300 leading-relaxed max-w-md">
              {settings.footerDescription}
            </p>
          </div>

          {/* Navigasi */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wide">
              Jelajahi Toko
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/katalog" className="text-white hover:text-[#5686C5] transition-colors">
                  Katalog Produk
                </Link>
              </li>
              <li>
                <Link to="/keranjang" className="text-white hover:text-[#5686C5] transition-colors">
                  Keranjang Belanja
                </Link>
              </li>
              <li>
                <Link
                  to="/konfirmasi"
                  className="text-white hover:text-[#5686C5] transition-colors"
                >
                  Konfirmasi Pembayaran
                </Link>
              </li>
              <li>
                <Link to="/tentang" className="text-white hover:text-[#5686C5] transition-colors">
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-white hover:text-[#5686C5] transition-colors">
                  FAQ & Panduan
                </Link>
              </li>
            </ul>
          </div>

          {/* Kontak & Admin */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wide">
              Bantuan & Layanan
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                {hasWa ? (
                  <a
                    href={formatWhatsAppLink(
                      settings.whatsappNumber,
                      'Halo admin NusaKlik.id, saya ingin bertanya mengenai produk digital.'
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white hover:text-[#5686C5] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-[#E9C477]" />
                    <span>WhatsApp Admin</span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 text-gray-400">
                    <MessageCircle className="w-4 h-4 text-[#E9C477]/70" />
                    <span>WhatsApp belum dikonfigurasi</span>
                  </span>
                )}
              </li>
              <li>
                {hasEmail ? (
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="inline-flex items-center gap-2 text-white hover:text-[#5686C5] transition-colors"
                  >
                    <Mail className="w-4 h-4 text-[#E9C477]" />
                    <span>{settings.contactEmail}</span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 text-gray-400">
                    <Mail className="w-4 h-4 text-[#E9C477]/70" />
                    <span>Email belum dikonfigurasi</span>
                  </span>
                )}
              </li>
              <li>
                <Link to="/kontak" className="text-white hover:text-[#5686C5] transition-colors">
                  Halaman Kontak
                </Link>
              </li>
              <li className="pt-2 border-t border-white/10">
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-2 text-[#E9C477] hover:text-[#5686C5] transition-colors font-medium"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ruang Admin</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-gray-300">
          <p>{settings.footerCopyright || '© 2026 NusaKlik.id. Seluruh hak cipta dilindungi.'}</p>
          <p className="text-gray-400">
            Pembayaran terverifikasi manual · Akses file digital privat & aman
          </p>
        </div>
      </div>
    </footer>
  );
}
