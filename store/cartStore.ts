'use client';

import { create } from 'zustand';
import { Product } from '@/types';

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  paymentMethod: string;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updatePrice: (productId: string, price: number) => void;
  setPaymentMethod: (method: string) => void;
  confirmSale: () => Promise<any>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,
  paymentMethod: 'cash',
  addItem: (product, quantity = 1) => {
    const existing = get().items.find((item) => item.product.id === product.id);
    const items = existing
      ? get().items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      : [...get().items, { product, quantity, price: product.price }];
    set({ items });
  },
  removeItem: (productId) => {
    const items = get().items.filter((item) => item.product.id !== productId);
    set({ items });
  },
  updateQuantity: (productId, quantity) => {
    const items = get().items
      .map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
      .filter((item) => item.quantity > 0);
    set({ items });
  },
  updatePrice: (productId, price) => {
    const normalizedPrice = Math.max(0, Number(price) || 0);
    const items = get().items.map((item) =>
      item.product.id === productId ? { ...item, price: normalizedPrice } : item
    );
    set({ items });
  },
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  confirmSale: async () => {
    set({ loading: true });
    try {
      const { items, paymentMethod, getTotalPrice } = get();
      const totalAmount = getTotalPrice();

      const response = await fetch('/api/transactions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'out',
          reason: 'Sale',
          items: items.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
          })),
          totalAmount,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sale failed');
      }

      const transaction = await response.json();
      set({ items: [], loading: false });
      return transaction;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
  getTotalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
}));
