import { create } from 'zustand';
import { ChatMessage } from '@/types';

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (message: ChatMessage) => void;
  setIsLoading: (loading: boolean) => void;
  clearMessages: () => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map((msg) => msg.id === id ? { ...msg, ...updates } : msg)
  })),
}));