import React, { useState } from 'react';
import { Mail, MessageCircle, Send } from 'lucide-react';
import { StoreLayout } from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { formatWhatsAppLink } from '../lib/format';

export function ContactPage() {
  const { settings, showToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const hasWa = Boolean(settings.whatsappNumber && settings.whatsappNumber.trim());
  const hasEmail = Boolean(settings.contactEmail && settings.contactEmail.trim());

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    if (!hasEmail) {
      showToast('Email resmi toko belum dikonfigurasi oleh admin.', 'error');
      return;
    }
    const mailto = `mailto:${encodeURIComponent(
      settings.contactEmail
    )}?subject=${encodeURIComponent(
      `Pertanyaan dari ${name.trim()} — NusaKlik.id`
    )}&body=${encodeURIComponent(
      `Nama: ${name.trim()}\nEmail: ${email.trim()}\n\nPesan:\n${message.trim()}`
    )}`;
    window.location.href = mailto;
    showToast('Membuka aplikasi email Anda untuk mengirim pesan.');
  };

  return (
    <StoreLayout>
      <section className="bg-gradient-to-r from-[#244A83] to-[#5686C5] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#E9C477] mb-2">
            Hubungi Kami
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-white">
            Kontak NusaKlik.id
          </h1>
          <p className="text-sm sm:text-base text-[#DCE8F6] max-w-xl mt-2">
            Punya pertanyaan seputar produk, kolaborasi karya digital, atau konfirmasi pesanan? Tim kami siap membantu.
          </p>
        </div>
      </section>

      <section className="bg-[#F7F8FB] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-[#DCE8F6]/60 border border-[#DCE8F6] rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#244A83] text-[#E9C477] flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#244A83]">WhatsApp Admin</h2>
                  <p className="text-xs text-[#292D35]/75 mb-2">
                    Respon cepat untuk konfirmasi pembayaran dan bantuan produk.
                  </p>
                  {hasWa ? (
                    <a
                      href={formatWhatsAppLink(
                        settings.whatsappNumber,
                        'Halo Admin NusaKlik.id, saya ingin berkonsultasi mengenai produk digital.'
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#244A83] underline hover:text-[#5686C5]"
                    >
                      <span>Chat via WhatsApp</span>
                    </a>
                  ) : (
                    <p className="text-xs font-medium text-[#292D35]/70">
                      Nomor WhatsApp belum dikonfigurasi oleh admin.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#DCE8F6] rounded-2xl p-6 space-y-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#DCE8F6] text-[#244A83] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#244A83]">Email Resmi</h2>
                  <p className="text-sm font-medium text-[#292D35] mt-1">
                    {hasEmail ? settings.contactEmail : 'Belum dikonfigurasi oleh admin'}
                  </p>
                  <p className="text-xs text-[#292D35]/70 mt-1">
                    Jam operasional verifikasi: Senin–Minggu, 08.00–21.00 WIB.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#DCE8F6] rounded-2xl p-6 sm:p-8">
            <h2 className="font-editorial text-2xl font-bold text-[#244A83] mb-5">
              Kirim Pesan Langsung
            </h2>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-sm font-semibold text-[#292D35] mb-1.5"
                  >
                    Nama Anda
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm focus:outline-none focus:border-[#244A83]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-sm font-semibold text-[#292D35] mb-1.5"
                  >
                    Email Anda
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm focus:outline-none focus:border-[#244A83]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-msg"
                  className="block text-sm font-semibold text-[#292D35] mb-1.5"
                >
                  Isi Pesan
                </label>
                <textarea
                  id="contact-msg"
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tuliskan pertanyaan atau kebutuhan Anda..."
                  className="w-full px-4 py-2.5 rounded-lg border border-[#DCE8F6] bg-[#F7F8FB] text-sm focus:outline-none focus:border-[#244A83]"
                />
              </div>

              <button
                type="submit"
                disabled={!hasEmail}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5] transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{hasEmail ? 'Kirim via Email' : 'Email Toko Belum Tersedia'}</span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}
