<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useStore } from '../lib/store'
import { useOpenRouter } from '../composables/useOpenRouter'

const props = defineProps<{
  modelValue: boolean
  theme: string
  showProgressBar: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:theme': [value: string]
  'update:showProgressBar': [value: boolean]
  'validate-api-key': [key: string]
}>()

const store = useStore()
const { apiKey, availableModels, sortedAvailableModels, saveApiKey, fetchAvailableModels, enabledModelIds, formatModelCost } = useOpenRouter()

// Initialize preferences with loading state
const preferences = ref({
  rememberWindowState: true,
  minimizeToTray: false,
  showNotifications: true,
  playSounds: true,
  showBadgeCount: true,
  showProgressBar: true
})

const tempApiKey = ref('')

// Add search functionality
const modelSearchQuery = ref('')

// Load preferences from store
onMounted(async () => {
  try {
    // Load preferences
    const [
      rememberWindowState,
      minimizeToTray,
      showNotifications,
      playSounds,
      showBadgeCount,
      showProgressBar,
      storedKey
    ] = await Promise.all([
      store.get('rememberWindowState'),
      store.get('minimizeToTray'),
      store.get('showNotifications'),
      store.get('playSounds'),
      store.get('showBadgeCount'),
      store.get('showProgressBar'),
      store.get('openrouter-api-key')
    ])

    preferences.value = {
      rememberWindowState: Boolean(rememberWindowState ?? true),
      minimizeToTray: Boolean(minimizeToTray ?? false),
      showNotifications: Boolean(showNotifications ?? true),
      playSounds: Boolean(playSounds ?? true),
      showBadgeCount: Boolean(showBadgeCount ?? true),
      showProgressBar: Boolean(showProgressBar ?? true)
    }

    tempApiKey.value = storedKey || ''

    // Fetch models when settings modal opens
    await fetchAvailableModels()
  } catch (error) {
    console.error('Error loading preferences:', error)
  }
})

// Watch for preference changes
watch(preferences, async (newPrefs) => {
  try {
    await Promise.all([
      store.set('rememberWindowState', newPrefs.rememberWindowState),
      store.set('minimizeToTray', newPrefs.minimizeToTray),
      store.set('showNotifications', newPrefs.showNotifications),
      store.set('playSounds', newPrefs.playSounds),
      store.set('showBadgeCount', newPrefs.showBadgeCount),
      store.set('showProgressBar', newPrefs.showProgressBar)
    ])
  } catch (error) {
    console.error('Error saving preferences:', error)
  }
}, { deep: true })

function close() {
  emit('update:modelValue', false)
}

function handleApiKeyChange(event: Event) {
  const key = (event.target as HTMLInputElement).value
  tempApiKey.value = key
  emit('validate-api-key', key)
  saveApiKey(key)
}

function toggleModel(modelId: string) {
  const index = enabledModelIds.value.indexOf(modelId)
  if (index === -1) {
    enabledModelIds.value = [...enabledModelIds.value, modelId]
  } else {
    enabledModelIds.value = enabledModelIds.value.filter(id => id !== modelId)
  }
}

function selectAllModels() {
  if (!availableModels.value) return
  enabledModelIds.value = [...availableModels.value.map(model => model.id)]
}

function deselectAllModels() {
  enabledModelIds.value = []
}

// Format cost display
function formatCost(model: any): string | null {
  if (!model?.pricing) return null;

  // Some models might have different pricing structures
  const prompt = typeof model.pricing.prompt === 'number' ? model.pricing.prompt : null;
  const completion = typeof model.pricing.completion === 'number' ? model.pricing.completion : null;

  // If either price is missing, we can't calculate an average
  if (prompt === null || completion === null) return null;

  // Calculate average cost per 1M tokens
  const avgCost = (prompt + completion) / 2;

  // Show how many tokens you get per penny ($0.01)
  const tokensPerPenny = Math.round(10000 / avgCost);
  return `${tokensPerPenny.toLocaleString()}/$0.01`;
}

// Improved fuzzy search function
function fuzzyMatch(str: string, pattern: string): boolean {
  if (!str || !pattern) return false

  str = str.toLowerCase()
  pattern = pattern.toLowerCase()

  // Direct substring match should always work
  if (str.includes(pattern)) return true

  // For other cases, require consecutive matches
  let lastMatchIndex = -1
  let consecutiveMatches = 0
  const minConsecutiveMatches = 2 // Require at least 2 consecutive characters to match

  for (let i = 0; i < pattern.length; i++) {
    const searchFromIndex = lastMatchIndex + 1
    const matchIndex = str.indexOf(pattern[i], searchFromIndex)

    if (matchIndex === -1) return false

    if (matchIndex === lastMatchIndex + 1) {
      consecutiveMatches++
    } else {
      consecutiveMatches = 1
    }

    lastMatchIndex = matchIndex
  }

  // Return true only if we have enough consecutive matches
  return consecutiveMatches >= minConsecutiveMatches
}

// Filter models based on search query
const filteredModels = computed(() => {
  if (!modelSearchQuery.value) return sortedAvailableModels.value;

  const query = modelSearchQuery.value.trim();
  return sortedAvailableModels.value.filter(model => {
    // Check exact matches first
    const nameExact = model.name.toLowerCase().includes(query.toLowerCase());
    const idExact = model.id.toLowerCase().includes(query.toLowerCase());
    if (nameExact || idExact) return true;

    // Then try fuzzy matches
    const nameFuzzy = fuzzyMatch(model.name, query);
    const idFuzzy = fuzzyMatch(model.id, query);

    // Only include description matches if they're exact
    const descMatch = model.description?.toLowerCase().includes(query.toLowerCase()) || false;

    return nameFuzzy || idFuzzy || descMatch;
  });
});
</script>

<template>
  <div v-if="modelValue"
    class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="flex-shrink-0 px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
        <button @click="close" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <span class="sr-only">Close</span>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 px-6 py-4 overflow-y-auto space-y-6">
        <!-- API Keys Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">API Keys</h3>

          <!-- OpenRouter API Key -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              OpenRouter API Key
            </label>
            <input :value="tempApiKey" @input="handleApiKeyChange" type="password"
              class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener"
                class="text-blue-500 hover:text-blue-400">openrouter.ai/keys</a>
            </p>
          </div>
        </div>

        <!-- Theme Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Appearance</h3>
          <div class="space-y-2">
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
        </div>

        <!-- Progress Bar -->
        <div class="space-y-4">
          <div class="flex items-center">
            <input :checked="showProgressBar"
              @change="$emit('update:showProgressBar', ($event.target as HTMLInputElement).checked)" type="checkbox"
              class="h-4 w-4 text-blue-500 rounded border-gray-300 dark:border-gray-700 focus:ring-blue-500" />
            <label class="ml-2 block text-sm text-gray-900 dark:text-white">
              Show Progress Bar
            </label>
          </div>
        </div>

        <!-- Model Selection -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">Available Models</h3>
            <div class="flex items-center space-x-2">
              <button @click="fetchAvailableModels"
                class="text-sm text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300">
                Refresh List
              </button>
              <span class="text-gray-300 dark:text-gray-600">|</span>
              <button @click="selectAllModels"
                class="text-sm text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300">
                Select All
              </button>
              <button @click="deselectAllModels"
                class="text-sm text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300">
                Deselect All
              </button>
            </div>
          </div>

          <!-- Search Input -->
          <div class="relative">
            <input v-model="modelSearchQuery" type="text" placeholder="Search models..." class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg
                     text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500
                     focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
            <button v-if="modelSearchQuery" @click="modelSearchQuery = ''"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-400">
              <span class="sr-only">Clear search</span>
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <div class="space-y-1.5 max-h-[300px] overflow-y-auto">
            <div v-for="model in filteredModels" :key="model.id"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div class="flex-1 min-w-0 mr-4">
                <div class="flex items-center">
                  <input :id="model.id" type="checkbox" :checked="enabledModelIds.includes(model.id)"
                    @change="toggleModel(model.id)" class="h-4 w-4 text-blue-500 rounded border-gray-300 dark:border-gray-700 
                          focus:ring-1 focus:ring-blue-500 dark:focus:ring-offset-gray-800" />
                  <label :for="model.id"
                    class="ml-2 block text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                    {{ model.name }}
                    <a :href="`https://openrouter.ai/${model.id.replace('/', '/')}`" target="_blank"
                      class="opacity-40 hover:opacity-100 transition-opacity" @click.stop>
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </a>
                  </label>
                </div>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                  {{ model.description }}
                </p>
              </div>
              <div class="text-xs text-right">
                <div class="font-mono text-gray-600 dark:text-gray-300 min-w-[90px]">
                  <template v-if="formatCost(model)">
                    {{ formatCost(model) }}
                  </template>
                  <template v-else>
                    —
                  </template>
                </div>
                <div class="text-gray-500 dark:text-gray-400 mt-1">
                  {{ model.context_length.toLocaleString() }} tokens
                </div>
              </div>
            </div>
          </div>
        </div>
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