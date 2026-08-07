import { create } from 'zustand'

interface UiState {
  selectedHouseId: string | null
  setSelectedHouseId: (id: string | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedHouseId: null,
  setSelectedHouseId: (id) => set({ selectedHouseId: id }),
}))
