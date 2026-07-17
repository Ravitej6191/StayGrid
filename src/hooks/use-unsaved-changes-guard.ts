import { useEffect } from 'react'

/** Warns before an accidental tab close/reload while a form has unsaved
 * input — scoped to call sites with something real to lose, not app-wide. */
export function useUnsavedChangesGuard(active: boolean) {
  useEffect(() => {
    if (!active) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])
}
