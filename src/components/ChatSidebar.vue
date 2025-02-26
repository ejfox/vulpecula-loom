<template>
  <aside class="flex flex-col h-full overflow-hidden text-sm bg-white dark:bg-gray-950">
    <!-- Header -->
    <div class="px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 app-drag-region">
      <h1 class="font-medium text-gray-900 dark:text-white select-none">Vulpecula</h1>
      <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5 select-none">Powered by OpenRouter</p>
    </div>

    <!-- Search and Actions Bar -->
    <div
      class="sticky top-0 bg-white dark:bg-gray-950 p-3 z-50 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <!-- Search Input -->
      <div class="relative mb-2">
        <input v-model="searchQuery" placeholder="Search chats..." class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
                 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <!-- Action Buttons -->
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

    <!-- Scrollable Content Area -->
    <div class="flex-1 overflow-y-auto p-3 space-y-4">
      <!-- Loading State -->
      <div v-if="isGeneratingSummaries" class="flex items-center justify-center py-4 text-gray-500 dark:text-gray-400">
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        Generating summaries...
      </div>

      <!-- Empty State -->
      <div v-if="filteredChats.length === 0 && !isGeneratingSummaries"
        class="flex flex-col items-center justify-center py-8 text-center">
        <svg class="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3 class="text-gray-500 dark:text-gray-400 font-medium">
          {{ searchQuery ? 'No chats found' : 'No chats yet' }}
        </h3>
        <p class="text-gray-400 dark:text-gray-500 text-sm mt-1">
          {{ searchQuery ? 'Try a different search term' : 'Start a new conversation' }}
        </p>
        <button @click="emit('new-chat')"
          class="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
          Start New Chat
        </button>
      </div>

      <!-- Chat List -->
      <div v-if="filteredChats.length > 0" class="space-y-4 relative">
        <!-- Threaded Chats -->
        <div v-for="(chats, threadId) in groupedFilteredChats" :key="threadId" class="space-y-2 relative">
          <!-- Thread Header -->
          <div v-if="threadId !== 'unthreaded' && chats.length > 0"
            class="px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider flex items-center bg-gray-50 dark:bg-gray-900 rounded">
            <span class="flex-1">{{ chats[0]?.metadata.thread?.name || 'Untitled Thread' }}</span>
            <span class="text-gray-400 bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded-full text-xs">
              {{ chats.length }}
            </span>
          </div>

          <!-- Chats in Thread -->
          <TransitionGroup name="chat-list" tag="div" class="space-y-2 relative">
            <div v-for="chat in chats" :key="chat.id"
              class="group flex flex-col rounded-lg overflow-hidden cursor-pointer border dark:border-gray-800 hover:shadow-md transition-all duration-200"
              :class="[
                currentChatId === chat.id
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-gray-800/50 ring-1 ring-blue-400/30'
                  : 'border-gray-200 dark:hover:bg-gray-900/50',
                chat.metadata.fork?.parentId ? 'border-l-2 border-l-blue-500/30' : ''
              ]" :style="{ marginLeft: `${getIndentLevel(chat) * 12}px` }">

              <!-- Chat Card Header -->
              <div
                class="flex items-center px-3 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800"
                @click="emit('load-chat', chat.id)">

                <!-- Model Icon/Indicator -->
                <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-2"
                  :class="getModelBackgroundColor(chat.model)">
                  <span class="text-white text-xs font-medium">{{ getModelInitials(chat.model) }}</span>
                </div>

                <!-- Title Area -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1">
                    <h3 class="font-medium text-gray-900 dark:text-white truncate">
                      {{ chat.title || 'Untitled Chat' }}
                    </h3>
                    <div v-if="chat.metadata.fork?.parentId"
                      class="flex-shrink-0 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                      Fork
                    </div>
                  </div>
                  <!-- Timestamp -->
                  <div class="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ formatChatAge(chat.metadata?.lastUpdated || chat.created_at) }}
                  </div>
                </div>

                <!-- Stats & Actions -->
                <div class="flex-shrink-0 flex items-center gap-2">
                  <!-- Message Count Badge -->
                  <div
                    class="flex items-center px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                    <svg class="w-3 h-3 mr-1 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {{ getMessageCounts(chat).total }}
                  </div>

                  <!-- Actions Menu -->
                  <div class="relative">
                    <button @click.stop="activeDropdown = activeDropdown === chat.id ? null : chat.id"
                      class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    <!-- Dropdown Menu -->
                    <div v-if="activeDropdown === chat.id"
                      class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <div class="py-1">
                        <button @click.stop="regenerateSummary(chat)"
                          class="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left flex items-center">
                          <svg class="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regenerate Summary
                        </button>
                        <button @click.stop="emit('delete-chat', chat.id)"
                          class="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-left flex items-center">
                          <svg class="w-4 h-4 mr-2 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Chat
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Chat Summary -->
              <div class="px-3 py-2 bg-white dark:bg-gray-950" @click="emit('load-chat', chat.id)">
                <div v-if="isSummaryLoading(chat.id)"
                  class="flex items-center text-gray-500 dark:text-gray-400 text-xs">
                  <div class="animate-pulse w-full h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                </div>
                <div v-else-if="chatSummaries[chat.id]" class="text-gray-700 dark:text-gray-300 text-sm">
                  <p>{{ chatSummaries[chat.id] }}</p>
                </div>
                <div v-else class="text-gray-500 dark:text-gray-500 text-xs italic">
                  No summary available
                </div>
              </div>

              <!-- Chat Footer/Stats -->
              <div
                class="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3"
                @click="emit('load-chat', chat.id)">
                <!-- Model Used -->
                <div class="flex items-center" :class="getModelColor(chat.model)">
                  <span class="font-medium">{{ getModelDisplayName(chat.model) }}</span>
                </div>

                <!-- Has Images/Documents indicator -->
                <div v-if="hasAttachments(chat)" class="flex items-center">
                  <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Media</span>
                </div>

                <!-- Token Stats -->
                <div class="flex items-center ml-auto">
                  <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="tabular-nums font-medium">{{ formatNumber(getTokenStats(chat).tokens) }}</span>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Chat, ChatMessage } from '../types'
import { useStore } from '../lib/store'
import { useOpenRouter } from '../composables/useOpenRouter'
import logger from '../lib/logger'
import ChatImport from './ChatImport.vue'
import { formatDistanceToNow } from 'date-fns'

const props = defineProps<{
  chatHistory: Chat[]
  currentChatId: string | null
}>()

const emit = defineEmits(['new-chat', 'load-chat', 'delete-chat', 'rename-chat'])

const openRouter = useOpenRouter()
const chatSummaries = ref<Record<string, string>>({})
const summaryLoadingIds = ref<Set<string>>(new Set())
const isGeneratingSummaries = ref(false)
const searchQuery = ref('')

// Filtered chats based on search
const filteredChats = computed(() => {
  if (!searchQuery.value.trim()) return props.chatHistory

  const query = searchQuery.value.toLowerCase()
  return props.chatHistory.filter(chat => {
    // Search in title
    if (chat.title?.toLowerCase().includes(query)) return true

    // Search in summary
    if (chatSummaries.value[chat.id]?.toLowerCase().includes(query)) return true

    // Search in the first few messages
    const firstFewMessages = chat.messages.slice(0, 3)
    return firstFewMessages.some(msg => msg.content.toLowerCase().includes(query))
  })
})

// Group chats by thread with search filtering applied
const groupedFilteredChats = computed(() => {
  const groups: Record<string, Chat[]> = {
    unthreaded: []
  }

  // First pass: collect parent chats and unthreaded chats
  filteredChats.value.forEach(chat => {
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
  filteredChats.value.forEach(chat => {
    const fork = chat.metadata.fork
    if (fork?.parentId) {
      const parentChat = filteredChats.value.find(c => c.id === fork.parentId)
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

// Check if a summary is currently loading
const isSummaryLoading = (chatId: string) => {
  return summaryLoadingIds.value.has(chatId)
}

// Check if a chat has image or document attachments
const hasAttachments = (chat: Chat) => {
  for (const message of chat.messages) {
    if (message.includedFiles && message.includedFiles.length > 0) {
      return true
    }

    // Also check for inline images in content
    if (message.content.includes('data:image/') ||
      message.content.includes('![') ||
      message.content.includes('<img')) {
      return true
    }
  }
  return false
}

// Generate a summary for a single chat
const generateSummaryForChat = async (chat: Chat) => {
  // Skip if already has a recent summary (less than 24 hours old)
  const lastSummaryTime = chat.metadata.summaryLastUpdated ? new Date(chat.metadata.summaryLastUpdated).getTime() : 0
  const isRecent = lastSummaryTime > Date.now() - 24 * 60 * 60 * 1000

  if (chat.metadata.summary && isRecent && !summaryLoadingIds.value.has(chat.id)) {
    chatSummaries.value[chat.id] = chat.metadata.summary
    return
  }

  // Start loading state
  summaryLoadingIds.value.add(chat.id)

  try {
    // Get summary from OpenRouter
    const summary = await openRouter.generateChatSummary(chat.messages)

    if (summary) {
      chatSummaries.value[chat.id] = summary

      // Store summary in chat metadata for persistence
      const updatedMetadata = {
        ...chat.metadata,
        summary,
        summaryLastUpdated: new Date().toISOString()
      }

      // Save to store with error handling
      try {
        const store = useStore()
        // Using 'as any' because the type system doesn't correctly recognize the indexed signature in StoreSchema
        await store.set(`chat-summary-${chat.id}` as any, {
          summary,
          updatedAt: new Date().toISOString()
        })
      } catch (storeError) {
        logger.error('Failed to save summary to store', { chatId: chat.id, error: storeError })
        // Still keep the summary in memory even if storage fails
      }
    }
  } catch (error) {
    logger.error('Failed to generate summary', { chatId: chat.id, error })
  } finally {
    summaryLoadingIds.value.delete(chat.id)
  }
}

// Regenerate summary for a specific chat
const regenerateSummary = async (chat: Chat) => {
  if (summaryLoadingIds.value.has(chat.id)) return

  summaryLoadingIds.value.add(chat.id)
  try {
    const summary = await openRouter.generateChatSummary(chat.messages)
    if (summary) {
      chatSummaries.value[chat.id] = summary

      // Save to store with error handling
      try {
        const store = useStore()
        // Using 'as any' because the type system doesn't correctly recognize the indexed signature in StoreSchema
        await store.set(`chat-summary-${chat.id}` as any, {
          summary,
          updatedAt: new Date().toISOString()
        })
      } catch (storeError) {
        logger.error('Failed to save summary to store', { chatId: chat.id, error: storeError })
        // Still keep the summary in memory even if storage fails
      }
    }
  } catch (error) {
    logger.error('Failed to regenerate summary', { chatId: chat.id, error })
  } finally {
    summaryLoadingIds.value.delete(chat.id)
  }
}

// Generate summaries for all visible chats
const generateAllSummaries = async () => {
  if (isGeneratingSummaries.value) return

  isGeneratingSummaries.value = true
  try {
    // Load existing summaries from storage first
    const store = useStore()
    for (const chat of props.chatHistory) {
      try {
        // Wrap store.get in a try-catch to handle any JSON parsing errors
        let storedSummary = null
        try {
          // Using 'as any' because the type system doesn't correctly recognize the indexed signature in StoreSchema
          storedSummary = await store.get(`chat-summary-${chat.id}` as any)
        } catch (storeError) {
          logger.error('Failed to parse summary from store', { chatId: chat.id, error: storeError })
          continue // Skip this chat and move to the next one
        }

        // Check if the stored summary is valid and has a summary property
        if (storedSummary && typeof storedSummary === 'object' && storedSummary !== null && 'summary' in storedSummary) {
          chatSummaries.value[chat.id] = storedSummary.summary
        }
      } catch (error) {
        logger.error('Failed to load summary from store', { chatId: chat.id, error })
      }
    }

    // Generate missing summaries (up to 10 in parallel)
    const chatsNeedingSummaries = props.chatHistory.filter(
      chat => !chatSummaries.value[chat.id] && chat.messages.length > 1
    ).slice(0, 10) // Limit to 10 chats at a time

    if (chatsNeedingSummaries.length > 0) {
      await Promise.all(
        chatsNeedingSummaries.map(chat => generateSummaryForChat(chat))
      )
    }
  } catch (error) {
    logger.error('Failed to generate summaries', error)
  } finally {
    isGeneratingSummaries.value = false
  }
}

const getIndentLevel = (chat: Chat) => {
  return chat.metadata.fork?.forkDepth || 0
}

const formatChatAge = (date: string | undefined) => {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// Get model display name and styling
const getModelDisplayName = (modelId: string): string => {
  const modelName = modelId.split('/').pop() || ''
  return modelName.charAt(0).toUpperCase() + modelName.slice(1)
}

const getModelInitials = (modelId: string): string => {
  const provider = modelId.split('/')[0]
  const model = modelId.split('/')[1]

  if (provider === 'anthropic' && model.includes('claude')) return 'C'
  if (provider === 'openai' && model.includes('gpt-4')) return 'G4'
  if (provider === 'openai' && model.includes('gpt-3')) return 'G3'
  if (provider === 'google' && model.includes('gemini')) return 'GM'
  if (provider === 'anthropic') return 'A'
  if (provider === 'openai') return 'O'
  if (provider === 'google') return 'G'

  return provider.charAt(0).toUpperCase()
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

const getModelBackgroundColor = (modelId: string): string => {
  if (modelId.includes('claude-3')) return 'bg-violet-500'
  if (modelId.includes('claude')) return 'bg-purple-500'
  if (modelId.includes('gpt-4')) return 'bg-emerald-500'
  if (modelId.includes('gpt-3')) return 'bg-blue-500'
  if (modelId.includes('gemini')) return 'bg-amber-500'
  if (modelId.includes('llama')) return 'bg-orange-500'
  if (modelId.includes('mistral')) return 'bg-cyan-500'
  return 'bg-gray-500'
}

// Add ref for active dropdown
const activeDropdown = ref<string | null>(null)

// Add click outside handler
onMounted(() => {
  // Generate summaries for visible chats
  generateAllSummaries()

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

// Watch for changes in chat history to update summaries
watch(() => props.chatHistory, async (newHistory, oldHistory) => {
  if (newHistory.length !== oldHistory?.length) {
    // Check if there are any chats without summaries
    const unsummarizedChats = newHistory.filter(
      chat => !chatSummaries.value[chat.id] && chat.messages.length > 1
    )

    if (unsummarizedChats.length > 0) {
      await generateAllSummaries()
    }
  }
}, { deep: true })

// Helper function for number formatting
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// Helper function for message counts
const getMessageCounts = (chat: Chat) => {
  const messages = chat.messages || []
  return {
    human: messages.filter(m => m.role === 'user').length,
    ai: messages.filter(m => m.role === 'assistant').length,
    total: messages.length
  }
}

// Helper function for token stats
const getTokenStats = (chat: Chat) => {
  const stats = chat.metadata?.stats || { promptTokens: 0, completionTokens: 0, cost: 0 }
  return {
    tokens: (stats.promptTokens || 0) + (stats.completionTokens || 0),
    cost: stats.cost || 0
  }
}

// Add new XML command parsing functionality
const renameCommandRegex = /<rename-chat\s+newname="([^"]+)"\s*\/>/i

/**
 * Parse AI responses for special XML commands
 * @param content The message content to parse
 * @returns Object with command information if found
 */
const parseModelCommands = (content: string) => {
  // Check for rename command
  const renameMatch = content.match(renameCommandRegex)
  if (renameMatch) {
    return {
      type: 'rename',
      newName: renameMatch[1],
      originalContent: content.replace(renameMatch[0], '')
    }
  }

  // No commands found
  return null
}

/**
 * Check if a chat has reached the message threshold for auto-titling
 * This could be called when new messages are added
 */
const checkForAutoTitle = (chat: Chat) => {
  // Only suggest retitling if:
  // 1. Chat has at least 5 messages
  // 2. Chat title is "New Chat" or "Untitled" or null
  // 3. We haven't already generated a title recently

  const defaultTitles = ['new chat', 'untitled chat', 'untitled', '']
  const hasDefaultTitle = !chat.title || defaultTitles.includes(chat.title.toLowerCase())

  if (chat.messages.length >= 5 && hasDefaultTitle) {
    // We'd generate a title here
    generateTitleForChat(chat)
  }
}

/**
 * Generate a title for a chat using the Gemini model
 */
const generateTitleForChat = async (chat: Chat) => {
  try {
    const messages = chat.messages.slice(0, Math.min(chat.messages.length, 10))

    // Create a prompt for title generation
    const titlePrompt = `
      Please create a very brief title (max 40 characters) for this conversation.
      Make it descriptive but concise.

      ${messages
        .map(
          (m) =>
            `${m.role}: ${m.content.substring(0, 150)}${m.content.length > 150 ? "..." : ""
            }`
        )
        .join("\n\n")}
    `

    // Use the cheap Gemini flash model
    const model = "google/gemini-2.0-flash-lite-001"

    // Send request to OpenRouter
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouter.apiKey.value}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: titlePrompt }],
          temperature: 0.3,
          max_tokens: 40,
        }),
      }
    )

    if (!response.ok) {
      logger.error("Title generation failed", { status: response.status })
      return
    }

    const data = await response.json()
    const suggestedTitle = data.choices[0].message.content.trim()

    // For now, just emit an event to suggest a title change
    // In a full implementation, you'd show a UI element asking the user
    // if they want to apply this title
    emit('rename-chat', chat.id, suggestedTitle)

    // Track usage of the model
    openRouter.trackModelUsage(model)
  } catch (error) {
    logger.error("Failed to generate title", error)
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