<template>
  <div v-if="isOpen" class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
      <!-- Fixed Header -->
      <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <button @click="close" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- API Keys Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">API Keys</h3>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              OpenRouter API Key
              <div class="relative">
                <input :value="apiKey" @input="$emit('update:apiKey', ($event.target as HTMLInputElement).value)"
                  :type="showApiKey ? 'text' : 'password'"
                  class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white pr-10"
                  :placeholder="apiKey ? '••••••••' : 'sk-or-...'" />
                <button @click="showApiKey = !showApiKey" type="button"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="showApiKey" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path v-if="showApiKey" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ apiKey ? '✓ API key is set' : 'Enter your OpenRouter API key' }}
              </p>
            </label>
          </div>
        </div>

        <!-- Model Settings -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Model Settings</h3>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Default Model
              <select v-model="defaultModel"
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white">
                <option v-for="(config, id) in MODEL_CONFIGS" :key="id" :value="id">
                  {{ config.name }}
                </option>
              </select>
            </label>
          </div>
        </div>

        <!-- Theme Settings -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Theme
              <select v-model="theme"
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
        </div>

        <!-- Obsidian Settings -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Obsidian Integration</h3>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Vault Location
              <div class="flex items-center space-x-2">
                <div class="relative flex-1">
                  <input :value="vaultPath" readonly
                    :placeholder="vaultPath ? '' : 'Select your Obsidian vault folder...'" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                           rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 
                           text-gray-900 dark:text-white" />
                  <button v-if="vaultPath" @click="clearVaultPath"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Clear vault path">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button @click="selectVaultFolder"
                  class="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center space-x-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>{{ vaultPath ? 'Change' : 'Browse' }}</span>
                </button>
              </div>
            </label>
            <p class="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
              <span v-if="vaultPath" class="text-green-500">✓</span>
              <span>{{ vaultPath ? `Using vault at: ${vaultPath}` : 'Select your Obsidian vault to enable integration'
                }}</span>
            </p>
          </div>
        </div>

        <!-- Keyboard Shortcuts -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
          <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>Settings</div>
            <div>⌘ + ,</div>
            <div>New Chat</div>
            <div>⌘ + N</div>
            <div>Clear Chat</div>
            <div>⌘ + K</div>
            <div>Export Chat</div>
            <div>⌘ + E</div>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="space-y-4 border-t border-red-200 dark:border-red-800 pt-6">
          <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
          <div class="space-y-2">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Permanently delete all chat history and settings. This action cannot be undone.
            </p>
            <button @click="confirmNuke" class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 
                     transition-colors flex items-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Nuke All Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStore } from '../lib/store'
import { MODEL_CONFIGS } from '../composables/useOpenRouter'

const props = defineProps<{
  isOpen: boolean
  apiKey: string
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'update:apiKey', value: string): void
  (e: 'nukeData'): void
}>()

const store = useStore()
const defaultModel = ref(store.get('ai-chat-model'))
const theme = ref(store.get('theme'))
const vaultPath = ref(store.get('obsidian-vault-path'))
const showApiKey = ref(false)

async function selectVaultFolder() {
  try {
    const result = await window.electron.ipcRenderer.invoke('select-folder')

    if (!result.canceled && result.filePaths.length > 0) {
      vaultPath.value = result.filePaths[0]
    }
  } catch (err) {
    console.error('Failed to select vault folder:', err)
  }
}

function close() {
  emit('update:isOpen', false)
  showApiKey.value = false  // Reset API key visibility when closing
}

async function confirmNuke() {
  const confirmed = await window.electron.ipcRenderer.invoke('show-confirm-dialog', {
    type: 'warning',
    title: 'Nuke All Data',
    message: 'Are you absolutely sure?',
    detail: 'This will permanently delete all your chat history, settings, and stored data. This action cannot be undone.',
    buttons: ['Cancel', 'Yes, Delete Everything'],
    defaultId: 0,
    cancelId: 0,
  })

  if (confirmed.response === 1) {
    emit('nukeData')
    close()
  }
}

function clearVaultPath() {
  vaultPath.value = ''
}

// Watch for theme changes
watch(theme, (newTheme) => {
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (newTheme === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    // System preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
})

// Watch for changes
watch(defaultModel, (newValue) => {
  store.set('ai-chat-model', newValue)
})

watch(theme, (newValue) => {
  store.set('theme', newValue)
  // ... theme handling ...
})

watch(vaultPath, (newValue) => {
  store.set('obsidian-vault-path', newValue)
})
</script>

<style scoped>
/* Custom scrollbar for the settings content */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* Dark mode scrollbar */
:deep(.dark) .overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
}

:deep(.dark) .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(75, 85, 99, 0.7);
}
</style>
