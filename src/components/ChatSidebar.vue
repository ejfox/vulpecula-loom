<template>
  <aside class="flex flex-col h-full overflow-hidden text-sm bg-white dark:bg-gray-950">
    <!-- Header -->
    <div class="px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 app-drag-region">
      <h1 class="font-medium text-gray-900 dark:text-white select-none">Vulpecula</h1>
      <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5 select-none">Powered by OpenRouter</p>
    </div>

    <!-- Scrollable Content Area -->
    <div class="flex-1 overflow-y-auto p-3 space-y-4">
      <!-- New Chat Button -->
      <div class="sticky top-0 bg-white dark:bg-gray-950 pb-3 z-50">
        <div class="flex gap-2">
          <button @click="emit('new-chat')" class="flex-1 px-3 py-2 flex items-center justify-center gap-2 
                   bg-blue-500 hover:bg-blue-600 
                   text-white rounded-lg transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="font-medium">New Chat</span>
          </button>

          <ChatImport class="flex-shrink-0" />
        </div>
      </div>

      <!-- Chat List -->
      <div class="space-y-4 relative">
        <!-- Threaded Chats -->
        <div v-for="(chats, threadId) in groupedChats" :key="threadId" class="space-y-1 relative">
          <!-- Thread Header -->
          <div v-if="threadId !== 'unthreaded'"
            class="px-2 text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider flex items-center">
            <span class="flex-1">{{ chats[0]?.metadata.thread?.name || 'Untitled Thread' }}</span>
            <span class="text-gray-400">{{ chats.length }}</span>
          </div>

          <!-- Chats in Thread -->
          <TransitionGroup name="chat-list" tag="div" class="space-y-1 relative">
            <div v-for="chat in chats" :key="chat.id"
              class="group relative flex items-center px-3 py-2 rounded-md cursor-pointer" :class="[
                currentChatId === chat.id
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-blue-500/50'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900',
                chat.metadata.fork?.parentId ? 'border-l-2 border-blue-500/20' : ''
              ]" :style="{ paddingLeft: `${getIndentLevel(chat) * 16 + 12}px` }">

              <!-- Click handler on main content -->
              <div class="flex-1 flex items-center min-w-0" @click="emit('load-chat', chat.id)">
                <!-- Fork Indicator -->
                <div v-if="chat.metadata.fork?.parentId"
                  class="absolute -left-0.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500/40">
                </div>



                <!-- Chat Info -->
                <div class="flex-1 min-w-0 ml-0.5 overflow-hidden">
                  <div class="flex items-center gap-0.5">
                    <span class="flex-1 truncate font-medium">
                      {{ chat.title || 'Untitled Chat' }}
                    </span>
                    <span v-if="chat.metadata?.stats" class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                      {{ formatNumber(getTokenStats(chat).tokens) }}t
                    </span>
                  </div>
                  <div class="text-xs truncate flex items-center gap-2">
                    <span :class="getModelColor(chat.model)">
                      {{ getModelDisplayName(chat.model) }}
                    </span>
                    <span v-if="chat.metadata.fork?.parentId" class="text-blue-400/80">
                      (Forked)
                    </span>
                  </div>
                  <div class="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <!-- Age -->
                    <span class="flex items-center gap-1 min-w-24">
                      <!--                       <svg class="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg> -->
                      {{ formatChatAge(chat.metadata?.lastUpdated || chat.created_at) }}
                    </span>
                    <!-- Message Count -->
                    <span class="flex items-center gap-1">
                      <svg class="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span class="relative">
                        {{ getMessageCounts(chat).human }}+{{ getMessageCounts(chat).ai }}
                        <span
                          class="absolute -top-8 left-0 bg-gray-900 dark:bg-gray-700 text-white px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {{ getMessageCounts(chat).human }} human messages
                        </span>
                      </span>
                      <span class="opacity-50">
                        ({{ getMessageCounts(chat).human }}+{{ getMessageCounts(chat).ai }})
                        <span
                          class="absolute -top-8 left-0 bg-gray-900 dark:bg-gray-700 text-white px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {{ getMessageCounts(chat).ai }} AI messages
                        </span>
                      </span>
                    </span>
                    <!-- Token Stats -->
                    <span class="flex items-center gap-1">
                      <svg class="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ formatNumber(getTokenStats(chat).tokens) }}t
                      <span class="opacity-50">${{ getTokenStats(chat).cost.toFixed(4) }}</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Actions Dropdown -->
              <div class="relative flex-shrink-0">
                <button @click.stop="activeDropdown = activeDropdown === chat.id ? null : chat.id" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 
                         opacity-0 group-hover:opacity-100 focus:opacity-100 
                         transition-opacity">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                <!-- Dropdown Menu -->
                <div v-if="activeDropdown === chat.id"
                  class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div class="py-1">
                    <button @click.stop="emit('delete-chat', chat.id)" class="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 
                             hover:bg-gray-100 dark:hover:bg-gray-700 text-left">
                      Delete Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <!-- Model Selector -->
    <div class="flex-shrink-0 p-4 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <select :value="currentModel" @change="handleModelChange"
        class="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <template v-if="availableModels">
          <optgroup v-for="(models, provider) in groupedModels" :key="provider" :label="provider.toUpperCase()">
            <option v-for="model in models" :key="model.id" :value="model.id">
              {{ model.name || getModelDisplayName(model.id) }}
            </option>
          </optgroup>
        </template>
        <option v-else value="" disabled>Loading models...</option>
      </select>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Chat, OpenRouterModel } from '../types'
import { useStore } from '../lib/store'
import logger from '../lib/logger'
import ChatImport from './ChatImport.vue'
import { formatDistanceToNow } from 'date-fns'

const props = defineProps<{
  chatHistory: Chat[]
  currentChatId: string | null
  currentModel: string
  availableModels: OpenRouterModel[]
  showOnlyPinnedModels?: boolean
}>()

const emit = defineEmits(['new-chat', 'load-chat', 'set-model', 'delete-chat'])

// Add local ref for model selection
const selectedModel = ref(props.currentModel)

// Watch for prop changes
watch(() => props.currentModel, (newValue) => {
  selectedModel.value = newValue
})

// Handle model change
const handleModelChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  if (target) {
    emit('set-model', target.value)
  }
}

// Group chats by thread
const groupedChats = computed(() => {
  const groups: Record<string, Chat[]> = {
    unthreaded: []
  }

  // First pass: collect parent chats and unthreaded chats
  props.chatHistory.forEach(chat => {
    if (chat.thread) {
      if (!groups[chat.thread]) {
        groups[chat.thread] = []
      }
      groups[chat.thread].push(chat)
    } else if (!chat.metadata.fork?.parentId) {
      groups.unthreaded.push(chat)
    }
  })

  // Second pass: organize forked chats under their parents
  props.chatHistory.forEach(chat => {
    const fork = chat.metadata.fork
    if (fork?.parentId) {
      const parentChat = props.chatHistory.find(c => c.id === fork.parentId)
      if (parentChat) {
        const targetGroup = parentChat.thread ? groups[parentChat.thread] : groups.unthreaded
        const parentIndex = targetGroup.findIndex(c => c.id === fork.parentId)
        if (parentIndex !== -1) {
          // Insert forked chat right after its parent
          targetGroup.splice(parentIndex + 1, 0, chat)
        }
      }
    }
  })

  return groups
})

const getIndentLevel = (chat: Chat) => {
  return chat.metadata.fork?.forkDepth || 0
}

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(new Date(date))
}

// Update the model display names
const getModelDisplayName = (modelId: string): string => {
  if (!props.availableModels) return modelId

  const model = props.availableModels.find(m => m.id === modelId)
  if (model?.name) return model.name

  const modelName = modelId.split('/').pop() || ''
  return modelName.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// Add helper function to get model color
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

// Add helper function for number formatting
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// Add ref for active dropdown
const activeDropdown = ref<string | null>(null)

// Add click outside handler
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (activeDropdown.value) {
      activeDropdown.value = null
    }
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})

const store = useStore()

// Add state for pinned model IDs
const pinnedModelIds = ref<string[]>([])

// Watch for changes in pinned models
watch(pinnedModelIds, async (newIds) => {
  logger.debug('Pinned models updated', { count: newIds.length })
  await loadPinnedModels()
})

const loadPinnedModels = async () => {
  try {
    const stored = await store.get('pinned-models')
    pinnedModelIds.value = stored ?? []
  } catch (err) {
    logger.error('Failed to load pinned models', err)
  }
}

// Group and filter models
const filteredModels = computed(() => {
  if (!props.availableModels) return []

  if (props.showOnlyPinnedModels) {
    return props.availableModels.filter(model =>
      pinnedModelIds.value?.includes(model.id)
    )
  }

  return props.availableModels
})

// Group models by provider
const groupedModels = computed(() => {
  if (!props.availableModels) return {}

  // Filter models based on pinned status if needed
  const models = props.showOnlyPinnedModels
    ? props.availableModels.filter(model => pinnedModelIds.value.includes(model.id))
    : props.availableModels

  return models.reduce((groups: Record<string, OpenRouterModel[]>, model) => {
    const [provider] = model.id.split('/')
    if (!groups[provider]) {
      groups[provider] = []
    }
    groups[provider].push(model)
    return groups
  }, {})
})

// Add helper function for chat age
const formatChatAge = (date: string | undefined) => {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// Add helper function for message counts
const getMessageCounts = (chat: Chat) => {
  const messages = chat.messages || []
  return {
    human: messages.filter(m => m.role === 'user').length,
    ai: messages.filter(m => m.role === 'assistant').length,
    total: messages.length
  }
}

// Add helper function for token stats
const getTokenStats = (chat: Chat) => {
  const stats = chat.metadata?.stats || { promptTokens: 0, completionTokens: 0, cost: 0 }
  return {
    tokens: (stats.promptTokens || 0) + (stats.completionTokens || 0),
    cost: stats.cost || 0
  }
}
</script>

<style scoped>
/* Simple chat list transitions */
.chat-list-move,
.chat-list-enter-active,
.chat-list-leave-active {
  transition: all 0.3s ease;
}

.chat-list-enter-from,
.chat-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.chat-list-leave-active {
  position: absolute;
  width: calc(100% - 1.5rem);
}

/* Basic scrollbar styling */
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

/* Add app drag region */
.app-drag-region {
  -webkit-app-region: drag;
  app-region: drag;
}

/* Make sure buttons and interactive elements within the drag region are still clickable */
.app-drag-region button,
.app-drag-region input,
.app-drag-region select {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}
</style>