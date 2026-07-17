export interface ThemeColorPreset {
  id: string
  label: string
  swatch: string
  light: string
  dark: string
}

/** Primary color presets the user can pick from Settings. Values match the
 * app's existing oklch() format so they drop straight into --primary. */
export const themeColorPresets: ThemeColorPreset[] = [
  { id: 'indigo', label: 'Indigo', swatch: '#6366f1', light: 'oklch(0.5 0.19 275)', dark: 'oklch(0.72 0.16 275)' },
  { id: 'blue', label: 'Blue', swatch: '#3b82f6', light: 'oklch(0.55 0.19 255)', dark: 'oklch(0.72 0.15 255)' },
  { id: 'green', label: 'Green', swatch: '#10b981', light: 'oklch(0.6 0.14 155)', dark: 'oklch(0.68 0.15 155)' },
  { id: 'rose', label: 'Rose', swatch: '#f43f5e', light: 'oklch(0.58 0.21 15)', dark: 'oklch(0.68 0.19 15)' },
  { id: 'amber', label: 'Amber', swatch: '#f59e0b', light: 'oklch(0.72 0.16 70)', dark: 'oklch(0.78 0.15 70)' },
]

export const THEME_COLOR_KEY = 'staygrid.themeColor'

export function applyThemeColor(id: string) {
  const preset = themeColorPresets.find((p) => p.id === id) ?? themeColorPresets[0]!
  const isDark = document.documentElement.classList.contains('dark')
  document.documentElement.style.setProperty('--primary', isDark ? preset.dark : preset.light)
  localStorage.setItem(THEME_COLOR_KEY, preset.id)
}

export function getStoredThemeColor(): string {
  return localStorage.getItem(THEME_COLOR_KEY) ?? themeColorPresets[0]!.id
}
