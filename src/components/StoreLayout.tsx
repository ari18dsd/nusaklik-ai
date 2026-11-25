import React from 'react';
import { X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function StoreLayout({ children }: { children: React.ReactNode }) {
  const { toast, dismissToast } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FB] text-[#292D35]">
      <Navbar />

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-sm w-full px-4 py-3 rounded-lg shadow-lg border flex items-center justify-between gap-3 text-sm font-medium ${
            toast.tone === 'error'
              ? 'bg-[#292D35] text-[#E9C477] border-[#E9C477]/40'
              : 'bg-[#244A83] text-white border-[#5686C5]/50'
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Tutup notifikasi"
            className="text-white/80 hover:text-[#E9C477] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  );
}
