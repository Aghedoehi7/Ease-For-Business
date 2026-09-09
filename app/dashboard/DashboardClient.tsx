'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, AlertCircle, Package, TrendingUp } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { hydrateAuthStore, useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatCurrency } from '@/lib/utils';

type ExpenseSummary = {
  total: number;
  count: number;
  latest?: {
    amount: number;
    category: string;
    createdAt: string;
  } | null;
};

type Props = {
  user?: {
    userId: string;
    email: string;
  } | null;
};

export default function DashboardClient({ user }: Props) {
  const [currentUser, setCurrentUser] = useState(user);
  const [authChecked, setAuthChecked] = useState(false);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary>({
    total: 0,
    count: 0,
    latest: null,
  });
  const authUser = useAuthStore((state) => state.user);
  const { emailNotifications, lowStockAlerts } = useSettingsStore((state) => state.settings);
  const { products, loading, loadProducts, getTotalInventoryValue, getLowStockItems } = useInventoryStore();
  const stats = useMemo(() => {
    const lowStock = getLowStockItems();
    const totalValue = getTotalInventoryValue();
    const avgValue = products.length > 0 ? totalValue / products.length : 0;

    return {
      totalProducts: products.length,
      lowStockItems: lowStock.length,
      totalValue,
      avgProductValue: avgValue,
    };
  }, [products, getTotalInventoryValue, getLowStockItems]);

  const router = useRouter();

  useEffect(() => {
    hydrateAuthStore();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setAuthChecked(true);
      return;
    }

    if (authUser?.id && authUser?.email) {
      setCurrentUser({ userId: authUser.id, email: authUser.email });
    }

    setAuthChecked(true);
  }, [authUser, currentUser]);

  useEffect(() => {
    if (!authChecked) return;
    if (!currentUser) {
      router.replace('/auth/signin');
    }
  }, [authChecked, currentUser, router]);

  useEffect(() => {
    if (currentUser) {
      loadProducts();

      fetch('/api/expenses?range=month', { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          const expenses = Array.isArray(data) ? data : [];
          const total = expenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0);
          setExpenseSummary({
            total,
            count: expenses.length,
            latest: expenses[0]
              ? {
                  amount: expenses[0].amount,
                  category: expenses[0].category,
                  createdAt: expenses[0].createdAt,
                }
              : null,
          });
        })
        .catch((error) => {
          console.error('Failed to load expense summary:', error);
        });
    }
  }, [loadProducts, currentUser]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const recentProducts = products.slice(-5).reverse();

  const handleAddProduct = () => {
    router.push('/inventory?action=add');
  };

  const handleViewInventory = () => {
    router.push('/inventory');
  };

  const handleViewExpenses = () => {
    router.push('/expenses');
  };

  const handleGenerateReport = () => {
    router.push('/reports');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {currentUser.email}. Here&apos;s your business overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              label: 'Total Products',
              value: stats.totalProducts,
              icon: Package,
              color: 'from-blue-600 to-blue-800'
            },
            {
              label: 'Low Stock Items',
              value: stats.lowStockItems,
              icon: AlertCircle,
              color: 'from-red-600 to-red-800',
              highlight: stats.lowStockItems > 0
            },
            {
              label: 'Inventory Value',
              value: formatCurrency(stats.totalValue),
              icon: TrendingUp,
              color: 'from-green-600 to-green-800'
            },
            {
              label: 'Avg Product Value',
              value: formatCurrency(stats.avgProductValue),
              icon: BarChart3,
              color: 'from-orange-600 to-orange-800'
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`bg-gradient-to-br ${stat.color} text-white rounded-lg shadow-lg p-6 ${
                  stat.highlight ? 'ring-2 ring-red-300' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <Icon size={40} className="opacity-50" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Products */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">Recent Products</h2>
            {recentProducts.length > 0 ? (
              <div className="space-y-4">
                {recentProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">Stock: {product.quantity}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(product.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No products yet. Start by adding your first product.</p>
            )}
          </div>

          {/* Expense Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">Expense Summary</h2>
            <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-sm font-medium text-orange-700">This month</p>
              <p className="mt-3 text-3xl font-bold text-orange-900">
                {formatCurrency(expenseSummary.total)}
              </p>
              <p className="mt-2 text-sm text-gray-600">{expenseSummary.count} expense{expenseSummary.count !== 1 ? 's' : ''}</p>
              {expenseSummary.latest ? (
                <p className="mt-4 text-sm text-gray-700">
                  Latest: {expenseSummary.latest.category} • {formatCurrency(expenseSummary.latest.amount)}
                </p>
              ) : (
                <p className="mt-4 text-sm text-gray-700">No expenses logged this month.</p>
              )}
              <button
                onClick={handleViewExpenses}
                className="mt-6 w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-orange-700 shadow-sm hover:bg-orange-50 transition-colors"
              >
                View Full Expenses
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handleAddProduct}
                className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Add Product
              </button>
              <button
                onClick={handleViewInventory}
                className="w-full border-2 border-orange-600 text-orange-600 py-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors font-medium"
              >
                View Inventory
              </button>
              <button
                onClick={handleViewExpenses}
                className="w-full border-2 border-orange-600 text-orange-600 py-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors font-medium"
              >
                View Expenses
              </button>
              <button
                onClick={handleGenerateReport}
                className="w-full border-2 border-orange-600 text-orange-600 py-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors font-medium"
              >
                Generate Report
              </button>
              <button
                onClick={handleSettings}
                className="w-full border-2 border-orange-600 text-orange-600 py-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors font-medium"
              >
                Settings
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                {emailNotifications ? 'Email notifications are enabled.' : 'Email notifications are disabled.'}
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                {emailNotifications
                  ? 'You will receive product and report updates when relevant events occur.'
                  : 'Email updates are turned off in settings. You can still view notifications inside the app.'}
              </p>
            </div>

            {lowStockAlerts ? (
              stats.lowStockItems > 0 && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200 font-semibold">
                    ⚠️ {stats.lowStockItems} product{stats.lowStockItems !== 1 ? 's' : ''} running low on stock!
                  </p>
                </div>
              )
            ) : (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold">
                  Low stock alerts are disabled in settings. Enable them on the Settings page to see warnings here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
