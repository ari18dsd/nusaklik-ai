import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { DEFAULT_STORE_SETTINGS } from '../data/catalogData';
import { auth, googleProvider, testConnection } from '../lib/firebase';
import { checkIsAdminUser, fetchStoreSettings } from '../lib/firestoreService';
import type { CartItem, Product, StoreSettings } from '../types/store';

const CART_STORAGE_KEY = 'nusaklik_cart_v1';

interface ToastState {
  message: string;
  tone: 'info' | 'error';
}

interface StoreContextValue {
  authReady: boolean;
  user: User | null;
  isAdmin: boolean;
  settings: StoreSettings;
  refreshSettings: () => Promise<void>;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  signInAdminWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  toast: ToastState | null;
  showToast: (message: string, tone?: 'info' | 'error') => void;
  dismissToast: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

function loadStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.productId === 'string' &&
        typeof item.title === 'string' &&
        typeof item.price === 'number' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
    );
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [cart, setCart] = useState<CartItem[]>(() => loadStoredCart());
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, tone: 'info' | 'error' = 'info') => {
    setToast({ message, tone });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshSettings = useCallback(async () => {
    try {
      const loaded = await fetchStoreSettings();
      setSettings(loaded);
      if (loaded.faviconUrl) {
        const link =
          (document.querySelector("link[rel='icon']") as HTMLLinkElement | null) ||
          document.createElement('link');
        link.rel = 'icon';
        link.href = loaded.faviconUrl;
        document.head.appendChild(link);
      }
    } catch (err) {
      console.error('Failed loading store settings:', err);
    }
  }, []);

  useEffect(() => {
    testConnection().then(() => {
      refreshSettings();
    });

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const adminOk = await checkIsAdminUser(
          currentUser.uid,
          currentUser.email,
          currentUser.emailVerified
        );
        setIsAdmin(adminOk);
      } else {
        setIsAdmin(false);
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, [refreshSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota failure
    }
  }, [cart]);

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: Math.min(20, i.quantity + quantity), price: product.price }
              : i
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            title: product.title,
            category: product.category,
            price: product.price,
            coverUrl: product.coverUrl,
            quantity: Math.min(20, Math.max(1, quantity)),
            isDemo: product.isDemo,
          },
        ];
      });
      showToast(`"${product.title}" ditambahkan ke keranjang.`);
    },
    [showToast]
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.min(20, Math.round(quantity)) } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const signInAdminWithGoogle = useCallback(async (): Promise<boolean> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      const adminOk = await checkIsAdminUser(u.uid, u.email, u.emailVerified);
      setUser(u);
      setIsAdmin(adminOk);
      if (!adminOk) {
        await signOut(auth);
        setUser(null);
        setIsAdmin(false);
        showToast('Akun Google ini tidak terdaftar sebagai admin NusaKlik.id.', 'error');
        return false;
      }
      showToast('Berhasil masuk ke Ruang Admin NusaKlik.id.');
      return true;
    } catch (err) {
      console.error('Google sign-in error:', err);
      showToast('Proses masuk dengan Google dibatalkan atau gagal.', 'error');
      return false;
    }
  }, [showToast]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    showToast('Anda telah keluar dari sesi admin.');
  }, [showToast]);

  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart]
  );

  const value: StoreContextValue = {
    authReady,
    user,
    isAdmin,
    settings,
    refreshSettings,
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartSubtotal,
    signInAdminWithGoogle,
    signOutUser,
    toast,
    showToast,
    dismissToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
