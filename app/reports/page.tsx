'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Package, TrendingUp, Download } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatCurrency } from '@/lib/utils';

type ReportRange = 'today' | 'week' | 'month' | 'all';

type ProfitRecord = {
  date: string;
  salesTotal: number;
  expenseTotal: number;
  profit: number;
};

type ProfitReport = {
  totalSales: number;
  totalExpenses: number;
  profit: number;
  dailyRecords: ProfitRecord[];
};

function generateCSV(products: any[]) {
  const headers = ['Product Name', 'SKU', 'Category', 'Price', 'Quantity', 'Total Value'];
  const rows = products.map((p) => [
    `"${p.name}"`,
    `"${p.sku}"`,
    `"${p.category || 'N/A'}"`,
    p.price.toFixed(2),
    p.quantity,
    (p.price * p.quantity).toFixed(2),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
    '',
    'Generated on: ' + new Date().toISOString(),
  ].join('\n');

  return csvContent;
}

function generateProfitCSV(report: ProfitReport) {
  const headers = ['Date', 'Sales', 'Expenses', 'Profit'];
  const rows = report.dailyRecords.map((record) => [
    `"${record.date}"`,
    record.salesTotal.toFixed(2),
    record.expenseTotal.toFixed(2),
    record.profit.toFixed(2),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
    '',
    `Total Sales,${report.totalSales.toFixed(2)}`,
    `Total Expenses,${report.totalExpenses.toFixed(2)}`,
    `Net Profit,${report.profit.toFixed(2)}`,
    'Generated on: ' + new Date().toISOString(),
  ].join('\n');

  return csvContent;
}

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ReportsPage() {
  const { products, loadProducts, getTotalInventoryValue, getLowStockItems } = useInventoryStore();
  const { lowStockAlerts } = useSettingsStore((state) => state.settings);
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [reportRange, setReportRange] = useState<ReportRange>('month');
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    async function fetchReport() {
      setLoadingReport(true);
      setReportError(null);

      try {
        const query = reportRange === 'all' ? '' : `?range=${reportRange}`;
        const response = await fetch(`/api/reports${query}`, { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Unable to load report');
        }

        const data: ProfitReport = await response.json();
        setReport(data);
      } catch (error) {
        console.error('Fetch report error:', error);
        setReportError('Unable to load profit report.');
      } finally {
        setLoadingReport(false);
      }
    }

    fetchReport();
  }, [reportRange]);

  const lowStockItems = getLowStockItems();
  const totalValue = getTotalInventoryValue();

  const rangeOptions: { value: ReportRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'This month' },
    { value: 'all', label: 'All time' },
  ];

  const profitPositive = report ? report.profit >= 0 : true;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-2">Generate a summary of your inventory, sales, expenses and net profit.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-orange-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              Print Report
            </button>
            <button
              type="button"
              onClick={() => {
                const csv = generateCSV(products);
                downloadCSV(csv, `inventory-report-${new Date().toISOString().split('T')[0]}.csv`);
              }}
              className="border border-orange-600 text-orange-600 px-5 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <Download size={20} />
              Inventory CSV
            </button>
            <button
              type="button"
              onClick={() => {
                if (!report) return;
                const csv = generateProfitCSV(report);
                downloadCSV(csv, `profit-report-${reportRange}-${new Date().toISOString().split('T')[0]}.csv`);
              }}
              disabled={!report || loadingReport}
              className="border border-orange-600 text-orange-600 px-5 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              <Download size={20} />
              Profit CSV
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 mb-8 border border-gray-200 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Daily profit report</h2>
              <p className="text-gray-600 dark:text-slate-300 mt-1">Review sales, expenses, and net profit for the selected time range.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {rangeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReportRange(option.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    reportRange === option.value
                      ? 'bg-orange-600 text-white'
                      : 'border border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-gray-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Total sales</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{report ? formatCurrency(report.totalSales) : '–'}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Total expenses</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{report ? formatCurrency(report.totalExpenses) : '–'}</p>
            </div>
            <div className={`rounded-xl border p-5 ${profitPositive ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
              <p className="text-sm text-gray-500">Net profit</p>
              <p className={`mt-2 text-3xl font-semibold ${profitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                {report ? formatCurrency(report.profit) : '–'}
              </p>
            </div>
          </div>

          {reportError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">{reportError}</div>
          ) : loadingReport ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-gray-600">Loading profit report…</div>
          ) : report ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Sales</th>
                    <th className="px-4 py-3 font-medium">Expenses</th>
                    <th className="px-4 py-3 font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.dailyRecords.length > 0 ? (
                    report.dailyRecords.map((record) => (
                      <tr key={record.date} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-gray-900">{record.date}</td>
                        <td className="px-4 py-4 text-gray-900">{formatCurrency(record.salesTotal)}</td>
                        <td className="px-4 py-4 text-gray-900">{formatCurrency(record.expenseTotal)}</td>
                        <td className={`px-4 py-4 font-semibold ${record.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatCurrency(record.profit)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        No sales or expenses found for this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Package className="text-orange-600" size={28} />
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Total products</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{products.length}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">Number of unique products currently in your inventory.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-green-600" size={28} />
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Inventory value</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(totalValue)}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">Estimated total stock value based on current quantity and unit price.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-600" size={28} />
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Low stock alerts</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{lowStockAlerts ? lowStockItems.length : 'Disabled'}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {lowStockAlerts ? 'Products with a quantity below your low stock threshold.' : 'Low stock alerts are disabled in Settings.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Top stock levels</h2>
            {products.length > 0 ? (
              <div className="space-y-4">
                {[...products]
                  .sort((a, b) => b.quantity - a.quantity)
                  .slice(0, 3)
                  .map((product) => (
                    <div key={product.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      </div>
                      <p className="text-right text-orange-600 font-semibold">{product.quantity} in stock</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-600">No inventory data yet. Add products to generate a report.</p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Report notes</h2>
            <ul className="space-y-3 text-gray-600 dark:text-slate-300">
              <li>• Use this page to review inventory value and low-stock risks.</li>
              <li>• Print the page for a quick physical report.</li>
              <li>• Download support is included as a placeholder for CSV export.</li>
              <li>• Best used after adding your latest products and stock changes.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
