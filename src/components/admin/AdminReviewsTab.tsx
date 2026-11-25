import React, { useState } from 'react';
import { Edit3, Plus, Star, Trash2, Upload, X } from 'lucide-react';
import { deleteReviewAdmin, saveReviewAdmin } from '../../lib/firestoreService';
import { sanitizeId } from '../../lib/format';
import type { CustomerReview } from '../../types/store';

interface AdminReviewsTabProps {
  reviews: CustomerReview[];
  getIdToken: () => Promise<string>;
  onRefresh: () => Promise<void>;
  showToast: (msg: string, tone?: 'info' | 'error') => void;
}

const EMPTY_REVIEW: CustomerReview = {
  id: '',
  customerName: '',
  roleOrCity: '',
  avatarUrl: '',
  rating: 5,
  comment: '',
  dateLabel: 'November 2026',
  visible: true,
  isDemo: false,
};

export function AdminReviewsTab({
  reviews,
  getIdToken,
  onRefresh,
  showToast,
}: AdminReviewsTabProps) {
  const [editing, setEditing] = useState<CustomerReview | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const openNew = () => {
    setEditing({ ...EMPTY_REVIEW });
    setIsNew(true);
  };

  const openEdit = (rev: CustomerReview) => {
    setEditing({ ...rev });
    setIsNew(false);
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file || !editing) return;
    setUploadingAvatar(true);
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
      if (!res.ok || !data.url) throw new Error(data.error || 'Gagal mengunggah avatar.');
      setEditing({ ...editing, avatarUrl: data.url });
      showToast('Avatar pelanggan berhasil diunggah.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengunggah avatar.', 'error');
    } finally {
      inputEl.value = '';
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const finalId = isNew
        ? sanitizeId(`rev-${editing.customerName}-${Date.now()}`)
        : editing.id;
      await saveReviewAdmin({ ...editing, id: finalId }, isNew);
      setEditing(null);
      await onRefresh();
      showToast('Ulasan pelanggan berhasil disimpan.');
    } catch {
      showToast('Gagal menyimpan ulasan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rev: CustomerReview) => {
    try {
      await deleteReviewAdmin(rev.id);
      await onRefresh();
      showToast(`Ulasan dari "${rev.customerName}" dihapus.`);
    } catch {
      showToast('Gagal menghapus ulasan.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#244A83]">
            Kelola Ulasan Pelanggan
          </h1>
          <p className="text-sm text-[#292D35]/75 mt-1">
            Tambahkan, ubah, atau tandai ulasan contoh dengan label DEMO sebelum testimoni asli tersedia.
          </p>
        </div>

        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#244A83] text-white text-xs font-semibold hover:bg-[#5686C5] shrink-0"
        >
          <Plus className="w-4 h-4 text-[#E9C477]" />
          <span>Tambah Ulasan</span>
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white border border-[#244A83]/30 rounded-2xl p-6 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-[#DCE8F6] pb-3">
            <h2 className="font-editorial text-xl font-bold text-[#244A83]">
              {isNew ? 'Tambah Ulasan Baru' : `Edit Ulasan: ${editing.customerName}`}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="p-1.5 rounded-lg text-[#292D35]/70 hover:bg-[#DCE8F6]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Nama Pelanggan
              </label>
              <input
                type="text"
                required
                value={editing.customerName}
                onChange={(e) => setEditing({ ...editing, customerName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Peran / Kota (opsional)
              </label>
              <input
                type="text"
                value={editing.roleOrCity || ''}
                onChange={(e) => setEditing({ ...editing, roleOrCity: e.target.value })}
                placeholder="Contoh: Pemilik UMKM · Jakarta"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Rating Bintang (1–5)
              </label>
              <select
                value={editing.rating}
                onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} Bintang
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292D35] mb-1">
                Tanggal Ulasan
              </label>
              <input
                type="text"
                required
                value={editing.dateLabel}
                onChange={(e) => setEditing({ ...editing, dateLabel: e.target.value })}
                placeholder="Contoh: November 2026"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292D35] mb-1">
              Isi Ulasan
            </label>
            <textarea
              rows={3}
              required
              value={editing.comment}
              onChange={(e) => setEditing({ ...editing, comment: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#DCE8F6] text-[#244A83] text-xs font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingAvatar ? 'Mengunggah...' : 'Unggah Avatar (opsional)'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadAvatar}
                className="hidden"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-[#292D35] cursor-pointer">
              <input
                type="checkbox"
                checked={editing.visible}
                onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
                className="w-4 h-4 accent-[#244A83]"
              />
              <span>Tampilkan di Beranda</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-[#292D35] cursor-pointer">
              <input
                type="checkbox"
                checked={editing.isDemo}
                onChange={(e) => setEditing({ ...editing, isDemo: e.target.checked })}
                className="w-4 h-4 accent-[#244A83]"
              />
              <span>Tandai DEMO</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#DCE8F6]">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg border border-[#DCE8F6] text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5]"
            >
              {saving ? 'Menyimpan...' : 'Simpan Ulasan'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.length === 0 ? (
          <div className="md:col-span-2 bg-white border border-[#DCE8F6] rounded-2xl p-10 text-center text-sm text-[#292D35]/70">
            Belum ada ulasan tersimpan di Firestore.
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-[#DCE8F6] rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-[#E9C477] text-[#E9C477]"
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {rev.isDemo && (
                      <span className="px-2 py-0.5 rounded bg-[#DCE8F6] text-[#244A83] font-semibold">
                        DEMO
                      </span>
                    )}
                    <span className="text-[#5686C5] font-medium">
                      {rev.visible ? 'Tampil' : 'Tersembunyi'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[#292D35]/85 leading-relaxed">"{rev.comment}"</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#DCE8F6]">
                <div>
                  <p className="text-sm font-bold text-[#292D35]">{rev.customerName}</p>
                  <p className="text-xs text-[#292D35]/60">
                    {rev.roleOrCity ? `${rev.roleOrCity} · ` : ''}
                    {rev.dateLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(rev)}
                    className="p-2 rounded-lg border border-[#DCE8F6] text-[#244A83] hover:bg-[#DCE8F6]"
                    aria-label="Edit ulasan"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rev)}
                    className="p-2 rounded-lg border border-[#DCE8F6] text-[#292D35] hover:bg-[#292D35] hover:text-[#E9C477]"
                    aria-label="Hapus ulasan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
