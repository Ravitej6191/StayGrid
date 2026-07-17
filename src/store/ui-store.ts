import { create } from 'zustand'

interface UiState {
  selectedRoomId: string | null
  setSelectedRoomId: (id: string | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedRoomId: null,
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),
}))
