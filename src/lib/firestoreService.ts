import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  DEFAULT_STORE_SETTINGS,
  INITIAL_DEMO_PRODUCTS,
  INITIAL_DEMO_REVIEWS,
} from '../data/catalogData';
import type {
  CustomerReview,
  DownloadGrant,
  OrderItem,
  OrderReceipt,
  OrderRecord,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductFileMeta,
  StoreSettings,
} from '../types/store';
import { BOOTSTRAP_ADMIN_EMAIL, db, handleFirestoreError, OperationType } from './firebase';

export async function checkIsAdminUser(
  uid: string,
  email: string | null,
  emailVerified: boolean
): Promise<boolean> {
  if (!emailVerified) return false;
  if (email === BOOTSTRAP_ADMIN_EMAIL) return true;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const path = 'settings/store';
  try {
    const snap = await getDoc(doc(db, 'settings', 'store'));
    if (snap.exists()) {
      return { ...DEFAULT_STORE_SETTINGS, ...(snap.data() as StoreSettings) };
    }
    return DEFAULT_STORE_SETTINGS;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveStoreSettingsAdmin(settings: StoreSettings): Promise<void> {
  const path = 'settings/store';
  try {
    const payload = {
      storeName: (settings.storeName || 'NusaKlik.id').trim().slice(0, 100),
      tagline: (settings.tagline || '').trim().slice(0, 180),
      heroTitle: (settings.heroTitle || '').trim().slice(0, 160),
      heroDescription: (settings.heroDescription || '').trim().slice(0, 500),
      promoText: (settings.promoText || '').trim().slice(0, 200),
      showPromo: Boolean(settings.showPromo),
      logoUrl: (settings.logoUrl || '').trim().slice(0, 500),
      bannerUrl: (settings.bannerUrl || '').trim().slice(0, 500),
      watermarkUrl: (settings.watermarkUrl || '').trim().slice(0, 500),
      faviconUrl: (settings.faviconUrl || '').trim().slice(0, 500),
      qrisUrl: (settings.qrisUrl || '').trim().slice(0, 500),
      whatsappNumber: (settings.whatsappNumber || '').trim().slice(0, 30),
      contactEmail: (settings.contactEmail || '').trim().slice(0, 160),
      bankName: (settings.bankName || '').trim().slice(0, 80),
      bankAccountNumber: (settings.bankAccountNumber || '').trim().slice(0, 60),
      bankAccountHolder: (settings.bankAccountHolder || '').trim().slice(0, 120),
      paymentInstructions: (settings.paymentInstructions || '').trim().slice(0, 1000),
      footerDescription: (settings.footerDescription || '').trim().slice(0, 400),
      footerCopyright: (settings.footerCopyright || '').trim().slice(0, 160),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'settings', 'store'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchActiveProducts(): Promise<{
  products: Product[];
  fromFirestore: boolean;
}> {
  const path = 'products';
  try {
    const q = query(collection(db, 'products'), where('active', '==', true), limit(100));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { products: INITIAL_DEMO_PRODUCTS, fromFirestore: false };
    }
    const products = snap.docs.map((d) => d.data() as Product);
    return { products, fromFirestore: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllProductsAdmin(): Promise<Product[]> {
  const path = 'products';
  try {
    const snap = await getDocs(query(collection(db, 'products'), limit(200)));
    return snap.docs.map((d) => d.data() as Product);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchProductById(productId: string): Promise<Product | null> {
  const path = `products/${productId}`;
  try {
    const snap = await getDoc(doc(db, 'products', productId));
    if (snap.exists()) {
      return snap.data() as Product;
    }
    const demo = INITIAL_DEMO_PRODUCTS.find((p) => p.id === productId);
    return demo || null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveProductAdmin(product: Product, isNew: boolean): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const existingSnap = isNew ? null : await getDoc(doc(db, 'products', product.id));
    const existingCreatedAt = existingSnap?.exists()
      ? existingSnap.data().createdAt
      : serverTimestamp();

    const payload = {
      id: product.id,
      title: product.title.trim().slice(0, 160),
      slug: product.slug.trim().slice(0, 180),
      category: product.category,
      price: Math.max(0, Math.round(Number(product.price) || 0)),
      targetAudience: (product.targetAudience || '').trim().slice(0, 100),
      shortDescription: product.shortDescription.trim().slice(0, 320),
      fullDescription: product.fullDescription.trim().slice(0, 4000),
      benefits: (product.benefits || [])
        .slice(0, 15)
        .map((b) => String(b).trim().slice(0, 300))
        .filter(Boolean),
      contents: (product.contents || [])
        .slice(0, 20)
        .map((c) => String(c).trim().slice(0, 300))
        .filter(Boolean),
      coverUrl: product.coverUrl.trim().slice(0, 1000),
      active: Boolean(product.active),
      featured: Boolean(product.featured),
      isDemo: Boolean(product.isDemo),
      hasPrivateFile: Boolean(product.hasPrivateFile),
      source: product.source || 'firestore',
      createdAt: existingCreatedAt,
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'products', product.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProductAdmin(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
    try {
      await deleteDoc(doc(db, 'product_files', productId));
    } catch {
      // ignore if no private file record existed
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchAllProductFilesAdmin(): Promise<Record<string, ProductFileMeta>> {
  const path = 'product_files';
  try {
    const snap = await getDocs(collection(db, 'product_files'));
    const map: Record<string, ProductFileMeta> = {};
    for (const d of snap.docs) {
      const data = d.data() as ProductFileMeta;
      map[data.productId] = data;
    }
    return map;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveProductFileAdmin(meta: ProductFileMeta): Promise<void> {
  const path = `product_files/${meta.productId}`;
  try {
    await setDoc(doc(db, 'product_files', meta.productId), {
      productId: meta.productId,
      fileId: meta.fileId,
      fileName: meta.fileName.slice(0, 256),
      mimeType: meta.mimeType.slice(0, 120),
      sizeBytes: meta.sizeBytes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProductFileAdmin(productId: string): Promise<void> {
  const path = `product_files/${productId}`;
  try {
    await deleteDoc(doc(db, 'product_files', productId));
    const prodRef = doc(db, 'products', productId);
    const prodSnap = await getDoc(prodRef);
    if (prodSnap.exists()) {
      await updateDoc(prodRef, {
        hasPrivateFile: false,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchVisibleReviews(): Promise<{
  reviews: CustomerReview[];
  fromFirestore: boolean;
}> {
  const path = 'reviews';
  try {
    const q = query(collection(db, 'reviews'), where('visible', '==', true), limit(30));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { reviews: INITIAL_DEMO_REVIEWS, fromFirestore: false };
    }
    return { reviews: snap.docs.map((d) => d.data() as CustomerReview), fromFirestore: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllReviewsAdmin(): Promise<CustomerReview[]> {
  const path = 'reviews';
  try {
    const snap = await getDocs(query(collection(db, 'reviews'), limit(100)));
    return snap.docs.map((d) => d.data() as CustomerReview);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveReviewAdmin(review: CustomerReview, isNew: boolean): Promise<void> {
  const path = `reviews/${review.id}`;
  try {
    const existingSnap = isNew ? null : await getDoc(doc(db, 'reviews', review.id));
    const existingCreatedAt = existingSnap?.exists()
      ? existingSnap.data().createdAt
      : serverTimestamp();

    await setDoc(doc(db, 'reviews', review.id), {
      id: review.id,
      customerName: review.customerName.trim().slice(0, 100),
      roleOrCity: (review.roleOrCity || '').trim().slice(0, 100),
      avatarUrl: (review.avatarUrl || '').trim().slice(0, 500),
      rating: Math.min(5, Math.max(1, Math.round(Number(review.rating) || 5))),
      comment: review.comment.trim().slice(0, 1000),
      dateLabel: review.dateLabel.trim().slice(0, 60),
      visible: Boolean(review.visible),
      isDemo: Boolean(review.isDemo),
      createdAt: existingCreatedAt,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteReviewAdmin(reviewId: string): Promise<void> {
  const path = `reviews/${reviewId}`;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createOrderAndReceipt(params: {
  orderCode: string;
  buyerUid: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  totalAmount: number;
  accessKeyHash: string;
  serverSignature: string;
}): Promise<void> {
  const path = `orders/${params.orderCode}`;
  try {
    const batch = writeBatch(db);
    const nowTs = serverTimestamp();

    batch.set(doc(db, 'orders', params.orderCode), {
      orderCode: params.orderCode,
      buyerUid: params.buyerUid,
      customerName: params.customerName.trim().slice(0, 120),
      customerEmail: params.customerEmail.trim().slice(0, 180),
      customerWhatsapp: params.customerWhatsapp.trim().slice(0, 30),
      paymentMethod: params.paymentMethod,
      items: params.items,
      subtotal: params.subtotal,
      totalAmount: params.totalAmount,
      status: 'Menunggu Pembayaran',
      accessKeyHash: params.accessKeyHash,
      serverSignature: params.serverSignature,
      createdAt: nowTs,
      updatedAt: nowTs,
    });

    batch.set(doc(db, 'order_receipts', params.orderCode), {
      orderCode: params.orderCode,
      status: 'Menunggu Pembayaran',
      paymentMethod: params.paymentMethod,
      subtotal: params.subtotal,
      totalAmount: params.totalAmount,
      itemSummaries: params.items,
      accessKeyHash: params.accessKeyHash,
      proofUrl: '',
      downloadGrants: [],
      createdAt: nowTs,
      updatedAt: nowTs,
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchOrderReceipt(orderCode: string): Promise<OrderReceipt | null> {
  const path = `order_receipts/${orderCode}`;
  try {
    const snap = await getDoc(doc(db, 'order_receipts', orderCode));
    return snap.exists() ? (snap.data() as OrderReceipt) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function submitOrderProofToReceipt(
  orderCode: string,
  proofUrl: string
): Promise<void> {
  const path = `order_receipts/${orderCode}`;
  try {
    await updateDoc(doc(db, 'order_receipts', orderCode), {
      proofUrl,
      status: 'Menunggu Verifikasi',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchAllOrdersAdmin(): Promise<{
  orders: OrderRecord[];
  receipts: Record<string, OrderReceipt>;
}> {
  const path = 'orders';
  try {
    const snap = await getDocs(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(200))
    );
    const orders = snap.docs.map((d) => d.data() as OrderRecord);

    const receipts: Record<string, OrderReceipt> = {};
    await Promise.all(
      orders.map(async (ord) => {
        try {
          const rSnap = await getDoc(doc(db, 'order_receipts', ord.orderCode));
          if (rSnap.exists()) {
            receipts[ord.orderCode] = rSnap.data() as OrderReceipt;
          }
        } catch {
          // ignore missing receipt
        }
      })
    );

    return { orders, receipts };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateOrderStatusAdmin(params: {
  order: OrderRecord;
  receipt?: OrderReceipt;
  newStatus: OrderStatus;
  adminNote: string;
  productFiles: Record<string, ProductFileMeta>;
}): Promise<void> {
  const { order, receipt, newStatus, adminNote, productFiles } = params;
  const path = `orders/${order.orderCode}`;
  try {
    const batch = writeBatch(db);
    const nowTs = serverTimestamp();

    const downloadGrants: DownloadGrant[] = receipt?.downloadGrants
      ? [...receipt.downloadGrants]
      : [];

    const isApprovedStatus = newStatus === 'Dibayar' || newStatus === 'Selesai';

    if (downloadGrants.length > 0) {
      await Promise.all(
        downloadGrants.map(async (grant) => {
          if (!grant?.tokenId) return;
          const tokenRef = doc(db, 'download_tokens', grant.tokenId);
          const tokenSnap = await getDoc(tokenRef);
          if (tokenSnap.exists()) {
            batch.update(tokenRef, { enabled: isApprovedStatus });
          }
        })
      );
    }

    if (isApprovedStatus) {
      for (const item of order.items) {
        const fileMeta = productFiles[item.productId];
        const alreadyGranted = downloadGrants.some((g) => g.productId === item.productId);
        if (fileMeta && !alreadyGranted) {
          const tokenId = `dt_${crypto.randomUUID().replace(/-/g, '')}`;
          batch.set(doc(db, 'download_tokens', tokenId), {
            tokenId,
            orderCode: order.orderCode,
            productId: item.productId,
            productTitle: item.title.slice(0, 180),
            fileId: fileMeta.fileId,
            fileName: fileMeta.fileName,
            enabled: true,
            createdAt: nowTs,
          });
          downloadGrants.push({
            productId: item.productId,
            productTitle: item.title.slice(0, 180),
            tokenId,
            fileName: fileMeta.fileName,
          });
        }
      }
    }

    batch.update(doc(db, 'orders', order.orderCode), {
      status: newStatus,
      adminNote: adminNote.trim().slice(0, 500),
      updatedAt: nowTs,
    });

    if (receipt) {
      batch.update(doc(db, 'order_receipts', order.orderCode), {
        status: newStatus,
        adminNote: adminNote.trim().slice(0, 500),
        downloadGrants,
        updatedAt: nowTs,
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Idempotent Firestore seeding: ONLY creates documents that do not already exist.
 * Never overwrites existing products, reviews, or store settings.
 */
export async function seedInitialCatalogToFirestore(): Promise<{
  createdProducts: number;
  createdReviews: number;
  createdSettings: boolean;
}> {
  const path = 'products';
  try {
    const batch = writeBatch(db);
    const nowTs = serverTimestamp();
    let createdProducts = 0;
    let createdReviews = 0;
    let createdSettings = false;

    for (const p of INITIAL_DEMO_PRODUCTS) {
      const ref = doc(db, 'products', p.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        batch.set(ref, {
          ...p,
          createdAt: nowTs,
          updatedAt: nowTs,
        });
        createdProducts += 1;
      }
    }

    for (const r of INITIAL_DEMO_REVIEWS) {
      const ref = doc(db, 'reviews', r.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        batch.set(ref, {
          ...r,
          createdAt: nowTs,
          updatedAt: nowTs,
        });
        createdReviews += 1;
      }
    }

    const settingsRef = doc(db, 'settings', 'store');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      batch.set(settingsRef, {
        ...DEFAULT_STORE_SETTINGS,
        updatedAt: nowTs,
      });
      createdSettings = true;
    }

    if (createdProducts > 0 || createdReviews > 0 || createdSettings) {
      await batch.commit();
    }

    return { createdProducts, createdReviews, createdSettings };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
