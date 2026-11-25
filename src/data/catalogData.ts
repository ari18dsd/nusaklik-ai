import type { CustomerReview, Product, StoreSettings } from '../types/store';

export const LEGACY_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwHUTHcs4jdi7j0f2o_xmcbKqJenQKPcvF9Neqgq6MuYghQq-IPyd75C5LMZC2nInj6PQ/exec';

export const LEGACY_GOOGLE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdVyuHpMbOoUP74bXkGkascy1qSjv7mjceIPDv0NNAD4PDi3g/viewform?usp=publish-editor';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'NusaKlik.id',
  tagline: 'Temukan Ide, Wujudkan Karya.',
  heroTitle: 'Temukan Ide, Wujudkan Karya.',
  heroDescription:
    'Temukan e-book, template, panduan, dan berbagai produk digital untuk mendukung ide serta kreativitasmu.',
  promoText: '',
  showPromo: false,
  logoUrl: '',
  bannerUrl: '/src/assets/images/hero_nusaklik_banner_1795589594935.jpg',
  watermarkUrl: '',
  faviconUrl: '',
  qrisUrl: '',
  whatsappNumber: '',
  contactEmail: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountHolder: '',
  paymentInstructions:
    'Lakukan transfer sesuai nominal tepat pada total tagihan. Setelah membayar, unggah bukti pembayaran melalui halaman Konfirmasi Pembayaran agar dapat diverifikasi secara manual oleh admin.',
  footerDescription:
    'NusaKlik.id menghadirkan produk digital pilihan berupa e-book, template website, template bisnis, panduan praktis, materi edukasi, dan cerita anak berkualitas.',
  footerCopyright: '© 2026 NusaKlik.id. Seluruh hak cipta dilindungi.',
};

export const INITIAL_DEMO_PRODUCTS: Product[] = [
  {
    id: 'excel-dari-nol',
    title: 'Belajar Microsoft Excel dari Nol',
    slug: 'belajar-microsoft-excel-dari-nol',
    category: 'E-book',
    price: 29000,
    targetAudience: 'Pemula',
    shortDescription:
      'Panduan praktis untuk belajar Microsoft Excel dari dasar hingga mampu mengolah data sederhana.',
    fullDescription:
      'E-book Belajar Microsoft Excel dari Nol disusun khusus untuk pemula yang ingin memahami lembar kerja Excel secara sistematis. Materi dimulai dari pengenalan antarmuka, pengelolaan sel dan format angka, rumus dasar harian, hingga cara menyusun tabel laporan rapi dan grafik sederhana untuk kebutuhan kuliah maupun pekerjaan kantor.',
    benefits: [
      'Memahami logika dasar Excel tanpa istilah teknis yang membingungkan.',
      'Menguasai rumus wajib seperti SUM, AVERAGE, COUNT, IF, dan VLOOKUP dasar.',
      'Mampu merapikan data penjualan, absensi, dan anggaran pribadi secara mandiri.',
      'Dilengkapi langkah bertahap yang mudah dipraktikkan langsung.',
    ],
    contents: [
      'Bab 1: Mengenal Workbook, Sheet, Baris, dan Kolom',
      'Bab 2: Format Data, Rupiah, Tanggal, dan Kerapian Tabel',
      'Bab 3: Rumus Dasar Wajib untuk Pemula',
      'Bab 4: Mengurutkan & Menyaring Data (Sort & Filter)',
      'Bab 5: Membuat Grafik Sederhana & Cetak Dokumen Rapi',
    ],
    coverUrl: '/src/assets/images/product_excel_ebook_1795589596206.jpg',
    active: true,
    featured: true,
    isDemo: true,
    hasPrivateFile: false,
    source: 'firestore',
  },
  {
    id: 'template-web-profil-bisnis',
    title: 'Template Website Profil Bisnis Elegan',
    slug: 'template-website-profil-bisnis-elegan',
    category: 'Template Website',
    price: 79000,
    targetAudience: 'UMKM & Kreator',
    shortDescription:
      'Paket rancangan halaman profil usaha modern dengan tata letak bersih, responsif, dan siap disesuaikan.',
    fullDescription:
      'Template Website Profil Bisnis Elegan membantu pelaku UMKM, konsultan, maupun studio kreatif menghadirkan identitas daring yang meyakinkan tanpa harus menyusun layout dari nol. Struktur halaman dirancang agar calon klien langsung memahami layanan, portofolio, dan kontak Anda.',
    benefits: [
      'Tata letak responsif untuk tampilan desktop dan ponsel.',
      'Struktur bagian lengkap: Beranda, Layanan, Portofolio, Testimoni, dan Kontak.',
      'Mudah dimodifikasi sesuai warna dan tipografi brand Anda.',
    ],
    contents: [
      'Struktur Halaman Utama & Navigasi Responsif',
      'Komponen Kartu Layanan & Portofolio',
      'Panduan Penggantian Teks, Gambar, dan Warna Brand',
    ],
    coverUrl: '/src/assets/images/product_website_template_1795589597049.jpg',
    active: true,
    featured: true,
    isDemo: true,
    hasPrivateFile: false,
    source: 'firestore',
  },
  {
    id: 'paket-template-bisnis-umkm',
    title: 'Kit Template Operasional & Proposal Bisnis',
    slug: 'kit-template-operasional-proposal-bisnis',
    category: 'Template Bisnis',
    price: 49000,
    targetAudience: 'Pelaku Usaha & Freelancer',
    shortDescription:
      'Kumpulan template proposal penawaran, invoice rapi, dan pencatatan arus kas sederhana untuk usaha harian.',
    fullDescription:
      'Kelola administrasi usaha kecil dan pekerjaan lepas dengan lebih tertib. Kit ini berisi format proposal penawaran klien, surat perjanjian kerja sederhana, invoice tagihan profesional, serta lembar pantau pemasukan dan pengeluaran bulanan.',
    benefits: [
      'Mempercepat pembuatan proposal penawaran kepada klien baru.',
      'Tampilan dokumen keuangan lebih rapi dan mudah dibaca.',
      'Mengurangi kesalahan pencatatan transaksi harian.',
    ],
    contents: [
      'Template Proposal Penawaran Profesional',
      'Format Invoice & Kuitansi Siap Pakai',
      'Lembar Rekap Arus Kas Bulanan',
    ],
    coverUrl: '/src/assets/images/product_business_toolkit_1795589596693.jpg',
    active: true,
    featured: true,
    isDemo: true,
    hasPrivateFile: false,
    source: 'firestore',
  },
  {
    id: 'cerita-anak-perahu-nusantara',
    title: 'Seri Cerita Anak: Pelayaran Perahu Kertas Nusantara',
    slug: 'seri-cerita-anak-pelayaran-perahu-kertas-nusantara',
    category: 'Cerita Anak',
    price: 25000,
    targetAudience: 'Anak Usia 5–10 Tahun & Orang Tua',
    shortDescription:
      'Kisah bergambar penuh nilai keberanian, gotong royong, dan rasa ingin tahu untuk waktu membaca keluarga.',
    fullDescription:
      'Buku cerita anak digital bergambar hangat yang mengajak si kecil berpetualang menyusuri pulau-pulau Nusantara bersama perahu kertas bercahaya. Disusun dengan bahasa Indonesia yang santun, mudah dipahami, dan kaya pesan moral untuk dibacakan sebelum tidur.',
    benefits: [
      'Menumbuhkan minat baca anak sejak dini melalui ilustrasi tenang dan memikat.',
      'Mengajarkan nilai kerja sama, empati, dan mencintai alam Nusantara.',
      'Nyaman dibaca di tablet, laptop, maupun dicetak untuk aktivitas keluarga.',
    ],
    contents: [
      '12 Adegan Cerita Ilustrasi Penuh Warna',
      'Lembar Pertanyaan Refleksi Ringan untuk Orang Tua & Anak',
      'Bonus Halaman Aktivitas Mewarnai Sederhana',
    ],
    coverUrl: '/src/assets/images/product_kids_story_1795589597383.jpg',
    active: true,
    featured: false,
    isDemo: true,
    hasPrivateFile: false,
    source: 'firestore',
  },
];

export const INITIAL_DEMO_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-demo-1',
    customerName: 'Rina Kusuma (Contoh)',
    roleOrCity: 'Pembeli Produk Edukasi',
    avatarUrl: '',
    rating: 5,
    comment:
      'Contoh ulasan: Panduan disusun runtut dari dasar dan mudah diikuti untuk kebutuhan kerja harian.',
    dateLabel: 'Ulasan Contoh',
    visible: true,
    isDemo: true,
  },
  {
    id: 'rev-demo-2',
    customerName: 'Bagus Pratama (Contoh)',
    roleOrCity: 'Pelaku UMKM',
    avatarUrl: '',
    rating: 5,
    comment:
      'Contoh ulasan: Template operasional membantu menyiapkan dokumen penawaran usaha dengan lebih rapi.',
    dateLabel: 'Ulasan Contoh',
    visible: true,
    isDemo: true,
  },
  {
    id: 'rev-demo-3',
    customerName: 'Dian Pertiwi (Contoh)',
    roleOrCity: 'Orang Tua',
    avatarUrl: '',
    rating: 5,
    comment:
      'Contoh ulasan: Ilustrasi cerita anak terasa hangat dan nyaman dibaca bersama keluarga.',
    dateLabel: 'Ulasan Contoh',
    visible: true,
    isDemo: true,
  },
];
