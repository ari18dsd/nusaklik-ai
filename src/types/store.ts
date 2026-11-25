export type ProductCategory =
  | 'E-book'
  | 'Template Website'
  | 'Template Bisnis'
  | 'Panduan Praktis'
  | 'Produk Edukasi'
  | 'Cerita Anak'
  | 'Karya Digital';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'E-book',
  'Template Website',
  'Template Bisnis',
  'Panduan Praktis',
  'Produk Edukasi',
  'Cerita Anak',
  'Karya Digital',
];

export type OrderStatus =
  | 'Menunggu Pembayaran'
  | 'Menunggu Verifikasi'
  | 'Dibayar'
  | 'Ditolak'
  | 'Selesai'
  | 'Dibatalkan';

export type PaymentMethod = 'Transfer Bank' | 'QRIS';

export interface Product {
  id: string;
  title: string;
  slug: string;
  category: ProductCategory;
  price: number;
  targetAudience?: string;
  shortDescription: string;
  fullDescription: string;
  benefits?: string[];
  contents?: string[];
  coverUrl: string;
  active: boolean;
  featured: boolean;
  isDemo: boolean;
  hasPrivateFile: boolean;
  source?: 'firestore' | 'sheets_import';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProductFileMeta {
  productId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  updatedAt?: unknown;
}

export interface CartItem {
  productId: string;
  title: string;
  category: ProductCategory;
  price: number;
  coverUrl: string;
  quantity: number;
  isDemo: boolean;
}

export interface OrderItem {
  productId: string;
  title: string;
  category: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  isDemo: boolean;
}

export interface DownloadGrant {
  productId: string;
  productTitle: string;
  tokenId: string;
  fileName: string;
}

export interface OrderRecord {
  orderCode: string;
  buyerUid: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  totalAmount: number;
  status: OrderStatus;
  accessKeyHash: string;
  serverSignature: string;
  adminNote?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderReceipt {
  orderCode: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  totalAmount: number;
  itemSummaries: OrderItem[];
  accessKeyHash: string;
  proofUrl?: string;
  downloadGrants?: DownloadGrant[];
  adminNote?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomerReview {
  id: string;
  customerName: string;
  roleOrCity?: string;
  avatarUrl?: string;
  rating: number;
  comment: string;
  dateLabel: string;
  visible: boolean;
  isDemo: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  heroTitle: string;
  heroDescription: string;
  promoText?: string;
  showPromo?: boolean;
  logoUrl?: string;
  bannerUrl?: string;
  watermarkUrl?: string;
  faviconUrl?: string;
  qrisUrl?: string;
  whatsappNumber: string;
  contactEmail: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  paymentInstructions?: string;
  footerDescription?: string;
  footerCopyright?: string;
  updatedAt?: unknown;
}

export interface LegacySheetProduct {
  id: string;
  title: string;
  category: ProductCategory;
  price: number;
  shortDescription: string;
  fullDescription: string;
  coverUrl: string;
  active: boolean;
  raw?: Record<string, unknown>;
}
