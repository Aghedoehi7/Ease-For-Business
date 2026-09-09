'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, X, CheckCircle, Printer, Download } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { Product, ReceiptItem } from '@/types';
import { generatePDFReceipt, normalizeReceiptItems } from '@/lib/receipt';

const paymentMethods = ['cash', 'transfer', 'pos', 'credit'] as const;

type PaymentMethod = (typeof paymentMethods)[number];

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
  const [quantityInput, setQuantityInput] = useState(1);
  const [addedItem, setAddedItem] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
      setShowPaymentModal(false);
      setShowReceiptModal(true);
    } catch (err) {
      console.error('Sale failed:', err);
    }
  };

  const newSale = () => {
    setReceiptTransaction(null);
    setShowReceiptModal(false);
    setShowCartDrawer(false);
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

      {/* Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-sm text-gray-600">Items: {getTotalItems()}</div>
            <div className="text-lg font-bold">Total: ₦{getTotalPrice().toFixed(2)}</div>
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
                    <label className="text-sm text-gray-600">Sale price:</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updatePrice(item.product.id, Number(e.target.value))}
                      className="w-28 px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="text-right">
                    <div className="font-bold">₦{(item.price * item.quantity).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="border-t pt-4 mt-4">
              <div className="text-lg font-bold">Total: ₦{getTotalPrice().toFixed(2)}</div>
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
                    <th className="px-4 py-2 border-b text-right">Price</th>
                    <th className="px-4 py-2 border-b text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptItems.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 border-b">{item.name}</td>
                      <td className="px-4 py-2 border-b text-center">{item.quantity}</td>
                      <td className="px-4 py-2 border-b text-right">₦{item.price.toFixed(2)}</td>
                      <td className="px-4 py-2 border-b text-right">₦{item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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