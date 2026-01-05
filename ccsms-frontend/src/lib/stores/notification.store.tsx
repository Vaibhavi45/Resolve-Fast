import { create } from 'zustand';

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

type State = {
  items: NotificationItem[];
  add: (n: NotificationItem) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useNotificationStore = create<State>((set) => ({
  items: [],
  add: (n) => set((s) => ({ items: [n, ...s.items].slice(0, 5) })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] }),
}));
