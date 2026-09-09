export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  sku: string;
  category: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}