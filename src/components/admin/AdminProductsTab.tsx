import React, { useState } from 'react';
import {
  DownloadCloud,
  Edit3,
  FileLock2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  deleteProductAdmin,
  deleteProductFileAdmin,
  saveProductAdmin,
  saveProductFileAdmin,
} from '../../lib/firestoreService';
import { formatBytes, formatRupiah, sanitizeId, slugify } from '../../lib/format';
import {
  PRODUCT_CATEGORIES,
  type LegacySheetProduct,
  type Product,
  type ProductCategory,
  type ProductFileMeta,
} from '../../types/store';

interface AdminProductsTabProps {
  products: Product[];
  productFiles: Record<string, ProductFileMeta>;
  getIdToken: () => Promise<string>;
  onRefresh: () => Promise<void>;
  showToast: (msg: string, tone?: 'info' | 'error') => void;
}

const EMPTY_FORM: Product = {
  id: '',
  title: '',
  slug: '',
  category: 'E-book',
  price: 29000,
  targetAudience: 'Pemula',
  shortDescription: '',
  fullDescription: '',
  benefits: [],
  contents: [],
  coverUrl: '',
  active: true,
  featured: false,
  isDemo: false,
  hasPrivateFile: false,
  source: 'firestore',
};

export function AdminProductsTab({
  products,
  productFiles,
  getIdToken,
  onRefresh,
  showToast,
}: AdminProductsTabProps) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [benefitsText, setBenefitsText] = useState('');
  const [contentsText, setContentsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPrivate, setUploadingPrivate] = useState(false);

  // Legacy Sheets Sync state
  const [legacyItems, setLegacyItems] = useState<LegacySheetProduct[]>([]);
  const [loadingLegacy, setLoadingLegacy] = useState(false);
  const [showLegacyPanel, setShowLegacyPanel] = useState(false);

  const openNew = () => {
    setEditing({ ...EMPTY_FORM });
    setBenefitsText('');
    setContentsText('');
    setIsNew(true);
  };

  const openEdit = (p: Product) => {
    setEditing({ ...p });
    setBenefitsText((p.benefits || []).join('\n'));
    setContentsText((p.contents || []).join('\n'));
    setIsNew(false);
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file || !editing) return;
    setUploadingCover(true);
    try {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-asset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const rawText = await res.text();
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Respons server tidak valid (HTTP ${res.status}).`);
      }
      if (!res.ok || !data.url) throw new Error(data.error || 'Gagal mengunggah cover.');
      setEditing({ ...editing, coverUrl: data.url });
      showToast('Cover produk berhasil diunggah.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal upload cover.', 'error');
    } finally {
      inputEl.value = '';
      setUploadingCover(false);
    }
  };

  const handleUploadPrivateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file || !editing) return;
    const targetId = editing.id || sanitizeId(editing.title || `prod-${Date.now()}`);
    if (!editing.id) {
      setEditing({ ...editing, id: targetId });
    }

    setUploadingPrivate(true);
    try {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append('productId', targetId);
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-product-file', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const rawText = await res.text();
      let data: {
        fileId?: string;
        fileName?: string;
        mimeType?: string;
        sizeBytes?: number;
        error?: string;
      } = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Respons server tidak valid (HTTP ${res.status}).`);
      }
      if (!res.ok || !data.fileId || !data.fileName) {
        throw new Error(data.error || 'Gagal mengunggah file digital privat.');
      }

      await saveProductFileAdmin({
        productId: targetId,
        fileId: data.fileId,
        fileName: data.fileName,
        mimeType: data.mimeType || 'application/octet-stream',
        sizeBytes: Number(data.sizeBytes) || file.size,
      });

      setEditing((prev) =>
        prev ? { ...prev, id: targetId, hasPrivateFile: true, isDemo: false } : prev
      );
      await onRefresh();
      showToast(`File privat "${data.fileName}" tersimpan aman.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal upload file privat.', 'error');
    } finally {
      inputEl.value = '';
      setUploadingPrivate(false);
    }
  };

  const handleDeletePrivateFile = async () => {
    if (!editing?.id || !productFiles[editing.id]) return;
    setUploadingPrivate(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/product-file/${encodeURIComponent(editing.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Gagal menghapus file dari storage (HTTP ${res.status}).`);
      }
      await deleteProductFileAdmin(editing.id);
      setEditing((prev) => (prev ? { ...prev, hasPrivateFile: false } : prev));
      await onRefresh();
      showToast('File privat berhasil dihapus dari produk.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus file privat.', 'error');
    } finally {
      setUploadingPrivate(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const finalId = isNew ? sanitizeId(editing.id || editing.title) : editing.id;
      const finalSlug = slugify(editing.slug || editing.title) || finalId;

      await saveProductAdmin(
        {
          ...editing,
          id: finalId,
          slug: finalSlug,
          benefits: benefitsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          contents: contentsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        isNew
      );
      setEditing(null);
      await onRefresh();
      showToast('Produk berhasil disimpan ke Firestore.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan produk.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    try {
      if (productFiles[p.id]) {
        const token = await getIdToken();
        await fetch(`/api/admin/product-file/${encodeURIComponent(p.id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      await deleteProductAdmin(p.id);
      await onRefresh();
      showToast(`Produk "${p.title}" dihapus.`);
    } catch {
      showToast('Gagal menghapus produk.', 'error');
    }
  };

  const handleFetchLegacy = async () => {
    setShowLegacyPanel(true);
    setLoadingLegacy(true);
    try {
      const res = await fetch('/api/legacy/products');
      const data = await res.json();
      setLegacyItems(Array.isArray(data.products) ? data.products : []);
      if (data.warning) {
        showToast(data.warning, 'error');
      }
    } catch {
      showToast('Gagal mengambil data dari Google Apps Script lama.', 'error');
    } finally {
      setLoadingLegacy(false);
    }
  };

  const handleImportLegacyItem = async (item: LegacySheetProduct) => {
    try {
      const safeId = sanitizeId(`sheets-${item.id}`);
      await saveProductAdmin(
        {
          id: safeId,
          title: item.title,
          slug: slugify(item.title) || safeId,
          category: item.category,
          price: item.price,
          targetAudience: 'Umum',
          shortDescription: item.shortDescription || item.title,
          fullDescription: item.fullDescription || item.shortDescription || item.title,
          coverUrl: item.coverUrl || '',
          active: item.active,
          featured: false,
          isDemo: true,
          hasPrivateFile: false,
          source: 'sheets_import',
        },
        true
      );
      await onRefresh();
      showToast(`"${item.title}" berhasil diimpor ke Firestore tanpa mengubah Google Sheet lama.`);
    } catch {
      showToast('Gagal mengimpor item dari Google Sheets.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#244A83]">
            Kelola Produk Digital
          </h1>
          <p className="text-sm text-[#292D35]/75 mt-1">
            Tambah, ubah, atur status aktif, kelola file digital privat, atau sinkronkan dari Google Sheets lama.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleFetchLegacy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#244A83] text-[#244A83] text-xs font-semibold hover:bg-[#DCE8F6] transition-colors"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Sinkronisasi Sheets Lama</span>
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#244A83] text-white text-xs font-semibold hover:bg-[#5686C5] transition-colors"
          >
            <Plus className="w-4 h-4 text-[#E9C477]" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Legacy Google Sheets Panel */}
      {showLegacyPanel && (
        <div className="bg-[#DCE8F6]/60 border border-[#5686C5]/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#244A83]">
                Katalog Google Sheets Lama (Tab Produk · Read-Only)
              </h2>
              <p className="text-xs text-[#292D35]/75">
                Data diambil aman melalui server proxy tanpa mengubah atau menghapus spreadsheet lama Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLegacyPanel(false)}
              className="p-1.5 text-[#244A83] hover:bg-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loadingLegacy ? (
            <p className="text-sm text-[#244A83]">Mengambil data dari Apps Script...</p>
          ) : legacyItems.length === 0 ? (
            <p className="text-sm text-[#292D35]/75">
              Tidak ada baris produk ditemukan atau endpoint Apps Script lama belum mengembalikan data.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {legacyItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#DCE8F6] rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#292D35] truncate">{item.title}</p>
                    <p className="text-xs text-[#5686C5] font-mono tabular-nums">
                      {item.category} · {formatRupiah(item.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleImportLegacyItem(item)}
                    className="px-3 py-1.5 rounded-lg bg-[#244A83] text-white text-xs font-semibold hover:bg-[#5686C5] shrink-0"
                  >
                    Impor ke Firestore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Form Modal / Card */}
      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white border border-[#244A83]/30 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-[#DCE8F6] pb-4">
            <h2 className="font-editorial text-xl font-bold text-[#244A83]">
              {isNew ? 'Tambah Produk Baru' : `Edit Produk: ${editing.title}`}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="p-2 rounded-lg text-[#292D35]/70 hover:bg-[#DCE8F6]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Nama Produk
              </label>
              <input
                type="text"
                required
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Kategori
              </label>
              <select
                value={editing.category}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value as ProductCategory })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Harga (Rupiah)
              </label>
              <input
                type="number"
                min={0}
                required
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Target Pengguna (opsional)
              </label>
              <input
                type="text"
                value={editing.targetAudience || ''}
                onChange={(e) => setEditing({ ...editing, targetAudience: e.target.value })}
                placeholder="Contoh: Pemula / UMKM"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Deskripsi Singkat
            </label>
            <input
              type="text"
              required
              maxLength={320}
              value={editing.shortDescription}
              onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Deskripsi Lengkap
            </label>
            <textarea
              rows={4}
              required
              value={editing.fullDescription}
              onChange={(e) => setEditing({ ...editing, fullDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Manfaat Produk (satu poin per baris)
              </label>
              <textarea
                rows={4}
                value={benefitsText}
                onChange={(e) => setBenefitsText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Informasi Isi Produk (satu poin per baris)
              </label>
              <textarea
                rows={4}
                value={contentsText}
                onChange={(e) => setContentsText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
              />
            </div>
          </div>

          {/* Cover Upload + Private File Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#DCE8F6]">
            <div className="bg-[#F7F8FB] border border-[#DCE8F6] rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-[#244A83]">Cover Produk (Publik)</p>
              <input
                type="text"
                placeholder="URL cover atau unggah gambar di bawah"
                value={editing.coverUrl}
                onChange={(e) => setEditing({ ...editing, coverUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE8F6] bg-white text-xs"
              />
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#DCE8F6] text-[#244A83] text-xs font-semibold cursor-pointer hover:bg-[#5686C5]/30">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingCover ? 'Mengunggah...' : 'Unggah Cover'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCover}
                  className="hidden"
                />
              </label>
            </div>

            <div className="bg-[#DCE8F6]/45 border border-[#5686C5]/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#244A83]">
                <FileLock2 className="w-4 h-4" />
                <span>File Produk Digital Privat (PDF/ZIP/XLSX/EPUB)</span>
              </div>
              {editing.id && productFiles[editing.id] ? (
                <p className="text-xs text-[#292D35] font-mono">
                  Terpasang: {productFiles[editing.id].fileName} (
                  {formatBytes(productFiles[editing.id].sizeBytes)})
                </p>
              ) : (
                <p className="text-xs text-[#292D35]/70">
                  Belum ada file privat. Disimpan privat dan tidak pernah tampil di katalog publik.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#244A83] text-white text-xs font-semibold cursor-pointer hover:bg-[#5686C5]">
                  <Upload className="w-3.5 h-3.5 text-[#E9C477]" />
                  <span>
                    {uploadingPrivate
                      ? 'Memproses...'
                      : editing.id && productFiles[editing.id]
                        ? 'Ganti File Privat'
                        : 'Unggah File Privat'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.zip,.xlsx,.xls,.docx,.pptx,.epub,.csv"
                    onChange={handleUploadPrivateFile}
                    className="hidden"
                  />
                </label>

                {editing.id && productFiles[editing.id] && (
                  <button
                    type="button"
                    disabled={uploadingPrivate}
                    onClick={handleDeletePrivateFile}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#DCE8F6] text-xs font-semibold text-[#292D35] hover:bg-[#292D35] hover:text-[#E9C477]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus File</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#292D35] cursor-pointer">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                className="w-4 h-4 accent-[#244A83]"
              />
              <span>Produk Aktif (Tampil di Katalog)</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#292D35] cursor-pointer">
              <input
                type="checkbox"
                checked={editing.featured}
                onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                className="w-4 h-4 accent-[#244A83]"
              />
              <span>Tandai Produk Unggulan</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#292D35] cursor-pointer">
              <input
                type="checkbox"
                checked={editing.isDemo}
                onChange={(e) => setEditing({ ...editing, isDemo: e.target.checked })}
                className="w-4 h-4 accent-[#244A83]"
              />
              <span>Label DEMO</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#DCE8F6]">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-5 py-2.5 rounded-lg border border-[#DCE8F6] text-sm font-semibold text-[#292D35]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5] disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      )}

      {/* Products Table */}
      <div className="bg-white border border-[#DCE8F6] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#DCE8F6]/60 text-xs uppercase text-[#244A83]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Produk</th>
                <th className="px-5 py-3.5 font-semibold">Kategori</th>
                <th className="px-5 py-3.5 font-semibold">Harga</th>
                <th className="px-5 py-3.5 font-semibold">Status & File</th>
                <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE8F6]">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[#292D35]/70">
                    Belum ada produk di Firestore. Gunakan tombol Tambah Produk atau Inisialisasi Data Awal di Ringkasan.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F7F8FB]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#292D35]">{p.title}</p>
                      <p className="text-xs text-[#292D35]/60 font-mono">
                        {p.id}
                        {p.featured ? ' · Unggulan' : ''}
                        {p.isDemo ? ' · DEMO' : ''}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-[#5686C5]">
                      {p.category}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-[#244A83] tabular-nums">
                      {formatRupiah(p.price)}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-semibold ${
                          p.active
                            ? 'bg-[#DCE8F6] text-[#244A83]'
                            : 'bg-gray-200 text-[#292D35]'
                        }`}
                      >
                        {p.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <span className="block text-[11px] text-[#292D35]/65 mt-1">
                        {productFiles[p.id]
                          ? `File privat: ${productFiles[p.id].fileName}`
                          : 'Belum ada file privat'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DCE8F6] text-xs font-semibold text-[#244A83] hover:bg-[#DCE8F6]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DCE8F6] text-xs font-semibold text-[#292D35] hover:bg-[#292D35] hover:text-[#E9C477]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
