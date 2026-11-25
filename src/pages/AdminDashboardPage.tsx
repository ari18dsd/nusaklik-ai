import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MessageSquareQuote,
  Package,
  Settings,
  ShoppingCart,
} from 'lucide-react';
import { AdminOrdersTab } from '../components/admin/AdminOrdersTab';
import { AdminOverviewTab } from '../components/admin/AdminOverviewTab';
import { AdminProductsTab } from '../components/admin/AdminProductsTab';
import { AdminReviewsTab } from '../components/admin/AdminReviewsTab';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab';
import { useStore } from '../context/StoreContext';
import {
  fetchAllOrdersAdmin,
  fetchAllProductFilesAdmin,
  fetchAllProductsAdmin,
  fetchAllReviewsAdmin,
} from '../lib/firestoreService';
import type {
  CustomerReview,
  OrderReceipt,
  OrderRecord,
  Product,
  ProductFileMeta,
} from '../types/store';

type AdminTab = 'overview' | 'products' | 'orders' | 'reviews' | 'settings';

export function AdminDashboardPage() {
  const {
    authReady,
    user,
    isAdmin,
    settings,
    refreshSettings,
    signOutUser,
    toast,
    showToast,
    dismissToast,
  } = useStore();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [productFiles, setProductFiles] = useState<Record<string, ProductFileMeta>>({});
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [receipts, setReceipts] = useState<Record<string, OrderReceipt>>({});
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, files, ordRes, revs] = await Promise.all([
        fetchAllProductsAdmin(),
        fetchAllProductFilesAdmin(),
        fetchAllOrdersAdmin(),
        fetchAllReviewsAdmin(),
      ]);
      setProducts(prods);
      setProductFiles(files);
      setOrders(ordRes.orders);
      setReceipts(ordRes.receipts);
      setReviews(revs);
    } catch (err) {
      console.error('Admin load error:', err);
      showToast('Sebagian data admin gagal dimuat.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (authReady && user && isAdmin) {
      loadAdminData();
    }
  }, [authReady, user, isAdmin, loadAdminData]);

  const getIdToken = async (): Promise<string> => {
    if (!user) throw new Error('Sesi pengguna tidak ditemukan.');
    return user.getIdToken();
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] flex items-center justify-center text-sm text-[#244A83]">
        Memverifikasi sesi admin...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'products', label: 'Kelola Produk', icon: Package },
    { id: 'orders', label: 'Kelola Pesanan', icon: ShoppingCart },
    { id: 'reviews', label: 'Kelola Ulasan', icon: MessageSquareQuote },
    { id: 'settings', label: 'Pengaturan Toko', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FB] text-[#292D35] flex flex-col lg:flex-row">
      {/* Sidebar Royal Blue */}
      <aside className="lg:w-64 bg-[#244A83] text-white shrink-0 flex flex-col">
        <div className="px-6 py-5 border-b border-[#5686C5]/30 flex items-center justify-between">
          <div>
            <span className="font-editorial text-xl font-bold text-white block">
              {settings.storeName || 'NusaKlik.id'}
            </span>
            <span className="text-xs text-[#E9C477] font-medium">Ruang Admin</span>
          </div>
          <Link
            to="/"
            title="Lihat Toko Publik"
            className="p-2 rounded-lg text-[#DCE8F6] hover:bg-[#5686C5]/30"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#1D3B69] text-[#E9C477] font-semibold'
                    : 'text-white/90 hover:bg-[#5686C5]/30 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-[#5686C5]/30 hidden lg:block space-y-3">
          <div className="text-xs text-[#DCE8F6] truncate">
            <p className="font-semibold text-white truncate">{user.displayName || 'Admin'}</p>
            <p className="truncate opacity-80">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={signOutUser}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#1D3B69] text-xs font-semibold text-[#E9C477] hover:bg-[#5686C5]/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Cloud White Workspace */}
      <div className="flex-1 min-w-0">
        {toast && (
          <div
            role="status"
            onClick={dismissToast}
            className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer ${
              toast.tone === 'error'
                ? 'bg-[#292D35] text-[#E9C477]'
                : 'bg-[#244A83] text-white'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <span className="text-xs text-[#292D35]/70 truncate">{user.email}</span>
            <button
              type="button"
              onClick={signOutUser}
              className="text-xs font-semibold text-[#244A83] underline"
            >
              Keluar
            </button>
          </div>

          {loading ? (
            <div className="bg-white border border-[#DCE8F6] rounded-2xl p-10 text-center text-sm text-[#244A83]">
              Memuat data operasional NusaKlik.id...
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <AdminOverviewTab
                  products={products}
                  orders={orders}
                  receipts={receipts}
                  settings={settings}
                  getIdToken={getIdToken}
                  onRefresh={loadAdminData}
                  showToast={showToast}
                />
              )}
              {tab === 'products' && (
                <AdminProductsTab
                  products={products}
                  productFiles={productFiles}
                  getIdToken={getIdToken}
                  onRefresh={loadAdminData}
                  showToast={showToast}
                />
              )}
              {tab === 'orders' && (
                <AdminOrdersTab
                  orders={orders}
                  receipts={receipts}
                  productFiles={productFiles}
                  getIdToken={getIdToken}
                  onRefresh={loadAdminData}
                  showToast={showToast}
                />
              )}
              {tab === 'reviews' && (
                <AdminReviewsTab
                  reviews={reviews}
                  getIdToken={getIdToken}
                  onRefresh={loadAdminData}
                  showToast={showToast}
                />
              )}
              {tab === 'settings' && (
                <AdminSettingsTab
                  settings={settings}
                  getIdToken={getIdToken}
                  onRefreshSettings={refreshSettings}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
