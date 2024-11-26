import type ElectronStore from 'electron-store'

// Use dynamic import for the actual Store constructor
const Store = (async () => {
  const module = await import('electron-store')
  return module.default
})()

interface StoreSchema {
  'openrouter-api-key': string
  'ai-chat-model': string
  'theme': 'system' | 'light' | 'dark'
  'obsidian-vault-path': string
}

// Initialize store after dynamic import
let store: any // Temporarily type as any to avoid TS errors during initialization

async function initStore() {
  const StoreConstructor = await Store
  store = new StoreConstructor<StoreSchema>({
    defaults: {
      'openrouter-api-key': '',
      'ai-chat-model': 'anthropic/claude-3.5-sonnet:beta',
      'theme': 'system',
      'obsidian-vault-path': ''
    },
    name: 'vulpecula-config'
  })
  return store
}

// Export an async function to get the store wrapper
export async function getStoreWrapper() {
  if (!store) {
    await initStore()
  }
  
  // Type the store methods explicitly
  const wrapper = {
    get: function<K extends keyof StoreSchema>(key: K): StoreSchema[K] {
      return (store as any).get(key)
    },
    set: function<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void {
      (store as any).set(key, value)
    },
    clear: function(): void {
      (store as any).clear()
    }
  }

  return wrapper
}

export type { StoreSchema } 
