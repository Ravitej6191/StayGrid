import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Building2, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { GoogleIcon } from '@/components/common/google-icon'
import { APP_VERSION } from '@/constants/app'
import { useAuth } from '@/providers/auth-provider'
import { signInWithGoogle } from '../services/auth.service'

const BRAND_STAGE_MS = 1100

export function LoginForm() {
  const location = useLocation()
  const { continueInDemoMode } = useAuth()
  const [stage, setStage] = useState<'brand' | 'form'>('brand')
  const [isSigningIn, setIsSigningIn] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  useEffect(() => {
    const timer = setTimeout(() => setStage('form'), BRAND_STAGE_MS)
    return () => clearTimeout(timer)
  }, [])

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signInWithGoogle(from)
    } catch {
      toast.error('Could not sign in with Google. Please try again.')
      setIsSigningIn(false)
    }
  }

  return (
    <>
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="flex flex-col items-center"
      >
        <motion.div
          layout
          initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className={
            stage === 'brand'
              ? 'relative flex size-24 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30'
              : 'relative flex size-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xl shadow-primary/25'
          }
        >
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-[inherit] bg-primary/40 blur-xl"
            animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Building2 className={stage === 'brand' ? 'relative size-11' : 'relative size-8'} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
          className="mt-4 text-2xl font-semibold tracking-tight text-foreground"
        >
          StayGrid
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
          className="mt-1 text-sm text-muted-foreground"
        >
          Where Every Stay is Organized.
        </motion.p>

        {stage === 'form' ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mt-6 w-full space-y-5 rounded-xl border border-border bg-card p-6 shadow-xl shadow-black/5 dark:shadow-black/30"
          >
            <p className="text-center text-sm text-muted-foreground">Sign in to manage your building</p>

            <Button variant="outline" className="w-full" disabled={isSigningIn} onClick={handleGoogleSignIn}>
              {isSigningIn ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon className="size-4" />}
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <Button variant="secondary" className="w-full" onClick={continueInDemoMode}>
              <Sparkles className="size-4" />
              Continue in Demo Mode
            </Button>
          </motion.div>
        ) : null}
      </motion.div>

      <p className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] text-center text-xs text-muted-foreground/60">
        StayGrid v{APP_VERSION}
      </p>
    </>
  )
}
