import { create } from 'zustand'

const ENABLED_KEY = 'staygrid.appLockEnabled'
const PIN_KEY = 'staygrid.appLockPin'

interface AppLockState {
  enabled: boolean
  pin: string | null
  isUnlocked: boolean
  enable: (pin: string) => void
  disable: () => void
  unlock: (pin: string) => boolean
  lock: () => void
}

function readEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === 'true'
}

export const useAppLockStore = create<AppLockState>((set, get) => ({
  enabled: readEnabled(),
  pin: localStorage.getItem(PIN_KEY),
  // Locked at boot only if a PIN was already set up in a previous session.
  isUnlocked: !readEnabled(),
  enable: (pin) => {
    localStorage.setItem(ENABLED_KEY, 'true')
    localStorage.setItem(PIN_KEY, pin)
    set({ enabled: true, pin, isUnlocked: true })
  },
  disable: () => {
    localStorage.setItem(ENABLED_KEY, 'false')
    localStorage.removeItem(PIN_KEY)
    set({ enabled: false, pin: null, isUnlocked: true })
  },
  unlock: (pin) => {
    if (pin.length > 0 && pin === get().pin) {
      set({ isUnlocked: true })
      return true
    }
    return false
  },
  lock: () => {
    if (get().enabled) set({ isUnlocked: false })
  },
}))
