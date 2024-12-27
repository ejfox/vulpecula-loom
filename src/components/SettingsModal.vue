<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useStore } from '../lib/store'
import { useOpenRouter } from '../composables/useOpenRouter'
import ModelSettings from './ModelSettings.vue'

// Add this near the top of the script section
const { shell, ipc } = window.electron || {}

// Add currentTab state
const currentTab = ref('general')

const props = defineProps<{
  modelValue: boolean
  theme: string
  showProgressBar: boolean
  availableModels: Array<{
    id: string
    name?: string
    description?: string
    context_length: number
    pricing?: {
      prompt: string
      completion: string
    }
  }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:theme': [value: string]
  'update:showProgressBar': [value: boolean]
  'validate-api-key': [key: string]
  'update:showOnlyPinnedModels': [value: boolean]
}>()

const store = useStore()
const { apiKey, saveApiKey } = useOpenRouter()

// Initialize preferences with loading state
const preferences = ref({
  rememberWindowState: true,
  minimizeToTray: false,
  showNotifications: true,
  playSounds: true,
  showBadgeCount: true,
  showProgressBar: true,
  showOnlyPinnedModels: false
})

const tempApiKey = ref('')
const error = ref<string | null>(null)
const isLoading = ref(true)
const obsidianVaultPath = ref('')
const isSelectingVault = ref(false)

// Load preferences from store with retry mechanism
const loadPreferences = async () => {
  try {
    const [
      rememberWindowState,
      minimizeToTray,
      showNotifications,
      playSounds,
      showBadgeCount,
      showProgressBar,
      showOnlyPinnedModels,
      storedKey,
      vaultPath
    ] = await Promise.all([
      store.get('remember-window-state'),
      store.get('minimize-to-tray'),
      store.get('show-notifications'),
      store.get('play-sounds'),
      store.get('show-badge-count'),
      store.get('show-progress-bar'),
      store.get('show-only-pinned-models'),
      store.get('api-key'),
      store.get('obsidian-vault-path')
    ])

    preferences.value = {
      rememberWindowState: Boolean(rememberWindowState ?? true),
      minimizeToTray: Boolean(minimizeToTray ?? false),
      showNotifications: Boolean(showNotifications ?? true),
      playSounds: Boolean(playSounds ?? true),
      showBadgeCount: Boolean(showBadgeCount ?? true),
      showProgressBar: Boolean(showProgressBar ?? true),
      showOnlyPinnedModels: Boolean(showOnlyPinnedModels ?? false)
    }

    // Cast the stored key to string since we know it should be a string
    tempApiKey.value = (storedKey as string) || ''
    obsidianVaultPath.value = (vaultPath as string) || ''
  } catch (err) {
    console.error('Error loading preferences:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load preferences'
  } finally {
    isLoading.value = false
  }
}

// Initial load with retry
onMounted(() => {
  const tryLoad = () => {
    if (window.electron?.store) {
      loadPreferences()
    } else {
      const checkInterval = setInterval(() => {
        if (window.electron?.store) {
          clearInterval(checkInterval)
          loadPreferences()
        }
      }, 100)

      // Clear interval after 5 seconds if electron is still not available
      setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.electron?.store) {
          error.value = 'Electron store not available after timeout'
          isLoading.value = false
        }
      }, 5000)
    }
  }

  tryLoad()
})

// Load preferences on mount
onMounted(async () => {
  try {
    const showOnlyPinnedModels = await store.get('show-only-pinned-models')
    preferences.value.showOnlyPinnedModels = Boolean(showOnlyPinnedModels)
  } catch (err) {
    console.error('Failed to load preferences:', err)
  }
})

// Save preferences when they change
watch(() => preferences.value.showOnlyPinnedModels, async (newValue) => {
  try {
    await store.set('show-only-pinned-models', newValue)
    emit('update:showOnlyPinnedModels', newValue)
  } catch (err) {
    console.error('Failed to save preference:', err)
  }
}, { immediate: true })

function close() {
  emit('update:modelValue', false)
}

async function handleApiKeyChange(event: Event) {
  try {
    const key = (event.target as HTMLInputElement).value
    tempApiKey.value = key

    // Save to store first
    await store.set('api-key', key)

    // Then validate and update the OpenRouter composable
    await emit('validate-api-key', key)
    await saveApiKey(key)
  } catch (err) {
    console.error('Failed to save API key:', err)
    error.value = 'Failed to save API key'
  }
}

const selectObsidianVault = async () => {
  try {
    isSelectingVault.value = true;

    if (!window.electron?.ipc) {
      throw new Error("IPC not available");
    }

    const result = await window.electron.ipc.invoke("select-folder");

    if (result.canceled || !result.filePaths?.[0]) {
      return;
    }

    const vaultPath = result.filePaths[0];
    obsidianVaultPath.value = vaultPath;

    // Add logging to debug store setting
    console.log('Setting vault path:', vaultPath);
    await store.set("obsidian-vault-path", vaultPath);
    console.log('Vault path set successfully');

  } catch (err) {
    console.error("Failed to select Obsidian vault:", err);
    error.value = err instanceof Error ? err.message : "Failed to select vault";
  } finally {
    isSelectingVault.value = false;
  }
};
</script>

<template>
  <div v-if="modelValue"
    class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="flex-shrink-0 px-6 py-4 border-b dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button @click="close" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <span class="sr-only">Close</span>
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex space-x-4 border-b dark:border-gray-700 -mb-4">
          <button @click="currentTab = 'general'" class="px-4 py-2 text-sm font-medium transition-colors relative"
            :class="[
              currentTab === 'general'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            ]">
            General
          </button>
          <button @click="currentTab = 'models'" class="px-4 py-2 text-sm font-medium transition-colors relative"
            :class="[
              currentTab === 'models'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            ]">
            Models
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 px-6 py-6 overflow-y-auto">
        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-100 dark:bg-red-900 p-6 rounded-lg">
          <p class="text-red-800 dark:text-red-200">{{ error }}</p>
          <button @click="loadPreferences"
            class="mt-4 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
            Try Again
          </button>
        </div>

        <!-- Settings Content (only show when not loading and no error) -->
        <template v-else>
          <!-- General Tab -->
          <div v-if="currentTab === 'general'" class="space-y-8">
            <!-- API Keys Section -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">API Keys</h3>

              <!-- OpenRouter API Key -->
              <div class="space-y-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  OpenRouter API Key
                </label>
                <input :value="tempApiKey" @input="handleApiKeyChange" type="password"
                  class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Get your API key from <a href="#" @click.prevent="shell?.openExternal?.('https://openrouter.ai/keys')"
                    class="text-blue-500 hover:text-blue-400">openrouter.ai/keys</a>
                </p>
              </div>
            </section>

            <!-- Obsidian Integration -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Obsidian Integration</h3>
              <div class="space-y-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Vault Location
                </label>
                <div class="flex gap-2">
                  <input :value="obsidianVaultPath" readonly type="text"
                    placeholder="Select your Obsidian vault folder..."
                    class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  <button @click="selectObsidianVault" :disabled="isSelectingVault"
                    class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ isSelectingVault ? 'Selecting...' : 'Select Folder' }}
                  </button>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Select your Obsidian vault folder to enable file linking and search
                </p>
              </div>
            </section>

            <!-- Theme Section -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Appearance</h3>
              <div class="space-y-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Theme
                </label>
                <select :value="theme" @change="$emit('update:theme', ($event.target as HTMLSelectElement).value)"
                  class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </section>

            <!-- Interface Options -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Interface</h3>
              <div class="space-y-3">
                <div class="flex items-center">
                  <input :checked="showProgressBar"
                    @change="$emit('update:showProgressBar', ($event.target as HTMLInputElement).checked)"
                    type="checkbox"
                    class="h-4 w-4 text-blue-500 rounded border-gray-300 dark:border-gray-700 focus:ring-blue-500" />
                  <label class="ml-2 block text-sm text-gray-900 dark:text-white">
                    Show Progress Bar
                  </label>
                </div>
              </div>
            </section>

            <!-- Model Selection -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Model Selection</h3>
              <div class="space-y-3">
                <div class="flex items-center">
                  <input :checked="preferences.showOnlyPinnedModels"
                    @change="preferences.showOnlyPinnedModels = ($event.target as HTMLInputElement).checked"
                    type="checkbox"
                    class="h-4 w-4 text-blue-500 rounded border-gray-300 dark:border-gray-700 focus:ring-blue-500" />
                  <label class="ml-2 block text-sm text-gray-900 dark:text-white">
                    Show only pinned models in chat sidebar
                  </label>
                  <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    (Shows all models if none are pinned)
                  </span>
                </div>
              </div>
            </section>
          </div>

          <!-- Models Tab -->
          <div v-if="currentTab === 'models'" class="space-y-8">
            <ModelSettings :available-models="availableModels"
              :show-only-pinned-models="preferences.showOnlyPinnedModels" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

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