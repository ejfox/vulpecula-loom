<template>
  <div class="space-y-4">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white">Model Settings</h3>

    <!-- Pinned Models Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Pinned Models</h4>
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ pinnedModels.length }}/9 pinned</span>
      </div>

      <!-- Model Comparison Section (shows when 2 models are selected) -->
      <div v-if="comparisonModels.length === 2" class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Model Comparison</h4>
          <button @click="clearComparison" class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300">
            Clear Comparison
          </button>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div v-for="model in comparisonModels" :key="model.id" class="relative">
            <ModelMetadata :model="model" :compact="false" />
          </div>
        </div>
        
        <!-- Comparison Table -->
        <div class="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-gray-500 dark:text-gray-400">
                <th class="pb-2">Feature</th>
                <th class="pb-2">{{ getModelDisplayName(comparisonModels[0].id) }}</th>
                <th class="pb-2">{{ getModelDisplayName(comparisonModels[1].id) }}</th>
              </tr>
            </thead>
            <tbody class="text-gray-700 dark:text-gray-300">
              <!-- Context Length -->
              <tr>
                <td class="py-1.5 font-medium">Context Length</td>
                <td class="py-1.5">{{ formatContextLength(comparisonModels[0].context_length) }}</td>
                <td class="py-1.5">{{ formatContextLength(comparisonModels[1].context_length) }}</td>
              </tr>
              <!-- Input Cost -->
              <tr>
                <td class="py-1.5 font-medium">Input Cost</td>
                <td class="py-1.5" :class="{ 'text-green-600 dark:text-green-400': isPricingFree(comparisonModels[0].pricing?.prompt) }">
                  {{ formatSinglePrice(comparisonModels[0].pricing?.prompt) }}
                </td>
                <td class="py-1.5" :class="{ 'text-green-600 dark:text-green-400': isPricingFree(comparisonModels[1].pricing?.prompt) }">
                  {{ formatSinglePrice(comparisonModels[1].pricing?.prompt) }}
                </td>
              </tr>
              <!-- Output Cost -->
              <tr>
                <td class="py-1.5 font-medium">Output Cost</td>
                <td class="py-1.5" :class="{ 'text-green-600 dark:text-green-400': isPricingFree(comparisonModels[0].pricing?.completion) }">
                  {{ formatSinglePrice(comparisonModels[0].pricing?.completion) }}
                </td>
                <td class="py-1.5" :class="{ 'text-green-600 dark:text-green-400': isPricingFree(comparisonModels[1].pricing?.completion) }">
                  {{ formatSinglePrice(comparisonModels[1].pricing?.completion) }}
                </td>
              </tr>
              <!-- Vision Support -->
              <tr>
                <td class="py-1.5 font-medium">Vision Support</td>
                <td class="py-1.5">
                  <span v-if="comparisonModels[0].capabilities?.vision" class="text-green-600 dark:text-green-400">
                    <i class="i-carbon-checkmark mr-1"></i> Yes
                  </span>
                  <span v-else class="text-red-600 dark:text-red-400">
                    <i class="i-carbon-close mr-1"></i> No
                  </span>
                </td>
                <td class="py-1.5">
                  <span v-if="comparisonModels[1].capabilities?.vision" class="text-green-600 dark:text-green-400">
                    <i class="i-carbon-checkmark mr-1"></i> Yes
                  </span>
                  <span v-else class="text-red-600 dark:text-red-400">
                    <i class="i-carbon-close mr-1"></i> No
                  </span>
                </td>
              </tr>
              <!-- Tools Support -->
              <tr>
                <td class="py-1.5 font-medium">Tools Support</td>
                <td class="py-1.5">
                  <span v-if="comparisonModels[0].capabilities?.tools" class="text-green-600 dark:text-green-400">
                    <i class="i-carbon-checkmark mr-1"></i> Yes
                  </span>
                  <span v-else class="text-red-600 dark:text-red-400">
                    <i class="i-carbon-close mr-1"></i> No
                  </span>
                </td>
                <td class="py-1.5">
                  <span v-if="comparisonModels[1].capabilities?.tools" class="text-green-600 dark:text-green-400">
                    <i class="i-carbon-checkmark mr-1"></i> Yes
                  </span>
                  <span v-else class="text-red-600 dark:text-red-400">
                    <i class="i-carbon-close mr-1"></i> No
                  </span>
                </td>
              </tr>
              <!-- Function Calling -->
              <tr>
                <td class="py-1.5 font-medium">Function Calling</td>
                <td class="py-1.5">
                  <span v-if="comparisonModels[0].capabilities?.function_calling" class="text-green-600 dark:text-green-400">
                    <i class="i-carbon-checkmark mr-1"></i> Yes
                  </span>
                  <span v-else class="text-red-600 dark:text-red-400">
                    <i class="i-carbon-close mr-1"></i> No
                  </span>
                </td>
                <td class="py-1.5">
                  <span v-if="comparisonModels[1].capabilities?.function_calling" class="text-green-600 dark:text-green-400">
                    <i class="i-carbon-checkmark mr-1"></i> Yes
                  </span>
                  <span v-else class="text-red-600 dark:text-red-400">
                    <i class="i-carbon-close mr-1"></i> No
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pinned Models Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="model in pinnedModels" :key="model.id" class="relative">
          <ModelMetadata :model="model" :compact="true" />
          <div class="absolute top-2 right-2 flex gap-1">
            <!-- Compare Button -->
            <button @click="toggleModelComparison(model)" 
              :class="[
                'p-1 rounded-full transition-colors',
                isModelInComparison(model.id)
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                  : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              ]"
              :disabled="comparisonModels.length >= 2 && !isModelInComparison(model.id)">
              <span class="sr-only">Compare model</span>
              <i class="i-carbon-compare w-4 h-4" />
            </button>
            
            <!-- Unpin Button -->
            <button @click="unpinModel(model.id)" 
              class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white dark:bg-gray-800 rounded-full">
              <span class="sr-only">Unpin model</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Enhanced Search and Filter Controls -->
      <div class="mt-6 space-y-4">
        <!-- Quick Comparison Tip -->
        <div v-if="comparisonModels.length === 0 || comparisonModels.length === 1" 
             class="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center">
          <i class="i-carbon-compare mr-2 w-4 h-4"></i>
          <span>
            <strong>Quick Compare:</strong> 
            {{ comparisonModels.length === 0 
              ? 'Click the compare icon on any two models to see them side by side' 
              : 'Select one more model to compare with ' + getModelDisplayName(comparisonModels[0].id) }}
          </span>
        </div>

        <!-- Search Bar with Fuzzy Search Indicator -->
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input v-model="searchQuery" type="text" placeholder="Search models by name, provider, or features..." 
                 class="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg 
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
          <div class="absolute inset-y-0 right-0 flex items-center pr-3">
            <span v-if="searchQuery" class="text-xs text-blue-500 dark:text-blue-400 font-medium">
              Fuzzy Search
            </span>
          </div>
        </div>

        <!-- Filter Tags -->
        <div class="flex flex-wrap gap-2">
          <button @click="toggleFilter('vision')" 
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded-full transition-colors',
                    activeFilters.includes('vision') 
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  ]">
            <i class="i-carbon-camera mr-1 w-3 h-3"></i>
            Vision
          </button>
          <button @click="toggleFilter('tools')" 
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded-full transition-colors',
                    activeFilters.includes('tools') 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  ]">
            <i class="i-carbon-tools mr-1 w-3 h-3"></i>
            Tools
          </button>
          <button @click="toggleFilter('function_calling')" 
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded-full transition-colors',
                    activeFilters.includes('function_calling') 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  ]">
            <i class="i-carbon-function mr-1 w-3 h-3"></i>
            Function Calling
          </button>
          <button @click="toggleFilter('free')" 
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded-full transition-colors',
                    activeFilters.includes('free') 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  ]">
            <i class="i-carbon-currency-dollar mr-1 w-3 h-3"></i>
            Free
          </button>
          <button v-if="activeFilters.length > 0" @click="clearFilters" 
                  class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <i class="i-carbon-close mr-1 w-3 h-3"></i>
            Clear Filters
          </button>
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

      <!-- Search Results Stats -->
      <div v-if="searchQuery || activeFilters.length > 0" class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
        <span>{{ filteredModelsCount }} models found</span>
        <span v-if="searchQuery">Searching for "{{ searchQuery }}"</span>
      </div>

      <!-- Available Models Section -->
      <div class="space-y-4">
        <!-- Model Groups -->
        <div v-for="(models, provider) in sortedGroupedModels" :key="provider" class="space-y-3">
          <h5 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
            {{ provider }}
            <span class="ml-2 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              {{ models.length }}
            </span>
          </h5>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="model in models" :key="model.id" class="relative">
              <ModelMetadata :model="model" :compact="true" />
              
              <!-- Action Buttons -->
              <div class="absolute top-2 right-2 flex gap-1">
                <!-- Compare Button -->
                <button @click="toggleModelComparison(model)" 
                  :class="[
                    'p-1 rounded-full transition-colors',
                    isModelInComparison(model.id)
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                      : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  ]"
                  :disabled="comparisonModels.length >= 2 && !isModelInComparison(model.id)">
                  <span class="sr-only">Compare model</span>
                  <i class="i-carbon-compare w-4 h-4" />
                </button>
                
                <!-- Vision Model Toggle -->
                <button v-if="model.capabilities?.vision"
                  @click="setPreferredVisionModel(model.id)"
                  :class="[
                    'p-1 rounded-full transition-colors',
                    preferredVisionModel === model.id
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  ]"
                  :title="preferredVisionModel === model.id ? 'Current vision model' : 'Set as preferred vision model'">
                  <span class="sr-only">{{ preferredVisionModel === model.id ? 'Current vision model' : 'Set as preferred vision model' }}</span>
                  <i class="i-carbon-camera w-4 h-4" />
                </button>

                <!-- Pin Button -->
                <button @click="pinModel(model.id)" :disabled="pinnedModels.length >= 9"
                  class="p-1 bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 rounded-full"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { OpenRouterModel } from '../types'
import { useStore } from '../lib/store'
import Fuse from 'fuse.js'
import logger from '../lib/logger'
import ModelMetadata from './ModelMetadata.vue'

const store = useStore()

interface Props {
  availableModels: OpenRouterModel[];
}

const props = defineProps<Props>();

// Debug watcher for availableModels
watch(() => props.availableModels, (newModels) => {
  logger.debug('Models updated', { count: newModels?.length })
}, { immediate: true, deep: true })

const pinnedModels = ref<OpenRouterModel[]>([])
const searchQuery = ref('')
const sortBy = ref<'name' | 'promptCost' | 'completionCost' | 'totalCost' | 'contextLength'>('name')
const sortDirection = ref<'asc' | 'desc'>('asc')
const preferredVisionModel = ref('')
const activeFilters = ref<string[]>([])
const comparisonModels = ref<OpenRouterModel[]>([])

// Initialize pinned models
const initializePinnedModels = async () => {
  try {
    const store = window.electron?.store;
    if (!store) return;
    
    const pinnedIds = (await store.get('pinned-models')) || [];
    const pinned = props.availableModels.filter(model => pinnedIds.includes(model.id));
    pinnedModels.value = pinned;
  } catch (err) {
    logger.error('Failed to initialize pinned models', err);
  }
};

// Watch for changes in available models to re-initialize pinned models
watch(() => props.availableModels, async () => {
  if (props.availableModels.length > 0) {
    await initializePinnedModels()
  }
}, { immediate: true })

// Pin/unpin model functions
const pinModel = async (modelId: string) => {
  const model = props.availableModels.find(m => m.id === modelId);
  if (!model) return;

  const store = window.electron?.store;
  if (!store) return;

  const pinnedIds = (await store.get('pinned-models')) || [];
  if (!pinnedIds.includes(modelId)) {
    await store.set('pinned-models', [...pinnedIds, modelId]);
    pinnedModels.value.push(model);
  }
};

const unpinModel = async (modelId: string) => {
  const store = window.electron?.store;
  if (!store) return;

  const pinnedIds = (await store.get('pinned-models')) || [];
  await store.set('pinned-models', pinnedIds.filter((id: string) => id !== modelId));
  pinnedModels.value = pinnedModels.value.filter(model => model.id !== modelId);
};

// Toggle filter function
const toggleFilter = (filter: string) => {
  if (activeFilters.value.includes(filter)) {
    activeFilters.value = activeFilters.value.filter(f => f !== filter)
  } else {
    activeFilters.value.push(filter)
  }
}

// Clear all filters
const clearFilters = () => {
  activeFilters.value = []
}

// Get unpinned models
const unpinnedModels = computed(() => {
  return props.availableModels.filter(
    model => !pinnedModels.value.some(m => m.id === model.id)
  )
})

// Apply filters to models
const applyFilters = (models: OpenRouterModel[]) => {
  if (activeFilters.value.length === 0) return models
  
  return models.filter(model => {
    // Check for capability filters
    const hasVision = activeFilters.value.includes('vision') ? model.capabilities?.vision : true
    const hasTools = activeFilters.value.includes('tools') ? model.capabilities?.tools : true
    const hasFunctionCalling = activeFilters.value.includes('function_calling') ? model.capabilities?.function_calling : true
    
    // Check for free models
    const isFree = activeFilters.value.includes('free') 
      ? (model.pricing && (parseFloat(model.pricing.prompt) === 0 || parseFloat(model.pricing.completion) === 0))
      : true
    
    return (
      (!activeFilters.value.includes('vision') || hasVision) &&
      (!activeFilters.value.includes('tools') || hasTools) &&
      (!activeFilters.value.includes('function_calling') || hasFunctionCalling) &&
      (!activeFilters.value.includes('free') || isFree)
    )
  })
}

// Sort and filter models
const filteredModels = computed(() => {
  let models = [...unpinnedModels.value]
  
  // Apply filters
  models = applyFilters(models)
  
  // Apply search filter if there's a query
  if (searchQuery.value.trim()) {
    const fuse = new Fuse(models, fuseOptions)
    const results = fuse.search(searchQuery.value)
    models = results.map(result => result.item)
  }
  
  // Sort models
  models.sort((a: OpenRouterModel, b: OpenRouterModel) => {
    const aValue = getSortValue(a)
    const bValue = getSortValue(b)

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection.value === 'asc' ?
        aValue.localeCompare(bValue) :
        bValue.localeCompare(aValue)
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection.value === 'asc' ?
        aValue - bValue :
        bValue - aValue
    }

    return 0
  })
  
  return models
})

// Count of filtered models for stats display
const filteredModelsCount = computed(() => {
  return Object.values(sortedGroupedModels.value).reduce((acc, models) => acc + models.length, 0)
})

// Group models by provider
const sortedGroupedModels = computed(() => {
  const models = filteredModels.value
  
  const grouped = models.reduce((acc: Record<string, OpenRouterModel[]>, model: OpenRouterModel) => {
    const [provider] = model.id.split('/')
    if (!acc[provider]) acc[provider] = []
    acc[provider].push(model)
    return acc
  }, {})
  
  return grouped
})

// Sorting functions
const getSortValue = (model: OpenRouterModel) => {
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

// Helper functions
const getModelDisplayName = (modelId: string): string => {
  const model = props.availableModels.find(m => m.id === modelId)
  if (model?.name) return model.name

  const modelName = modelId.split('/').pop() || ''
  return modelName.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// Initialize on mount
onMounted(async () => {
  logger.debug('ModelSettings mounted');
  if (props.availableModels.length > 0) {
    await initializePinnedModels();
  }

  const store = window.electron?.store;
  if (!store) return;

  try {
    // Initialize with null if not set
    if (!(await store.get('preferred-vision-model'))) {
      await store.set('preferred-vision-model', null);
    }
    const storedModel = await store.get('preferred-vision-model');
    if (storedModel) {
      preferredVisionModel.value = storedModel;
    }
  } catch (err) {
    logger.error('Failed to load preferred vision model', err);
    // Ensure we have a valid initial state
    await store.set('preferred-vision-model', null);
  }
});

const setPreferredVisionModel = async (modelId: string) => {
  const store = window.electron?.store;
  if (!store) return;

  try {
    // Ensure we're setting a valid string or null
    if (modelId && typeof modelId === 'string' && modelId.trim()) {
      await store.set('preferred-vision-model', modelId);
      preferredVisionModel.value = modelId;
    } else {
      await store.set('preferred-vision-model', null);
      preferredVisionModel.value = '';
    }
  } catch (err) {
    logger.error('Failed to set preferred vision model', err);
  }
};

// Fuzzy search configuration
const fuseOptions = {
  keys: ['id', 'name', 'description'],
  threshold: 0.4,
  includeScore: true,
  // Add more weight to name matches
  fieldNormWeight: 2.0
}

// Model comparison functions
const toggleModelComparison = (model: OpenRouterModel) => {
  const index = comparisonModels.value.findIndex(m => m.id === model.id)
  
  if (index >= 0) {
    // Remove from comparison
    comparisonModels.value.splice(index, 1)
  } else if (comparisonModels.value.length < 2) {
    // Add to comparison
    comparisonModels.value.push(model)
  }
}

const isModelInComparison = (modelId: string): boolean => {
  return comparisonModels.value.some(model => model.id === modelId)
}

const clearComparison = () => {
  comparisonModels.value = []
}

// Helper functions for comparison
const formatContextLength = (length: number): string => {
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
  if (length >= 1000) return `${(length / 1000).toFixed(0)}K`;
  return `${length}`;
}

const isPricingFree = (price?: string): boolean => {
  if (!price) return false;
  const numPrice = parseFloat(price);
  return numPrice === 0;
}

const formatSinglePrice = (price?: string): string => {
  if (!price) return '-';
  
  const numPrice = parseFloat(price);
  
  if (isNaN(numPrice)) return '-';
  
  // If price is 0, show as FREE
  if (numPrice === 0) {
    return 'FREE';
  }
  
  // For costs that are $0.01 or more per token
  if (numPrice >= 0.01) {
    return `$${numPrice.toFixed(2)}/tok`;
  }
  
  // For costs around a penny or less, show in cents per token
  if (numPrice >= 0.0001) {
    return `${(numPrice * 100).toFixed(1)}¢/tok`;
  }
  
  // For smaller costs, show in cents per thousand tokens
  if (numPrice >= 0.0000001) {
    return `${(numPrice * 100000).toFixed(1)}¢/KTok`;
  }
  
  // For tiny costs, show in cents per million tokens
  return `${(numPrice * 100000000).toFixed(1)}¢/MTok`;
}
</script>