export type Theme = 'light' | 'dark'

// Tiny theme store: state lives in useState for SSR safety, persisted in localStorage on the client.
export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light')

  const apply = (value: Theme) => {
    theme.value = value
    if (import.meta.client) {
      document.documentElement.dataset.theme = value
      try {
        localStorage.setItem('theme', value)
      } catch {
        /* storage may be unavailable (private mode) */
      }
    }
  }

  const toggle = () => apply(theme.value === 'dark' ? 'light' : 'dark')

  onMounted(() => {
    const current = document.documentElement.dataset.theme as Theme | undefined
    if (current === 'dark' || current === 'light') theme.value = current
  })

  return { theme, toggle, apply }
}
