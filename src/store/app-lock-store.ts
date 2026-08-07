import { create } from 'zustand'

const ENABLED_KEY = 'jeevanam.appLockEnabled'
const PIN_KEY = 'jeevanam.appLockPin'
const BIOMETRIC_ENABLED_KEY = 'jeevanam.appLockBiometricEnabled'
const BIOMETRIC_CRED_KEY = 'jeevanam.appLockBiometricCredId'

interface AppLockState {
  enabled: boolean
  pin: string | null
  biometricEnabled: boolean
  isUnlocked: boolean
  enable: (pin: string) => void
  disable: () => void
  unlock: (pin: string) => boolean
  unlockWithBiometric: () => void
  lock: () => void
  setBiometricEnabled: (enabled: boolean, credentialId?: string) => void
}

function readEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === 'true'
}

function readBiometricEnabled(): boolean {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true'
}

export function getBiometricCredentialId(): string | null {
  return localStorage.getItem(BIOMETRIC_CRED_KEY)
}

export const useAppLockStore = create<AppLockState>((set, get) => ({
  enabled: readEnabled(),
  pin: localStorage.getItem(PIN_KEY),
  biometricEnabled: readBiometricEnabled(),
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
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false')
    localStorage.removeItem(BIOMETRIC_CRED_KEY)
    set({ enabled: false, pin: null, isUnlocked: true, biometricEnabled: false })
  },
  unlock: (pin) => {
    if (pin.length > 0 && pin === get().pin) {
      set({ isUnlocked: true })
      return true
    }
    return false
  },
  // Called once the platform authenticator has already verified the user —
  // there's no PIN to check here, the biometric prompt itself was the check.
  unlockWithBiometric: () => set({ isUnlocked: true }),
  lock: () => {
    if (get().enabled) set({ isUnlocked: false })
  },
  setBiometricEnabled: (enabled, credentialId) => {
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled))
    if (enabled && credentialId) {
      localStorage.setItem(BIOMETRIC_CRED_KEY, credentialId)
    } else if (!enabled) {
      localStorage.removeItem(BIOMETRIC_CRED_KEY)
    }
    set({ biometricEnabled: enabled })
  },
}))
