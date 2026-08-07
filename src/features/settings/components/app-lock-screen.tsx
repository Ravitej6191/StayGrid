import { useEffect, useState } from 'react'
import { Fingerprint, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { digitsOnly } from '@/utils/format'
import { verifyBiometricCredential } from '@/lib/biometric-auth'
import { getBiometricCredentialId, useAppLockStore } from '@/store/app-lock-store'

export function AppLockScreen() {
  const unlock = useAppLockStore((s) => s.unlock)
  const unlockWithBiometric = useAppLockStore((s) => s.unlockWithBiometric)
  const biometricEnabled = useAppLockStore((s) => s.biometricEnabled)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const tryBiometric = async () => {
    const credentialId = getBiometricCredentialId()
    if (!credentialId) return
    setIsVerifying(true)
    const verified = await verifyBiometricCredential(credentialId)
    setIsVerifying(false)
    if (verified) unlockWithBiometric()
  }

  useEffect(() => {
    if (biometricEnabled) void tryBiometric()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!unlock(pin)) {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="size-7" />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">Jeevanam is locked</p>
        <p className="text-sm text-muted-foreground">
          {biometricEnabled ? 'Use biometrics or enter your PIN to continue' : 'Enter your PIN to continue'}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-64 space-y-3">
        <Input
          type="password"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          className="text-center text-lg tracking-[0.5em]"
          value={pin}
          onChange={(e) => {
            setError(false)
            setPin(digitsOnly(e.target.value, 4))
          }}
        />
        {error ? <p className="text-center text-xs text-danger">Incorrect PIN, try again.</p> : null}
        <Button type="submit" className="w-full" disabled={pin.length !== 4}>
          Unlock
        </Button>
      </form>
      {biometricEnabled ? (
        <Button variant="outline" className="w-full max-w-64" onClick={tryBiometric} disabled={isVerifying}>
          <Fingerprint className="size-4" />
          {isVerifying ? 'Verifying…' : 'Use Biometrics'}
        </Button>
      ) : null}
    </div>
  )
}
