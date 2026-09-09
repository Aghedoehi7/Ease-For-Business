'use client';

import { create } from 'zustand';
import { Product } from '@/types';
import { useAuthStore } from '@/store/authStore';

interface InventoryState {
  products: Product[];
  loading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getTotalInventoryValue: () => number;
  getLowStockItems: () => Product[];
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  loading: false,
  error: null,
  loadProducts: async () => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().sessionToken;
      const response = await fetch('/api/products', {
        method: 'GET',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error('Failed to load products');
      }
      const data = await response.json();
      set({ products: data.products, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
  addProduct: async (product) => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().sessionToken;
      const response = await fetch('/api/products', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(product),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add product');
      }
      const data = await response.json();
      const newProduct = data;
      set((state) => ({ products: [...state.products, newProduct], loading: false }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
  updateProduct: async (id, product) => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().sessionToken;
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(product),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }
      const data = await response.json();
      const updatedProduct = data;
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
        loading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
  deleteProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().sessionToken;
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
  getTotalInventoryValue: () => {
    const { products } = get();
    return products.reduce((total, product) => total + (product.price * product.quantity), 0);
  },
  getLowStockItems: () => {
    const { products } = get();
    return products.filter((product) => product.quantity < 10);
  },
}));
