import { useEffect } from 'react'
import { usePageHeaderStore } from '@/store/page-header-store'

export function usePageTitle(title: string, onBack?: (() => void) | null) {
  const setPageHeader = usePageHeaderStore((s) => s.setPageHeader)

  useEffect(() => {
    setPageHeader(title, onBack ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, onBack])
}
