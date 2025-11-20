/**
 * Sidebar State Management (Zustand)
 *
 * Global state for admin sidebar collapse/expand
 * Used by AdminSidebar and AdminHeader components
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: true, // Default: expanded on desktop

      toggle: () => set((state) => ({ isOpen: !state.isOpen })),

      open: () => set({ isOpen: true }),

      close: () => set({ isOpen: false }),
    }),
    {
      name: 'admin-sidebar-storage', // localStorage key
    }
  )
);
