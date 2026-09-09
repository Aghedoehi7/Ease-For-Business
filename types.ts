export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  sku: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ReceiptItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}
