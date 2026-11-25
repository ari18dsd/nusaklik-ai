import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function AdminLoginPage() {
  const { authReady, user, isAdmin, signInAdminWithGoogle, signOutUser } = useStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authReady && user && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [authReady, user, isAdmin, navigate]);

  const handleLogin = async () => {
    setBusy(true);
    try {
      const ok = await signInAdminWithGoogle();
      if (ok) {
        navigate('/admin', { replace: true });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#244A83] via-[#2F5B9B] to-[#5686C5] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-[#DCE8F6] rounded-2xl p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#244A83] hover:text-[#5686C5]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Toko</span>
          </Link>
          <span className="font-editorial text-lg font-bold text-[#244A83]">NusaKlik.id</span>
        </div>

        <div className="space-y-2 pt-2">
          <div className="w-12 h-12 rounded-xl bg-[#DCE8F6] text-[#244A83] flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#244A83]">
            Masuk Ruang Admin
          </h1>
          <p className="text-sm text-[#292D35]/75 leading-relaxed">
            Gunakan akun Google administrator yang terdaftar untuk mengelola katalog produk, pesanan, ulasan, file privat, dan pengaturan toko.
          </p>
        </div>

        {authReady && user && !isAdmin && (
          <div className="bg-[#292D35] text-[#E9C477] rounded-xl p-4 text-xs space-y-2">
            <p>
              Akun <strong>{user.email}</strong> tidak memiliki izin admin NusaKlik.id.
            </p>
            <button
              type="button"
              onClick={signOutUser}
              className="underline font-semibold text-white"
            >
              Keluar & ganti akun
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={busy || !authReady}
          onClick={handleLogin}
          className="w-full py-3.5 px-5 rounded-lg bg-[#244A83] text-white text-sm font-bold hover:bg-[#5686C5] transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2.5"
        >
          <ShieldCheck className="w-5 h-5 text-[#E9C477]" />
          <span>{busy ? 'Memverifikasi Sesi...' : 'Masuk dengan Google'}</span>
        </button>

        <div className="bg-[#DCE8F6]/50 rounded-xl p-4 text-xs text-[#292D35]/80 space-y-1">
          <p className="font-semibold text-[#244A83]">Keamanan Autentikasi</p>
          <p>
            Akses divalidasi melalui Firebase Authentication dan aturan hak akses Firestore di sisi server. Tidak ada kata sandi yang disimpan di kode aplikasi.
          </p>
        </div>
      </div>
    </div>
  );
}
