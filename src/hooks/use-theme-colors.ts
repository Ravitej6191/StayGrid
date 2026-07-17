import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

const TOKENS = [
  'primary',
  'success',
  'warning',
  'muted-foreground',
  'border',
  'foreground',
  'popover',
  'popover-foreground',
] as const
type Token = (typeof TOKENS)[number]

function readTokens(): Record<Token, string> {
  const styles = getComputedStyle(document.documentElement)
  return Object.fromEntries(TOKENS.map((t) => [t, styles.getPropertyValue(`--${t}`).trim()])) as Record<
    Token,
    string
  >
}

/** Canvas-based charts can't resolve CSS variables directly, so this hook
 * reads the resolved values whenever the theme flips light/dark. */
export function useThemeColors() {
  const { resolvedTheme } = useTheme()
  const [colors, setColors] = useState<Record<Token, string>>(() =>
    typeof window === 'undefined'
      ? ({} as Record<Token, string>)
      : readTokens(),
  )

  useEffect(() => {
    setColors(readTokens())
  }, [resolvedTheme])

  return colors
}
