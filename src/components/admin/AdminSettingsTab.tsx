import React, { useEffect, useState } from 'react';
import { ExternalLink, Save, Upload } from 'lucide-react';
import { LEGACY_APPS_SCRIPT_URL, LEGACY_GOOGLE_FORM_URL } from '../../data/catalogData';
import { saveStoreSettingsAdmin } from '../../lib/firestoreService';
import type { StoreSettings } from '../../types/store';

interface AdminSettingsTabProps {
  settings: StoreSettings;
  getIdToken: () => Promise<string>;
  onRefreshSettings: () => Promise<void>;
  showToast: (msg: string, tone?: 'info' | 'error') => void;
}

type AssetField = 'logoUrl' | 'bannerUrl' | 'watermarkUrl' | 'faviconUrl' | 'qrisUrl';

export function AdminSettingsTab({
  settings,
  getIdToken,
  onRefreshSettings,
  showToast,
}: AdminSettingsTabProps) {
  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<AssetField | null>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleAssetUpload = async (
    field: AssetField,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file) return;
    setUploadingField(field);
    try {
      const token = await getIdToken();
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload-asset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const rawText = await res.text();
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Respons server tidak valid (HTTP ${res.status}).`);
      }
      if (!res.ok || !data.url) throw new Error(data.error || 'Gagal mengunggah aset.');
      setForm((prev) => ({ ...prev, [field]: data.url }));
      showToast('Aset gambar berhasil diunggah. Klik Simpan Pengaturan untuk menerbitkan.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal unggah aset.', 'error');
    } finally {
      inputEl.value = '';
      setUploadingField(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveStoreSettingsAdmin(form);
      await onRefreshSettings();
      showToast('Pengaturan toko & tampilan berhasil disimpan ke Firestore.');
    } catch {
      showToast('Gagal menyimpan pengaturan toko.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const assetSlots: Array<{ field: AssetField; label: string; hint: string }> = [
    { field: 'logoUrl', label: 'Logo NusaKlik.id', hint: 'PNG/SVG transparan disarankan' },
    { field: 'bannerUrl', label: 'Banner Utama Beranda', hint: 'Rasio 16:9 disarankan' },
    { field: 'watermarkUrl', label: 'Watermark Produk', hint: 'PNG transparan opsional' },
    { field: 'faviconUrl', label: 'Favicon Situs', hint: 'ICO atau PNG 64×64' },
    { field: 'qrisUrl', label: 'Gambar QRIS Pembayaran', hint: 'Ditampilkan saat checkout QRIS' },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#244A83]">
            Pengaturan Toko & Tampilan
          </h1>
          <p className="text-sm text-[#292D35]/75 mt-1">
            Atur identitas brand, aset resmi, kontak WhatsApp/email, rekening pembayaran, QRIS, dan teks tampilan.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5] disabled:opacity-60 shrink-0"
        >
          <Save className="w-4 h-4 text-[#E9C477]" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
        </button>
      </div>

      {/* Store Identity & Appearance */}
      <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 space-y-4">
        <h2 className="font-editorial text-xl font-bold text-[#244A83]">
          Identitas & Tampilan Beranda
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Nama Toko
            </label>
            <input
              type="text"
              required
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Tagline
            </label>
            <input
              type="text"
              required
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#292D35] mb-1">
            Judul Hero Banner
          </label>
          <input
            type="text"
            required
            value={form.heroTitle}
            onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#292D35] mb-1">
            Deskripsi Hero Banner
          </label>
          <textarea
            rows={2}
            required
            value={form.heroDescription}
            onChange={(e) => setForm({ ...form, heroDescription: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-9">
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Teks Promosi Atas (Opsional)
            </label>
            <input
              type="text"
              value={form.promoText || ''}
              onChange={(e) => setForm({ ...form, promoText: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>
          <div className="md:col-span-3 pt-4">
            <label className="inline-flex items-center gap-2 text-sm text-[#292D35] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.showPromo)}
                onChange={(e) => setForm({ ...form, showPromo: e.target.checked })}
                className="w-4 h-4 accent-[#244A83]"
              />
              <span>Tampilkan Promosi</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#DCE8F6]">
          <div>
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Deskripsi Footer
            </label>
            <textarea
              rows={2}
              value={form.footerDescription || ''}
              onChange={(e) => setForm({ ...form, footerDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Teks Hak Cipta Footer
            </label>
            <input
              type="text"
              value={form.footerCopyright || ''}
              onChange={(e) => setForm({ ...form, footerCopyright: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Brand & QRIS Assets */}
      <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 space-y-4">
        <h2 className="font-editorial text-xl font-bold text-[#244A83]">
          Aset Brand & QRIS Pembayaran
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assetSlots.map((slot) => (
            <div
              key={slot.field}
              className="bg-[#F7F8FB] border border-[#DCE8F6] rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#244A83]">{slot.label}</p>
                <span className="text-[11px] text-[#292D35]/60">{slot.hint}</span>
              </div>
              <input
                type="text"
                value={form[slot.field] || ''}
                onChange={(e) => setForm({ ...form, [slot.field]: e.target.value })}
                placeholder="URL aset atau unggah file"
                className="w-full px-3 py-2 rounded-lg border border-[#DCE8F6] bg-white text-xs"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#DCE8F6] text-[#244A83] text-xs font-semibold cursor-pointer hover:bg-[#5686C5]/30">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploadingField === slot.field ? 'Mengunggah...' : 'Unggah Gambar'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.ico"
                    onChange={(e) => handleAssetUpload(slot.field, e)}
                    className="hidden"
                  />
                </label>
                {form[slot.field] ? (
                  <img
                    src={form[slot.field]}
                    alt={slot.label}
                    referrerPolicy="no-referrer"
                    className="h-9 w-14 object-contain rounded border border-[#DCE8F6] bg-white"
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact & Bank Payment Info */}
      <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 space-y-4">
        <h2 className="font-editorial text-xl font-bold text-[#244A83]">
          Kontak & Rekening Pembayaran
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Nomor WhatsApp Admin (format 62...)
            </label>
            <input
              type="text"
              placeholder="Contoh: 6281234567890"
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Email Resmi Toko
            </label>
            <input
              type="email"
              placeholder="Contoh: kontak@nusaklik.id"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Nama Bank
            </label>
            <input
              type="text"
              placeholder="Contoh: BCA / BRI / Mandiri"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Nomor Rekening
            </label>
            <input
              type="text"
              placeholder="Masukkan nomor rekening resmi"
              value={form.bankAccountNumber}
              onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm font-mono"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Nama Pemilik Rekening
            </label>
            <input
              type="text"
              placeholder="Masukkan nama pemilik rekening"
              value={form.bankAccountHolder}
              onChange={(e) => setForm({ ...form, bankAccountHolder: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Instruksi Pembayaran
            </label>
            <textarea
              rows={3}
              value={form.paymentInstructions || ''}
              onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Legacy Integration Reference */}
      <div className="bg-[#DCE8F6]/50 border border-[#DCE8F6] rounded-2xl p-6 space-y-3 text-xs text-[#292D35]/85">
        <h2 className="font-editorial text-lg font-bold text-[#244A83]">
          Referensi Integrasi Lama NusaKlik.id (Google Sheets & Form)
        </h2>
        <p>
          Sistem lama tetap dipertahankan tanpa mengubah struktur tab <strong>Produk</strong> dan{' '}
          <strong>Form_Responses</strong> maupun menghapus data lama.
        </p>
        <div className="flex flex-wrap gap-4 pt-1">
          <a
            href={LEGACY_GOOGLE_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-[#244A83] underline hover:text-[#5686C5]"
          >
            <span>Buka Google Form Lama</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <span className="text-[#292D35]/60 font-mono truncate max-w-md">
            Apps Script Proxy Aktif: /api/legacy/products
          </span>
          <span className="sr-only">{LEGACY_APPS_SCRIPT_URL}</span>
        </div>
      </div>
    </form>
  );
}
