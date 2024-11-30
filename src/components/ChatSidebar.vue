<template>
  <aside class="flex flex-col h-full overflow-hidden text-sm">
    <!-- Header with App Name - Fixed -->
    <div class="px-4 py-3 bg-gray-800 dark:bg-gray-900 text-white flex-shrink-0">
      <h1 class="font-medium">狐狸座 AI Chat</h1>
      <p class="text-xs text-gray-400 mt-0.5">Powered by OpenRouter</p>
    </div>

    <!-- Scrollable Content Area -->
    <div class="flex-1 bg-gray-100 dark:bg-gray-800 overflow-y-auto">
      <!-- Scrollable Container -->
      <div class="p-3">
        <!-- New Chat Button - Fixed at Top -->
        <div class="sticky top-0 bg-gray-100 dark:bg-gray-800 pb-3">
          <button @click="clearChat" class="w-full px-3 py-2 flex items-center gap-2 
                         bg-blue-500 hover:bg-blue-600 active:bg-blue-700
                         text-white rounded-lg transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="font-medium">New Chat</span>
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="space-y-4">
          <!-- Chat History Section -->
          <div class="space-y-1">
            <h2 class="px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Recent Chats
            </h2>
            <div class="space-y-0.5">
              <button v-for="chat in chatHistory" :key="chat.id" @click="loadChat(chat.id)" :class="[
                'text-left w-full px-3 py-2 rounded-md text-sm',
                'flex items-center gap-2 transition-colors',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                currentChatId === chat.id
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300'
              ]">
                <svg class="w-4 h-4 opacity-60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <div class="flex-1 min-w-0">
                  <div class="truncate">{{ chat.title || 'Untitled Chat' }}</div>
                  <div class="flex gap-1 mt-0.5">
                    <span v-for="model in getUsedModels(chat)" :key="model"
                      :class="['text-[10px] font-mono', getModelColor(model)]">
                      {{ getShortModelName(model) }}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Models Section -->
          <div class="space-y-1">
            <h2
              class="px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>AI Models</span>
              <div class="flex items-center gap-2">
                <button class="text-xs text-blue-500 hover:text-blue-400 transition-colors"
                  @click="isModelInfoVisible = !isModelInfoVisible">
                  {{ isModelInfoVisible ? 'Hide Info' : 'Show Info' }}
                </button>
                <button class="text-xs text-blue-500 hover:text-blue-400 transition-colors"
                  @click="isModelListExpanded = !isModelListExpanded">
                  {{ isModelListExpanded ? 'Show Less' : 'Show All' }}
                </button>
              </div>
            </h2>
            <div class="space-y-1">
              <button v-for="model in displayedModels" :key="model.id" @click="setModel(model.id)"
                class="group relative w-full" :class="[
                  'text-left px-3 py-2 rounded-md',
                  'flex items-center gap-2 transition-all',
                  'hover:bg-gray-200 dark:hover:bg-gray-700',
                  currentModel === model.id
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white ring-1 ring-blue-500'
                    : 'text-gray-700 dark:text-gray-300'
                ]">
                <!-- Model Icon -->
                <div class="w-4 h-4 opacity-60 flex-shrink-0">
                  <svg v-if="model.id.includes('claude')" class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <svg v-else-if="model.id.includes('gpt-4')" class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <!-- Model Info -->
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate text-xs flex items-center gap-1">
                    {{ model.name }}
                    <a :href="`https://openrouter.ai/${model.id.replace('/', '/')}`" target="_blank"
                      class="opacity-40 hover:opacity-100 transition-opacity" @click.stop>
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </a>
                  </div>
                  <div v-if="isModelInfoVisible" class="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {{ getModelDescription(model.id, model) }}
                  </div>
                </div>

                <!-- Cost Badge -->
                <div class="text-[10px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 
                            text-gray-600 dark:text-gray-400 font-mono whitespace-nowrap min-w-[90px] text-right">
                  {{ getCostIndicator(model.id) }}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer with Version - Fixed -->
    <div class="px-4 py-2 bg-gray-200 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
      <span>v1.0.0</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useOpenRouter } from '../composables/useOpenRouter'

defineProps<{
  chatHistory: any[]
  currentChatId: string | null
  currentModel: string
}>()

const { enabledModels, getModelCost, recentModels, trackModelUsage } = useOpenRouter()

const emit = defineEmits<{
  'clear-chat': []
  'load-chat': [id: string]
  'set-model': [id: string]
}>()

const clearChat = () => emit('clear-chat')
const loadChat = (id: string) => emit('load-chat', id)
const setModel = (id: string) => {
  emit('set-model', id)
  trackModelUsage(id)
}

const isModelInfoVisible = ref(false)
const isModelListExpanded = ref(false)

// Get models to display based on expansion state
const displayedModels = computed(() => {
  if (isModelListExpanded.value) {
    return enabledModels.value;
  }
  // Show recent models, or first 5 enabled if no recent
  return recentModels.value.length > 0
    ? recentModels.value.slice(0, 5)
    : enabledModels.value.slice(0, 5);
})

// Fetch models when component mounts
onMounted(async () => {
  await fetchAvailableModels()
})

function getModelDescription(id: string, model: any): string {
  if (model?.description) {
    return model.description
  }

  if (id.includes('claude-3')) {
    return 'Latest Claude - Most capable for analysis and coding'
  }
  if (id.includes('claude-2')) {
    return 'Reliable model for general tasks and coding'
  }
  if (id.includes('gpt-4')) {
    return 'Advanced reasoning and complex tasks'
  }
  if (id.includes('gpt-3.5')) {
    return 'Fast and efficient for simpler tasks'
  }

  return 'AI model'
}

// Get unique models used in a chat's messages
function getUsedModels(chat: any) {
  if (!chat.messages) return []
  const models = new Set(chat.messages.map((msg: any) => msg.model).filter(Boolean))
  return Array.from(models).slice(0, 3) // Return top 3 models
}

// Get short model name for display
function getShortModelName(modelId: string): string {
  const parts = modelId.split('/')
  const name = parts[parts.length - 1]

  if (name.includes('claude-3')) return 'Claude 3'
  if (name.includes('claude-2')) return 'Claude 2'
  if (name.includes('gpt-4')) return 'GPT-4'
  if (name.includes('gpt-3.5')) return 'GPT-3.5'

  return name.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getModelColor(modelId: string) {
  if (modelId.includes('claude')) return 'text-purple-400'
  if (modelId.includes('gpt-4')) return 'text-green-400'
  if (modelId.includes('gpt-3')) return 'text-blue-400'
  return 'text-gray-400'
}

// Get cost indicator based on actual model pricing
function getCostIndicator(modelId: string): string {
  const cost = getModelCost(modelId);
  if (cost === 0) return '—';

  // Show how many tokens you get per penny ($0.01)
  const tokensPerPenny = Math.round(10000 / cost);
  return `${tokensPerPenny.toLocaleString()}/$0.01`;
}
</script>

<style scoped>
/* Custom scrollbar for chat history */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 2px;
}
</style>