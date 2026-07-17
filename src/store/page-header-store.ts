import { create } from 'zustand'
import type { ReactNode } from 'react'

interface PageHeaderState {
  title: string
  onBack: (() => void) | null
  action: ReactNode | null
  setPageHeader: (title: string, onBack?: (() => void) | null) => void
  setHeaderAction: (action: ReactNode | null) => void
}

export const usePageHeaderStore = create<PageHeaderState>((set) => ({
  title: 'StayGrid',
  onBack: null,
  action: null,
  setPageHeader: (title, onBack = null) => set({ title, onBack, action: null }),
  setHeaderAction: (action) => set({ action }),
}))
