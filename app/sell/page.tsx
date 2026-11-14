'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Minus, X, CheckCircle, Printer, Download, Pencil } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { Product, ReceiptItem } from '@/types';
import { generatePDFReceipt, normalizeReceiptItems } from '@/lib/receipt';

const paymentMethods = ['cash', 'transfer', 'pos', 'credit'] as const;

type PaymentMethod = (typeof paymentMethods)[number];

type SaleLine = {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  total?: number;
  costPrice?: number | null;
  costOfGoodsSold?: number | null;
  grossProfit?: number | null;
};

type SaleRecord = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  costOfGoodsSold: number | null;
  grossProfit: number | null;
  items: SaleLine[] | null;
};

export default function SellPage() {
  const { products, loadProducts } = useInventoryStore();
  const authUser = useAuthStore((state) => state.user);
  const {
    items,
    loading,
    paymentMethod,
    addItem,
    removeItem,
    updateQuantity,
    updatePrice,
    setPaymentMethod,
    confirmSale,
    getTotalItems,
    getTotalPrice,
  } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState<any | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState(1);
  const [addedItem, setAddedItem] = useState<string | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [saleHistoryError, setSaleHistoryError] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [editingSaleItems, setEditingSaleItems] = useState<SaleLine[]>([]);
  const [savingSaleEdit, setSavingSaleEdit] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const loadSales = useCallback(async () => {
    try {
      const response = await fetch('/api/transactions?limit=20', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load sales history');
      const data = await response.json();
      setSales(data.transactions.filter((transaction: SaleRecord) => transaction.type === 'out'));
      setSaleHistoryError(null);
    } catch (error) {
      console.error('Failed to load sales history:', error);
      setSaleHistoryError('Unable to load sales history.');
    }
  }, []);

  useEffect(() => {
    loadProducts();
    void loadSales();
  }, [loadProducts, loadSales]);

  const recentProducts = products.slice(0, 10);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProductTap = (product: Product) => {
    addItem(product);
    setAddedItem(product.id);
    setTimeout(() => setAddedItem(null), 500);
  };

  const handleProductLongPress = (product: Product) => {
    setSelectedProduct(product);
    setQuantityInput(1);
    setShowQuantityModal(true);
  };

  const handleTouchStart = (product: Product) => {
    longPressTimer.current = setTimeout(() => handleProductLongPress(product), 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleCompleteSale = () => {
    if (items.length === 0) return;
    setSaleError(null);
    setShowPaymentModal(true);
  };

  const handleConfirmSale = async () => {
    try {
      const transaction = await confirmSale();
      setReceiptTransaction({
        ...transaction,
        businessName: authUser?.businessName ?? transaction.businessName ?? 'My Business',
        items: typeof transaction.items === 'string' ? JSON.parse(transaction.items) : transaction.items,
      });
      await Promise.all([loadProducts(), loadSales()]);
      setSaleError(null);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
    } catch (err) {
      console.error('Sale failed:', err);
      setSaleError(err instanceof Error ? err.message : 'Sale failed. Please try again.');
    }
  };

  const newSale = () => {
    setReceiptTransaction(null);
    setShowReceiptModal(false);
    setShowCartDrawer(false);
  };

  const changeSaleStatus = async (sale: SaleRecord, action: 'cancel' | 'refund') => {
    const actionLabel = action === 'refund' ? 'refund' : 'cancel';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this sale? Products still in inventory will be restocked.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/transactions/${sale.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Unable to ${actionLabel} sale`);
      await Promise.all([loadSales(), loadProducts()]);
    } catch (error) {
      console.error(`Failed to ${actionLabel} sale:`, error);
      alert(error instanceof Error ? error.message : `Unable to ${actionLabel} sale`);
    }
  };

  const beginSaleEdit = (sale: SaleRecord) => {
    setEditingSale(sale);
    setEditingSaleItems((sale.items ?? []).map((item) => ({ ...item })));
  };

  const saveSaleEdit = async () => {
    if (!editingSale) return;
    setSavingSaleEdit(true);
    try {
      const response = await fetch(`/api/transactions/${editingSale.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editingSaleItems.map(({ productId, quantity, price }) => ({
            productId,
            quantity,
            price,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to edit sale');
      setEditingSale(null);
      await Promise.all([loadSales(), loadProducts()]);
    } catch (error) {
      console.error('Failed to edit sale:', error);
      alert(error instanceof Error ? error.message : 'Unable to edit sale');
    } finally {
      setSavingSaleEdit(false);
    }
  };

  const downloadReceipt = async (transaction: any) => {
    try {
      await generatePDFReceipt(transaction);
    } catch (error) {
      console.error('Failed to generate PDF receipt:', error);
      alert('Failed to generate PDF receipt. Please try again.');
    }
  };

  const receiptItems: ReceiptItem[] = receiptTransaction
    ? normalizeReceiptItems(
        Array.isArray(receiptTransaction.items)
          ? receiptTransaction.items
          : JSON.parse(receiptTransaction.items || '[]')
      )
    : [];
  const estimatedCogs = items.every((item) => item.product.costPrice != null)
    ? items.reduce(
        (total, item) => total + (item.product.costPrice ?? 0) * item.quantity,
        0
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 text-gray-900">
      {/* Search Bar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Recent Products */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-3">Recent Products</h2>
        <div className="flex space-x-3 overflow-x-auto pb-2">
          {recentProducts.map((product) => (
            <div
              key={product.id}
              onTouchStart={() => handleTouchStart(product)}
              onTouchEnd={handleTouchEnd}
              onClick={() => handleProductTap(product)}
              className={`flex-shrink-0 w-24 h-24 bg-white rounded-lg shadow-sm border border-gray-200 p-2 flex flex-col justify-center items-center cursor-pointer transition-all ${
                addedItem === product.id ? 'bg-green-100 border-green-300' : ''
              }`}
            >
              <div className="text-xs font-medium text-center truncate">{product.name}</div>
              <div className="text-sm font-bold text-orange-600">₦{product.price}</div>
              <div className="text-[10px] text-gray-500">
                Cost: {product.costPrice == null ? 'Unavailable' : `₦${product.costPrice.toFixed(2)}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-4">
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onTouchStart={() => handleTouchStart(product)}
              onTouchEnd={handleTouchEnd}
              onClick={() => handleProductTap(product)}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer transition-all hover:shadow-md ${
                addedItem === product.id ? 'bg-green-100 border-green-300' : ''
              } ${product.quantity <= 5 ? 'border-red-300' : ''}`}
            >
              <h3 className="font-medium text-sm mb-1 truncate">{product.name}</h3>
              <div className="text-lg font-bold text-orange-600 mb-2">₦{product.price}</div>
              <p className="mb-2 text-xs text-gray-600">
                Purchase cost: {product.costPrice == null ? 'Unavailable' : `₦${product.costPrice.toFixed(2)}`}
              </p>
              <div className="flex justify-between items-center">
                <span className={`text-xs px-2 py-1 rounded ${
                  product.quantity <= 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  Stock: {product.quantity}
                </span>
                {product.quantity <= 5 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">Low</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="px-4 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Sales</h2>
          <button
            type="button"
            onClick={() => void loadSales()}
            className="text-sm font-medium text-orange-700 hover:text-orange-800"
          >
            Refresh
          </button>
        </div>
        {saleHistoryError && <p className="mb-3 text-sm text-red-600">{saleHistoryError}</p>}
        <div className="space-y-3">
          {sales.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">No sales recorded yet.</div>
          ) : sales.map((sale) => (
            <article key={sale.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">{new Date(sale.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-sm text-gray-600">Sale #{sale.id}</p>
                  <p className="mt-2 text-sm text-gray-700">
                    {(sale.items ?? []).map((item) =>
                      `${item.name} × ${item.quantity} · ${item.costPrice == null ? 'Cost unavailable' : `Cost ₦${item.costPrice.toFixed(2)}/unit`}`
                    ).join('; ')}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-gray-900">Revenue: ₦{sale.totalAmount.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    COGS: {sale.costOfGoodsSold == null ? 'Unavailable' : `₦${sale.costOfGoodsSold.toFixed(2)}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    Gross profit: {sale.grossProfit == null ? 'Unavailable' : `₦${sale.grossProfit.toFixed(2)}`}
                  </p>
                  <p className={`mt-1 text-xs font-semibold uppercase ${sale.status === 'completed' ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {sale.status}
                  </p>
                </div>
              </div>
              {sale.status === 'completed' && (
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => beginSaleEdit(sale)}
                    disabled={!sale.items?.length || sale.items.some((item) => !item.productId)}
                    className="rounded border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit sale
                  </button>
                  <button
                    type="button"
                    onClick={() => void changeSaleStatus(sale, 'cancel')}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel sale
                  </button>
                  <button
                    type="button"
                    onClick={() => void changeSaleStatus(sale, 'refund')}
                    className="rounded border border-orange-300 px-3 py-1.5 text-sm text-orange-700 hover:bg-orange-50"
                  >
                    Refund sale
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-sm text-gray-600">Items: {getTotalItems()}</div>
            <div className="text-lg font-bold">Total: ₦{getTotalPrice().toFixed(2)}</div>
            <div className="text-xs text-gray-600">
              Estimated COGS: {estimatedCogs == null ? 'Unavailable' : `₦${estimatedCogs.toFixed(2)}`}
            </div>
            <div className="text-xs text-gray-600">
              Estimated gross profit: {estimatedCogs == null ? 'Unavailable' : `₦${(getTotalPrice() - estimatedCogs).toFixed(2)}`}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowCartDrawer(true)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
            >
              View Cart
            </button>
            <button
              onClick={handleCompleteSale}
              disabled={items.length === 0}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50"
            >
              Complete Sale
            </button>
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      {showCartDrawer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-end">
          <div className="bg-white w-full rounded-t-lg p-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Cart</h2>
              <button onClick={() => setShowCartDrawer(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            {items.map((item) => (
              <div key={item.product.id} className="flex flex-col gap-3 mb-3 p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{item.product.name}</div>
                    <div className="text-sm text-gray-600">Original: ₦{item.product.price.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">
                      Purchase cost: {item.product.costPrice == null ? 'Unavailable' : `₦${item.product.costPrice.toFixed(2)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="w-8 h-8 bg-red-200 text-red-600 rounded flex items-center justify-center ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sale price: ₦{item.price.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => setEditingPriceProductId(
                        editingPriceProductId === item.product.id ? null : item.product.id
                      )}
                      aria-label={`Edit sale price for ${item.product.name}`}
                      title="Edit sale price"
                      className="w-8 h-8 bg-orange-100 text-orange-700 rounded flex items-center justify-center"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  {editingPriceProductId === item.product.id && (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updatePrice(item.product.id, Number(e.target.value))}
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                          setEditingPriceProductId(null);
                        }
                      }}
                      aria-label={`New sale price for ${item.product.name}`}
                      className="w-32 px-2 py-1 border border-orange-300 rounded"
                      autoFocus
                    />
                  )}
                  <div className="text-right">
                    <div className="font-bold">₦{(item.price * item.quantity).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="border-t pt-4 mt-4">
              <div className="text-lg font-bold">Total revenue: ₦{getTotalPrice().toFixed(2)}</div>
              <div className="text-sm text-gray-600">
                COGS: {estimatedCogs == null ? 'Unavailable' : `₦${estimatedCogs.toFixed(2)}`}
              </div>
              <div className="text-sm text-gray-600">
                Gross profit: {estimatedCogs == null ? 'Unavailable' : `₦${(getTotalPrice() - estimatedCogs).toFixed(2)}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Modal */}
      {showQuantityModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-80">
            <h2 className="text-lg font-semibold mb-4">Select Quantity</h2>
            <div className="flex items-center justify-center space-x-4 mb-6">
              <button
                onClick={() => setQuantityInput(Math.max(1, quantityInput - 1))}
                className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-2xl font-bold">{quantityInput}</span>
              <button
                onClick={() => setQuantityInput(quantityInput + 1)}
                className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowQuantityModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addItem(selectedProduct, quantityInput);
                  setShowQuantityModal(false);
                  setAddedItem(selectedProduct.id);
                  setTimeout(() => setAddedItem(null), 500);
                }}
                className="flex-1 py-2 bg-orange-500 text-white rounded"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSale && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit sale</h2>
              <button type="button" onClick={() => setEditingSale(null)} aria-label="Close sale editor">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Quantity changes update stock atomically. The original purchase cost snapshot is retained.
            </p>
            <div className="space-y-3">
              {editingSaleItems.map((item, index) => (
                <div key={`${item.productId}-${index}`} className="grid grid-cols-1 gap-3 rounded border border-gray-200 p-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_auto] sm:items-end">
                  <p className="font-medium">{item.name}</p>
                  <label className="text-sm text-gray-600">
                    Quantity
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) => {
                        const quantity = Number(event.target.value);
                        setEditingSaleItems((current) => current.map((line, lineIndex) =>
                          lineIndex === index ? { ...line, quantity } : line
                        ));
                      }}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-gray-900"
                    />
                  </label>
                  <label className="text-sm text-gray-600">
                    Sale price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(event) => {
                        const price = event.target.value === '' ? Number.NaN : Number(event.target.value);
                        setEditingSaleItems((current) => current.map((line, lineIndex) =>
                          lineIndex === index ? { ...line, price } : line
                        ));
                      }}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-gray-900"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditingSaleItems((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                    className="rounded px-2 py-1 text-sm text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="rounded border border-gray-300 px-4 py-2 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveSaleEdit()}
                disabled={
                  savingSaleEdit ||
                  editingSaleItems.length === 0 ||
                  editingSaleItems.some((item) =>
                    !Number.isInteger(item.quantity) ||
                    item.quantity <= 0 ||
                    !Number.isFinite(item.price) ||
                    item.price < 0
                  )
                }
                className="rounded bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {savingSaleEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-80">
            <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
            <div className="space-y-2 mb-6">
              {paymentMethods.map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method as PaymentMethod)}
                    className={`w-full py-3 rounded capitalize flex items-center justify-between px-4 ${
                      isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <span>{method}</span>
                    {isSelected && <CheckCircle className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
            {saleError && (
              <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{saleError}</p>
            )}
            <div className="flex space-x-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSale}
                disabled={loading}
                className="flex-1 py-2 bg-green-500 text-white rounded disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && receiptTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">Sales Receipt</h2>
                <p className="text-sm text-gray-500">{receiptTransaction.businessName}</p>
                <p className="text-sm text-gray-500">Transaction ID: {receiptTransaction.id}</p>
                <p className="text-sm text-gray-500">{new Date(receiptTransaction.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={newSale} className="text-gray-500 hover:text-gray-800">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm text-gray-600">
              <div>
                <p className="font-semibold">Payment Method</p>
                <p className="capitalize">{receiptTransaction.paymentMethod}</p>
              </div>
              <div>
                <p className="font-semibold">Total</p>
                <p className="text-lg font-bold text-orange-600">₦{(receiptTransaction.totalAmount || receiptTransaction.total || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 border-b">Product</th>
                    <th className="px-4 py-2 border-b text-center">Qty</th>
                    <th className="px-4 py-2 border-b text-right">Sale Price</th>
                    <th className="px-4 py-2 border-b text-right">Purchase Cost</th>
                    <th className="px-4 py-2 border-b text-right">Sale Total</th>
                    <th className="px-4 py-2 border-b text-right">COGS</th>
                    <th className="px-4 py-2 border-b text-right">Gross Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 border-b">{item.name}</td>
                      <td className="px-4 py-2 border-b text-center">{item.quantity}</td>
                      <td className="px-4 py-2 border-b text-right">₦{item.price.toFixed(2)}</td>
                      <td className="px-4 py-2 border-b text-right">
                        {item.costPrice == null ? 'Unavailable' : `₦${item.costPrice.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-2 border-b text-right">₦{item.subtotal.toFixed(2)}</td>
                      <td className="px-4 py-2 border-b text-right">
                        {item.costOfGoodsSold == null ? 'Unavailable' : `₦${item.costOfGoodsSold.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-2 border-b text-right">
                        {item.grossProfit == null ? 'Unavailable' : `₦${item.grossProfit.toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <p>Revenue: <strong>₦{Number(receiptTransaction.totalAmount ?? 0).toFixed(2)}</strong></p>
              <p>
                COGS: <strong>
                  {receiptTransaction.costOfGoodsSold == null
                    ? 'Unavailable'
                    : `₦${Number(receiptTransaction.costOfGoodsSold).toFixed(2)}`}
                </strong>
              </p>
              <p>
                Gross profit: <strong>
                  {receiptTransaction.grossProfit == null
                    ? 'Unavailable'
                    : `₦${Number(receiptTransaction.grossProfit).toFixed(2)}`}
                </strong>
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => downloadReceipt(receiptTransaction)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF Receipt
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                onClick={newSale}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}