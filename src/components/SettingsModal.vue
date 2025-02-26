<script setup lang="ts">
import { ref, watch, onMounted, computed, onUnmounted } from 'vue'
import type { OpenRouterModel } from '../types'
import { useStore } from '../lib/store'
import { useOpenRouter } from '../composables/useOpenRouter'
import ModelSettings from './ModelSettings.vue'
import { useActiveUser } from '../composables/useActiveUser'
import Fuse from 'fuse.js'

// Add this near the top of the script section
const { shell, ipc } = window.electron || {}

// Add this near the top of the script section
const { user, loading: authLoading, signOut } = useActiveUser()

// Add currentTab state
const currentTab = ref('general')

const props = defineProps<{
  modelValue: boolean
  theme: string
  showProgressBar: boolean
  showOnlyPinnedModels: boolean
  availableModels: OpenRouterModel[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:theme': [value: string]
  'update:showProgressBar': [value: boolean]
  'validate-api-key': [key: string]
  'update:showOnlyPinnedModels': [value: boolean]
  'select-model': [modelId: string]
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
    
    // Add keyboard shortcut listener
    window.addEventListener('keydown', handleKeyboardShortcuts)
  } catch (err) {
    console.error('Failed to load preferences:', err)
  }
})

// Clean up event listeners
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardShortcuts)
})

// Handle keyboard shortcuts
const searchInputRef = ref<HTMLInputElement | null>(null)

const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  // Ctrl+, (or Cmd+, on Mac) to focus search
  if ((event.ctrlKey || event.metaKey) && event.key === ',') {
    event.preventDefault()
    
    // If modal is not open, open it
    if (!props.modelValue) {
      emit('update:modelValue', true)
      
      // Need to wait for the modal to render
      setTimeout(() => {
        focusSearchInput()
      }, 100)
    } else {
      focusSearchInput()
    }
  }
}

const focusSearchInput = () => {
  // Find the search input and focus it
  const searchInput = document.querySelector('.settings-global-search') as HTMLInputElement
  if (searchInput) {
    searchInput.focus()
  }
}

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

// Watch for modal opening
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    console.log('Settings modal opened')
    console.log('Available models:', props.availableModels)
    console.log('Available models length:', props.availableModels?.length)
  }
}, { immediate: true })

// Add sign out handler
const handleSignOut = async () => {
  try {
    await signOut()
    emit('update:modelValue', false)
  } catch (err) {
    console.error('Failed to sign out:', err)
    error.value = 'Failed to sign out'
  }
}

// Global model search
const globalModelSearch = ref('')
const globalSearchResults = ref<OpenRouterModel[]>([])

// Fuzzy search configuration
const fuseOptions = {
  keys: ['id', 'name', 'description'],
  threshold: 0.4,
  includeScore: true,
  fieldNormWeight: 2.0
}

// Watch for changes in the global search query
watch(globalModelSearch, (query) => {
  if (!query.trim()) {
    globalSearchResults.value = []
    return
  }
  
  const fuse = new Fuse(props.availableModels, fuseOptions)
  const results = fuse.search(query)
  
  // Limit to top 10 results for performance
  globalSearchResults.value = results.slice(0, 10).map(result => result.item)
})

// Handle keyboard shortcut focus
const handleGlobalSearchFocus = () => {
  // Switch to models tab when focusing on search
  if (currentTab.value !== 'models') {
    currentTab.value = 'models'
  }
}

// Handle enter key in search
const handleGlobalSearchEnter = () => {
  // Select the first result when pressing enter
  if (globalSearchResults.value.length > 0) {
    selectModelFromSearch(globalSearchResults.value[0])
  }
}

// Select a model from search results
const selectModelFromSearch = (model: OpenRouterModel) => {
  // Emit event to select this model in the parent component
  emit('select-model', model.id)
  
  // Clear search and close modal
  globalModelSearch.value = ''
  globalSearchResults.value = []
  
  // Optional: close the settings modal
  emit('update:modelValue', false)
}

// Helper functions for displaying model information
const getModelColor = (modelId: string): string => {
  if (modelId.includes('claude-3')) return 'text-violet-600 dark:text-violet-400'
  if (modelId.includes('claude')) return 'text-purple-600 dark:text-purple-400'
  if (modelId.includes('gpt-4')) return 'text-emerald-600 dark:text-emerald-400'
  if (modelId.includes('gpt-3')) return 'text-blue-600 dark:text-blue-400'
  if (modelId.includes('gemini')) return 'text-amber-600 dark:text-amber-400'
  if (modelId.includes('llama')) return 'text-orange-600 dark:text-orange-400'
  if (modelId.includes('mistral')) return 'text-cyan-600 dark:text-cyan-400'
  return 'text-gray-600 dark:text-gray-400'
}

const getModelDisplayName = (modelId: string): string => {
  const model = props.availableModels.find(m => m.id === modelId)
  if (model?.name) return model.name

  const modelName = modelId.split('/').pop() || ''
  return modelName.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const getProviderName = (modelId: string): string => {
  const [provider] = modelId.split('/')
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

const formatContextLength = (length: number): string => {
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`
  if (length >= 1000) return `${(length / 1000).toFixed(0)}K`
  return `${length}`
}

// Check if pricing is free
const isPricingFree = (price?: string): boolean => {
  if (!price) return false
  const numPrice = parseFloat(price)
  return numPrice === 0
}

// Format pricing for display
const formatPrice = (pricing: { prompt: string, completion: string }): string => {
  if (!pricing) return '-'
  
  const promptPrice = parseFloat(pricing.prompt)
  const completionPrice = parseFloat(pricing.completion)
  
  if (isNaN(promptPrice) || isNaN(completionPrice)) return '-'
  
  // If both prices are 0, show as FREE
  if (promptPrice === 0 && completionPrice === 0) {
    return 'FREE'
  }
  
  // Show completion price as it's usually what users care about most
  if (completionPrice === 0) {
    return 'FREE output'
  }
  
  // For costs that are $0.01 or more per token
  if (completionPrice >= 0.01) {
    return `$${completionPrice.toFixed(2)}/tok`
  }
  
  // For costs around a penny or less, show in cents per token
  if (completionPrice >= 0.0001) {
    return `${(completionPrice * 100).toFixed(1)}¢/tok`
  }
  
  // For smaller costs, show in cents per thousand tokens
  return `${(completionPrice * 100000).toFixed(1)}¢/KTok`
}
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

        <!-- Global Model Search -->
        <div v-if="availableModels.length > 0" class="mb-4">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" 
                   :class="{ 'text-blue-500 dark:text-blue-400': globalModelSearch }"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input v-model="globalModelSearch" 
                   type="text" 
                   placeholder="Quick search any model (e.g., 'claude', 'gpt-4', 'deepseek')..." 
                   class="settings-global-search w-full pl-10 pr-12 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                   :class="{ 'border-blue-500 dark:border-blue-400 shadow-sm shadow-blue-500/20': globalModelSearch }" 
                   @focus="handleGlobalSearchFocus"
                   @keydown.enter="handleGlobalSearchEnter" />
            <div class="absolute inset-y-0 right-0 flex items-center pr-3">
              <span v-if="globalModelSearch" class="text-xs text-blue-500 dark:text-blue-400 font-medium">
                Fuzzy Search
              </span>
              <kbd v-else class="hidden sm:inline-flex items-center px-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                Ctrl+,
              </kbd>
            </div>
          </div>
          
          <!-- Quick Search Results -->
          <div v-if="globalModelSearch && globalSearchResults.length > 0" 
               class="absolute z-50 mt-1 w-[calc(100%-3rem)] max-h-80 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <div class="p-2">
              <div v-for="(model, index) in globalSearchResults" :key="model.id" 
                   class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors duration-150"
                   :class="{ 'bg-gray-50 dark:bg-gray-750': index % 2 === 0 }"
                   @click="selectModelFromSearch(model)">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium" :class="getModelColor(model.id)">
                      {{ model.name || getModelDisplayName(model.id) }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <span class="font-medium">{{ getProviderName(model.id) }}</span>
                      <span class="mx-1">•</span>
                      <span>{{ formatContextLength(model.context_length) }} context</span>
                      <span v-if="model.pricing" class="mx-1">•</span>
                      <span v-if="model.pricing" :class="{ 'text-green-500 dark:text-green-400': isPricingFree(model.pricing.completion) }">
                        {{ formatPrice(model.pricing) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center space-x-1">
                    <span v-if="model.capabilities?.vision" 
                          class="p-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                          title="Vision support">
                      <i class="i-carbon-camera w-3 h-3" />
                    </span>
                    <span v-if="model.capabilities?.tools" 
                          class="p-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                          title="Tools support">
                      <i class="i-carbon-tools w-3 h-3" />
                    </span>
                    <span v-if="model.capabilities?.function_calling" 
                          class="p-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          title="Function calling support">
                      <i class="i-carbon-function w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- No Results Message -->
            <div v-if="globalSearchResults.length === 0 && globalModelSearch" class="p-4 text-center text-gray-500 dark:text-gray-400">
              No models found matching "<span class="font-medium">{{ globalModelSearch }}</span>"
            </div>
          </div>
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
          <button @click="currentTab = 'account'" class="px-4 py-2 text-sm font-medium transition-colors relative"
            :class="[
              currentTab === 'account'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            ]">
            Account
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
                <input :value="tempApiKey" @input="handleApiKeyChange" type="password" class="input-base" />
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
                    placeholder="Select your Obsidian vault folder..." class="input-base" />
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
                  class="select-base">
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
                    type="checkbox" class="checkbox-base" />
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
                    type="checkbox" class="checkbox-base" />
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
            <!-- Token Cost Notation Explainer -->
            <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-sm">
              <h4 class="font-medium text-blue-700 dark:text-blue-300 mb-2">Understanding Token Cost Notation</h4>
              <div class="space-y-2 text-blue-600 dark:text-blue-400">
                <p><code class="font-mono">$0.02/tok</code> - Cost in dollars per token (for costs ≥ $0.01)</p>
                <p><code class="font-mono">0.5¢/tok</code> - Cost in cents per token (for costs ≥ $0.0001)</p>
                <p><code class="font-mono">2.5¢/KTok</code> - Cost in cents per thousand tokens (for smaller costs)</p>
                <p><code class="font-mono">1.2¢/GTok</code> - Cost in cents per million tokens (for tiny costs)</p>
              </div>
            </div>

            <!-- Model Comparison Guide -->
            <div class="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4 text-sm">
              <h4 class="font-medium text-amber-700 dark:text-amber-300 mb-2">Model Comparison Guide</h4>
              <div class="space-y-2 text-amber-600 dark:text-amber-400">
                <p>🔍 <strong>Search:</strong> Use fuzzy search to find models by name, provider, or features</p>
                <p>🏷️ <strong>Filter:</strong> Click on tags to filter by capabilities or pricing</p>
                <p>📌 <strong>Pin:</strong> Save your favorite models for quick access (max 9)</p>
                <p>📊 <strong>Compare:</strong> Sort by different metrics to find the best model for your needs</p>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ availableModels.length }} models available
              </div>
              <div class="text-xs">
                <span class="text-blue-500 dark:text-blue-400 font-medium">Pro tip:</span>
                <span class="text-gray-500 dark:text-gray-400"> Try searching for "vision" or "claude"</span>
              </div>
            </div>
            
            <ModelSettings :available-models="availableModels"
              :show-only-pinned-models="preferences.showOnlyPinnedModels"
              @update:show-only-pinned-models="(value) => preferences.showOnlyPinnedModels = value" />
          </div>

          <!-- Account Tab -->
          <div v-if="currentTab === 'account'" class="space-y-8">
            <!-- User Profile Section -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Profile</h3>

              <!-- Loading State -->
              <div v-if="authLoading" class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>

              <!-- User Info -->
              <div v-else-if="user" class="space-y-6">
                <div class="flex items-center space-x-4">
                  <!-- User Avatar -->
                  <img v-if="user.user_metadata?.avatar_url" :src="user.user_metadata.avatar_url"
                    :alt="user.user_metadata?.full_name || 'User avatar'"
                    class="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-700" />

                  <!-- User Details -->
                  <div class="space-y-1">
                    <h4 class="text-lg font-medium text-gray-900 dark:text-white">
                      Account
                    </h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ user.email }}
                    </p>
                    <div class="flex items-center space-x-2">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        Email
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Account Actions -->
                <div class="space-y-4">
                  <div class="border-t dark:border-gray-700 pt-4">
                    <button @click="handleSignOut"
                      class="w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors">
                      Sign out
                    </button>
                  </div>
                </div>
              </div>

              <!-- Not Signed In State -->
              <div v-else class="text-center py-8">
                <p class="text-gray-500 dark:text-gray-400">
                  Not signed in
                </p>
              </div>
            </section>

            <!-- Privacy Section -->
            <section class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Privacy & Security</h3>
              <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  Your data is securely stored and isolated from other users. All chat histories and settings are
                  private to your account.
                </p>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  <p class="font-medium mb-1">Data we store:</p>
                  <ul class="list-disc list-inside space-y-1">
                    <li>Basic Discord profile information</li>
                    <li>Chat histories and settings</li>
                    <li>Application preferences</li>
                  </ul>
                </div>
              </div>
            </section>
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
  background-color: rgba(75, 85, 99, 0.7);
}

/* Dark mode scrollbar */
:deep(.dark) .overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
}

:deep(.dark) .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(75, 85, 99, 0.7);
}

/* Input Styles */
.input-base {
  @apply w-full px-3 py-2;
  @apply bg-white dark:bg-gray-800/50;
  @apply border border-gray-300 dark:border-gray-700;
  @apply rounded-md shadow-sm;
  @apply text-gray-900 dark:text-gray-100;
  @apply placeholder-gray-500 dark:placeholder-gray-400;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply transition-colors duration-200;
}

.select-base {
  @apply input-base;
  @apply pr-8;
  /* Extra padding for the dropdown arrow */
  @apply appearance-none;
  @apply bg-no-repeat bg-right;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-size: 1.5em 1.5em;
}

.checkbox-base {
  @apply h-4 w-4;
  @apply rounded;
  @apply border-gray-300 dark:border-gray-600;
  @apply text-blue-500 dark:text-blue-400;
  @apply bg-white dark:bg-gray-800/50;
  @apply focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply transition-colors duration-200;
}

/* Animation for search results */
.animate-fadeIn {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>