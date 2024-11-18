import { watch } from 'vue'
import { useMagicKeys } from '@vueuse/core'

interface ShortcutHandlers {
  newChat?: () => void
  clearChat?: () => void
  closeModal?: () => void
  openSettings?: () => void
  exportChat?: () => void
}

export function useShortcuts(handlers: ShortcutHandlers = {}) {
  const { meta_n, meta_k, meta_comma, meta_e, escape } = useMagicKeys()

  // Watch for shortcuts
  watch(meta_n, (pressed: boolean) => {
    if (pressed && handlers.newChat) {
      handlers.newChat()
    }
  })

  watch(meta_k, (pressed: boolean) => {
    if (pressed && handlers.clearChat) {
      handlers.clearChat()
    }
  })

  watch(meta_comma, (pressed: boolean) => {
    if (pressed && handlers.openSettings) {
      handlers.openSettings()
    }
  })

  watch(meta_e, (pressed: boolean) => {
    if (pressed && handlers.exportChat) {
      handlers.exportChat()
    }
  })

  watch(escape, (pressed: boolean) => {
    if (pressed && handlers.closeModal) {
      handlers.closeModal()
    }
  })

  return {
    shortcuts: {
      meta_n,
      meta_k,
      meta_comma,
      meta_e,
      escape
    }
  }
} 