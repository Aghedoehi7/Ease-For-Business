'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Filter } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Product } from '@/types';
import InventoryTable from '@/components/common/InventoryTable';
import AddProductForm from '@/components/common/AddProductForm';

export default function InventoryPage() {
  const { products, loading, error, addProduct, updateProduct, deleteProduct, loadProducts } = useInventoryStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [filterCategory, setFilterCategory] = useState('all');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (searchParams?.get('action') === 'add') {
      setEditingProduct(undefined);
      setIsFormOpen(true);
    }
  }, [searchParams]);

  const filteredProducts =
    filterCategory === 'all'
      ? products
      : products.filter((p) => p.category === filterCategory);

  const categories = ['all', ...new Set(products.map((p) => p.category))];

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        setEditingProduct(undefined);
      } else {
        await addProduct(productData);
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save product:', err);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
      } catch (err) {
        console.error('Failed to delete product:', err);
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(undefined);

    if (searchParams?.get('action') === 'add') {
      router.replace('/inventory');
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-2">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} in inventory
            </p>
            {error && <p className="text-red-600 mt-2">{error}</p>}
          </div>
          <button
            onClick={() => {
              setEditingProduct(undefined);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-lg font-bold hover:shadow-lg transition-all hover:scale-105"
          >
            <Plus size={20} /> Add Product
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-600" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        <InventoryTable
          products={filteredProducts}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Empty State */}
        {products.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="inline-block p-4 bg-gray-100 rounded-lg mb-4">
              <Plus size={40} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Products Yet</h2>
            <p className="text-gray-600 mb-6">
              Start by adding your first product to your inventory.
            </p>
            <button
              onClick={() => {
                setEditingProduct(undefined);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-lg font-bold hover:shadow-lg transition-all"
            >
              <Plus size={20} /> Add Your First Product
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Product Form */}
      {isFormOpen && (
        <AddProductForm
          onClose={handleCloseForm}
          onSubmit={handleAddProduct}
          initialProduct={editingProduct}
        />
      )}
    </div>
  );
}
