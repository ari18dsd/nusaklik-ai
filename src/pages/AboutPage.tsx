import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, Layers, ShieldCheck } from 'lucide-react';
import { StoreLayout } from '../components/StoreLayout';

export function AboutPage() {
  return (
    <StoreLayout>
      <section className="bg-gradient-to-r from-[#244A83] to-[#5686C5] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#E9C477] mb-2">
            Tentang NusaKlik.id
          </p>
          <h1 className="font-editorial text-3xl sm:text-5xl font-bold text-white max-w-2xl leading-tight">
            Temukan Ide, Wujudkan Karya.
          </h1>
          <p className="text-sm sm:text-base text-[#DCE8F6] max-w-2xl mt-4 leading-relaxed">
            NusaKlik.id hadir sebagai toko produk digital yang berfokus pada e-book praktis, template website, template bisnis, panduan kerja, materi edukasi, dan cerita anak Indonesia.
          </p>
        </div>
      </section>

      <section className="bg-[#F7F8FB] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7 space-y-5">
            <h2 className="font-editorial text-3xl font-bold text-[#244A83]">
              Misi Kami untuk Kreator, Pelajar, dan Pelaku Usaha
            </h2>
            <p className="text-base text-[#292D35]/85 leading-relaxed">
              Banyak ide hebat tertunda bukan karena kurangnya semangat, melainkan karena keterbatasan panduan yang mudah diikuti serta perangkat kerja yang rapi. NusaKlik.id menyusun sumber daya digital yang ringkas, terstruktur, dan relevan untuk kebutuhan nyata di Indonesia.
            </p>
            <p className="text-base text-[#292D35]/85 leading-relaxed">
              Mulai dari pelajar dan pencari kerja yang ingin menguasai Excel dari nol, pelaku UMKM yang memerlukan template proposal dan website bisnis, hingga orang tua yang mencari cerita anak penuh pesan moral—seluruh koleksi kami dikurasi dengan standar kejelasan dan estetika tinggi.
            </p>
            <div className="pt-3">
              <Link
                to="/katalog"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#244A83] text-white text-sm font-semibold hover:bg-[#5686C5] transition-colors"
              >
                <span>Jelajahi Koleksi Produk</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="bg-[#DCE8F6]/60 border border-[#DCE8F6] rounded-xl p-6">
              <BookOpen className="w-6 h-6 text-[#244A83] mb-3" />
              <h3 className="font-semibold text-[#292D35] mb-1">Konten Terkurasi</h3>
              <p className="text-sm text-[#292D35]/75">
                Setiap produk melewati penyusunan struktur agar langsung dapat diterapkan tanpa bertele-tele.
              </p>
            </div>

            <div className="bg-white border border-[#DCE8F6] rounded-xl p-6">
              <ShieldCheck className="w-6 h-6 text-[#244A83] mb-3" />
              <h3 className="font-semibold text-[#292D35] mb-1">Transaksi Transparan</h3>
              <p className="text-sm text-[#292D35]/75">
                Nominal dihitung konsisten di server dan setiap pembayaran diverifikasi manual oleh admin sebelum akses file dibuka.
              </p>
            </div>

            <div className="bg-[#DCE8F6]/60 border border-[#DCE8F6] rounded-xl p-6">
              <Layers className="w-6 h-6 text-[#244A83] mb-3" />
              <h3 className="font-semibold text-[#292D35] mb-1">Kompatibel & Berkelanjutan</h3>
              <p className="text-sm text-[#292D35]/75">
                Mendukung sinkronisasi katalog terdahulu agar ekosistem karya digital NusaKlik.id terus bertumbuh tanpa kehilangan data lama.
              </p>
            </div>

            <div className="bg-white border border-[#DCE8F6] rounded-xl p-6">
              <Award className="w-6 h-6 text-[#244A83] mb-3" />
              <h3 className="font-semibold text-[#292D35] mb-1">Identitas Royal Blue Luxury</h3>
              <p className="text-sm text-[#292D35]/75">
                Pengalaman belanja yang tenang, elegan, dan nyaman diakses baik dari komputer maupun ponsel.
              </p>
            </div>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}
