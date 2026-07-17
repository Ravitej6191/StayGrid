import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { usePageHeaderStore } from '@/store/page-header-store'

export function usePageHeaderAction(action: ReactNode | null) {
  const setHeaderAction = usePageHeaderStore((s) => s.setHeaderAction)

  useEffect(() => {
    setHeaderAction(action)
    return () => setHeaderAction(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action])
}
