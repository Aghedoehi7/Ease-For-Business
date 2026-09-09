'use client';

import { ChangeEvent, useState } from 'react';
import { Edit2, Trash2, AlertCircle } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface InventoryTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export default function InventoryTable({ products, onEdit, onDelete }: InventoryTableProps) {
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price'>('name');

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'quantity':
        return a.quantity - b.quantity;
      case 'price':
        return a.price - b.price;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  if (products.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <p className="text-gray-500">No products in inventory yet. Add your first product to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-bold">Inventory</h2>
        <select
          value={sortBy}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as 'name' | 'quantity' | 'price')}
          className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="name">Sort by Name</option>
          <option value="quantity">Sort by Quantity</option>
          <option value="price">Sort by Price</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedProducts.map((product) => {
              const isLowStock = product.quantity <= 10;
              return (
                <tr key={product.id} className={isLowStock ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.sku}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(product.price)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {isLowStock && <AlertCircle size={16} className="text-red-500" />}
                      <span className={isLowStock ? 'text-red-600 font-bold' : 'text-gray-900'}>
                        {product.quantity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(product.price * product.quantity)}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2 flex">
                    <button
                      onClick={() => onEdit(product)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete product "${product.name}"?`)) {
                          onDelete(product.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
