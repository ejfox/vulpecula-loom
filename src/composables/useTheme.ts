import { useDark, useToggle } from '@vueuse/core'

export function useTheme() {
  // Automatically syncs with system preferences
  const isDark = useDark({
    selector: 'html',
    attribute: 'class',
    valueDark: 'dark',
    valueLight: 'light',
  })
  const toggleDark = useToggle(isDark)

  return {
    isDark,
    toggleDark
  }
} 