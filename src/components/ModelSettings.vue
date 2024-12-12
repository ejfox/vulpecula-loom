<template>
  <div class="space-y-4">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white">Model Settings</h3>

    <!-- Pinned Models Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Pinned Models</h4>
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ pinnedModels.length }}/9 pinned</span>
      </div>

      <!-- Column Headers -->
      <div class="flex items-center gap-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <div class="w-5"></div> <!-- Icon space -->
        <div class="w-48">Model</div>
        <div class="w-20">Context</div>
        <div class="w-40">Price (in/out)</div>
      </div>

      <!-- Pinned Models List -->
      <div class="space-y-2">
        <div v-for="model in pinnedModels" :key="model.id"
          class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="w-5 h-5 flex-shrink-0">
              <div :class="getProviderIcon(model.id)" class="w-5 h-5" />
            </div>
            <span :class="[getModelColor(model.id), 'font-medium text-sm flex-shrink-0 w-48']">
              {{ model.name || getModelDisplayName(model.id) }}
            </span>
            <span v-if="model.context_length"
              class="text-xs text-gray-500 dark:text-gray-400 font-mono w-20 flex-shrink-0">
              {{ formatContextLength(model.context_length) }}
            </span>
            <span class="text-xs font-mono flex-shrink-0 w-32 whitespace-pre leading-tight" :class="[
              model.pricing?.prompt === '0' && model.pricing?.completion === '0'
                ? 'text-green-600 dark:text-green-400 font-medium'
                : 'text-gray-500 dark:text-gray-400'
            ]">
              {{ formatModelCost(model.pricing) }}
            </span>
          </div>
          <button @click="unpinModel(model.id)" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="sr-only">Unpin model</span>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Search and Sort Controls -->
      <div class="mt-6 space-y-3">
        <!-- Search Bar -->
        <div class="relative">
          <input v-model="searchQuery" type="text" placeholder="Search models..." class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
          <div class="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Sort Controls -->
        <div class="flex items-center space-x-2">
          <select v-model="sortBy" class="flex-1 px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg 
                   text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="name">Name</option>
            <option value="promptCost">Prompt Cost</option>
            <option value="completionCost">Completion Cost</option>
            <option value="totalCost">Total Cost</option>
            <option value="contextLength">Context Length</option>
          </select>
          <button @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'" class="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-white dark:bg-gray-800 
                   border border-gray-300 dark:border-gray-700 rounded-lg">
            <span class="sr-only">Toggle sort direction</span>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              :class="{ 'rotate-180': sortDirection === 'desc' }">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9M3 12h5" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Available Models Section -->
      <div class="space-y-4">
        <!-- Sticky Headers -->
        <div class="sticky top-0 bg-white dark:bg-gray-950 pt-4 pb-2 z-10">
          <!-- Provider Label -->
          <div class="flex items-center gap-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <div class="w-5"></div> <!-- Icon space -->
            <div class="w-48">Model</div>
            <div class="w-20">Context</div>
            <div class="w-40">Price (in/out)</div>
          </div>
        </div>

        <!-- Model Groups -->
        <div v-for="(models, provider) in sortedGroupedModels" :key="provider">
          <h5 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            {{ provider }}
          </h5>
          <div class="space-y-1">
            <div v-for="model in models" :key="model.id"
              class="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg">
              <!-- Model Info - Left Side -->
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <!-- Provider Icon -->
                <div class="w-5 h-5 flex-shrink-0">
                  <div :class="getProviderIcon(model.id)" class="w-5 h-5" />
                </div>

                <!-- Model Name -->
                <span :class="[getModelColor(model.id), 'font-medium text-sm flex-shrink-0 w-48']">
                  {{ model.name || getModelDisplayName(model.id) }}
                </span>

                <!-- Context Length -->
                <span v-if="model.context_length"
                  class="text-xs text-gray-500 dark:text-gray-400 font-mono w-20 flex-shrink-0">
                  {{ formatContextLength(model.context_length) }}
                </span>

                <!-- Pricing -->
                <span class="text-xs font-mono flex-shrink-0 w-32 whitespace-pre leading-tight" :class="[
                  model.pricing?.prompt === '0' && model.pricing?.completion === '0'
                    ? 'text-green-600 dark:text-green-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                ]">
                  {{ formatModelCost(model.pricing) }}
                </span>
              </div>

              <!-- Pin Button - Right Side -->
              <button @click="pinModel(model.id)" :disabled="pinnedModels.length >= 9"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 flex-shrink-0"
                :title="pinnedModels.length >= 9 ? 'Maximum 9 models can be pinned' : 'Pin model'">
                <span class="sr-only">Pin model</span>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStore } from '../lib/store'
import Fuse from 'fuse.js'

const store = useStore()

interface Model {
  id: string
  name?: string
  description?: string
  context_length?: number
  pricing?: {
    prompt: string
    completion: string
  }
}

const props = defineProps<{
  availableModels: Model[]
}>()

// Search and sort state
const searchQuery = ref('')
const sortBy = ref<'name' | 'promptCost' | 'completionCost' | 'totalCost' | 'contextLength'>('name')
const sortDirection = ref<'asc' | 'desc'>('asc')

// Load pinned models from store
const pinnedModels = ref<Model[]>([])

// Initialize pinned models from store
const initializePinnedModels = async () => {
  const storedPinnedModels = await store.get('pinned-models') as string[] || []
  pinnedModels.value = props.availableModels.filter(model =>
    storedPinnedModels.includes(model.id)
  )
}

// Save pinned models to store
const savePinnedModels = async () => {
  await store.set('pinned-models', pinnedModels.value.map(model => model.id))
}

// Pin/unpin methods
const pinModel = async (modelId: string) => {
  if (pinnedModels.value.length >= 9) return
  const model = props.availableModels.find(m => m.id === modelId)
  if (model && !pinnedModels.value.some(m => m.id === modelId)) {
    pinnedModels.value.push(model)
    await savePinnedModels()
  }
}

const unpinModel = async (modelId: string) => {
  pinnedModels.value = pinnedModels.value.filter(m => m.id !== modelId)
  await savePinnedModels()
}

// Fuzzy search configuration
const fuseOptions = {
  keys: ['id', 'name', 'description'],
  threshold: 0.4,
  includeScore: true
}

// Sorting functions
const getSortValue = (model: Model) => {
  switch (sortBy.value) {
    case 'name':
      return model.name || getModelDisplayName(model.id)
    case 'promptCost':
      return model.pricing ? parseFloat(model.pricing.prompt) : 0
    case 'completionCost':
      return model.pricing ? parseFloat(model.pricing.completion) : 0
    case 'totalCost':
      if (!model.pricing) return 0
      return parseFloat(model.pricing.prompt) + parseFloat(model.pricing.completion)
    case 'contextLength':
      return model.context_length || 0
    default:
      return ''
  }
}

// Group, filter and sort models
const sortedGroupedModels = computed(() => {
  const unpinnedModels = props.availableModels.filter(
    model => !pinnedModels.value.some(m => m.id === model.id)
  )

  // Apply search if query exists
  let filteredModels = unpinnedModels
  if (searchQuery.value.trim()) {
    const fuse = new Fuse(unpinnedModels, fuseOptions)
    const searchResults = fuse.search(searchQuery.value)
    filteredModels = searchResults.map(result => result.item)
  }

  // Sort models
  filteredModels.sort((a, b) => {
    const aValue = getSortValue(a)
    const bValue = getSortValue(b)

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection.value === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    return sortDirection.value === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number)
  })

  // Group sorted models by provider
  return filteredModels.reduce((acc, model) => {
    const [provider] = model.id.split('/')
    if (!acc[provider]) acc[provider] = []
    acc[provider].push(model)
    return acc
  }, {} as Record<string, Model[]>)
})

// Helper functions
const getModelDisplayName = (modelId: string): string => {
  const model = props.availableModels.find(m => m.id === modelId)
  if (model?.name) return model.name

  const modelName = modelId.split('/').pop() || ''
  return modelName.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

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

const formatModelCost = (pricing?: { prompt: string; completion: string }): string => {
  if (!pricing) return ''

  const promptCost = parseFloat(pricing.prompt)
  const completionCost = parseFloat(pricing.completion)

  if (isNaN(promptCost) || isNaN(completionCost)) return ''

  // If both costs are 0, show as FREE
  if (promptCost === 0 && completionCost === 0) {
    return 'FREE'
  }

  // Helper to format individual costs
  const formatCost = (cost: number): string => {
    if (cost === 0) return 'FREE'

    // For costs that are $0.01 or more per token
    if (cost >= 0.01) {
      return `$${cost.toFixed(2)}/tok`
    }

    // For costs around a penny or less, show in cents per token
    if (cost >= 0.0001) {
      return `${(cost * 100).toFixed(1)}¢/tok`
    }

    // For smaller costs, show in cents per KTok
    const perKTok = cost * 1000 * 100 // Convert to cents per 1000 tokens
    return `${perKTok.toFixed(1)}¢/KTok`
  }

  const promptFormatted = formatCost(promptCost)
  const completionFormatted = formatCost(completionCost)

  // If both costs are the same, show just one number
  if (promptFormatted === completionFormatted) {
    return promptFormatted
  }

  return `${promptFormatted}\n${completionFormatted}`
}

const formatContextLength = (length: number): string => {
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M ctx`
  if (length >= 1000) return `${(length / 1000).toFixed(0)}K ctx`
  return `${length} ctx`
}

const getProviderIcon = (modelId: string): string => {
  const [provider] = modelId.split('/')
  switch (provider.toLowerCase()) {
    case 'anthropic':
      return 'i-simple-icons-anthropic'
    case 'openai':
      return 'i-simple-icons-openai'
    case 'google':
      return 'i-simple-icons-google'
    case 'meta':
      return 'i-simple-icons-meta'
    case 'amazon':
      return 'i-simple-icons-amazon'
    case 'huggingface':
      return 'i-simple-icons-huggingface'
    case 'microsoft':
      return 'i-simple-icons-microsoft'
    default:
      return 'i-carbon-machine-learning-model'
  }
}

// Initialize on mount
initializePinnedModels()
</script>