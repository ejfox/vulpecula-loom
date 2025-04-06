<template>
  <aside class="flex flex-col h-full overflow-hidden text-sm bg-white dark:bg-oled-black">
    <!-- Header - Simplified Version with Safe Constellation Effects -->
    <div class="celestial-header-simple px-4 py-3 border-b border-gray-200 dark:border-gray-800 app-drag-region"
      :class="{ 'celestial-header-thinking': isGeneratingSummaries || isAiResponding }">
      <div class="flex items-center justify-between relative z-10">
        <h1 class="font-medium text-white dark:text-white select-none">
          Vulpecula
        </h1>
        <img src="https://room302.studio/room302-logo.svg" alt="Room 302 Studio"
          class="h-5 logo-monochrome select-none" />
      </div>
      <!-- Safe constellation animation container -->
      <div class="constellation-container" v-if="isGeneratingSummaries || isAiResponding">
        <div class="star-particle s1"></div>
        <div class="star-particle s2"></div>
        <div class="star-particle s3"></div>
        <div class="star-particle s4"></div>
        <div class="star-particle s5"></div>
        <div class="star-particle s6"></div>
        <div class="star-particle s7"></div>
        <div class="s8"></div>
        <div class="s9"></div>
      </div>
      <!-- Northern lights top bar -->
      <div class="northern-lights-bar" v-if="isGeneratingSummaries || isAiResponding"></div>
    </div>

    <!-- Search and Actions Bar -->
    <div
      class="sticky top-0 bg-white dark:bg-oled-black p-3 z-50 border-b border-gray-200 dark:border-gray-800 shadow-sm">
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
    <div class="flex-1 overflow-y-auto p-2 space-y-2" :class="{ 'pb-16': tickerVisible }">
      <!-- Loading State -->
      <div v-if="isGeneratingSummaries" class="flex items-center justify-center py-3 text-gray-500 dark:text-gray-400">
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
        class="flex flex-col items-center justify-center py-6 text-center">
        <svg class="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24"
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
          class="mt-3 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
          Start New Chat
        </button>
      </div>

      <!-- Chat List -->
      <div v-if="filteredChats.length > 0" class="space-y-2 relative chat-list-container">
        <!-- Threaded Chats -->
        <div v-for="(chats, threadId) in groupedFilteredChats" :key="threadId" class="space-y-1.5 relative">
          <!-- Thread Header -->
          <div v-if="threadId !== 'unthreaded' && chats.length > 0"
            class="px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider flex items-center bg-gray-50 dark:bg-black rounded monospace-text">
            <span class="flex-1">{{ chats[0]?.metadata.thread?.name || 'Untitled Thread' }}</span>
            <span class="text-gray-400 bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded-full text-xs">
              {{ chats.length }}
            </span>
          </div>

          <!-- Chats in Thread -->
          <TransitionGroup name="chat-list" tag="div" class="space-y-1.5 relative">
            <div v-for="chat in chats" :key="chat.id"
              class="group flex flex-col rounded-lg overflow-hidden cursor-pointer border dark:border-gray-800 hover:shadow-md transition-all duration-200"
              :class="[
                currentChatId === chat.id
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-gray-900/50 ring-1 ring-blue-400/30'
                  : 'border-gray-200 dark:hover:bg-black/70',
                chat.metadata.fork?.parentId ? 'border-l-2 border-l-blue-500/30' : ''
              ]" :style="{ marginLeft: `${getIndentLevel(chat) * 8}px` }">

              <!-- Chat Card Header -->
              <div
                class="flex items-center px-2 py-1.5 bg-white dark:bg-oled-black border-b border-gray-100 dark:border-gray-800"
                @click="emit('load-chat', chat.id)">
                <!-- Model Icon -->
                <div class="flex-shrink-0">
                  <span class="w-5 h-5 rounded-full flex items-center justify-center"
                    :class="getModelBackgroundColor(chat.model)">
                    <div :class="[getModelIcon(chat.model), 'text-white w-3 h-3']"></div>
                  </span>
                </div>

                <!-- Chat Title -->
                <div class="ml-2 min-w-0 flex-1">
                  <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
                    {{ getChatTitle(chat) }}
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 monospace-text">
                    <span>{{ formatDate(chat.metadata?.lastUpdated) }}</span>
                    <span class="mx-1.5">·</span>
                    <span>{{ chat.metadata?.messageCount || 0 }} {{ chat.metadata?.messageCount === 1 ? 'message' :
                      'messages' }}</span>
                  </p>
                </div>

                <!-- Chat Actions -->
                <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 ml-2">
                  <!-- Actions Menu -->
                  <div class="relative">
                    <button @click.stop="activeDropdown = activeDropdown === chat.id ? null : chat.id"
                      class="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    <!-- Dropdown Menu -->
                    <div v-if="activeDropdown === chat.id"
                      class="absolute right-0 mt-1 w-40 bg-white dark:bg-oled-black rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 text-xs">
                      <div class="py-1">
                        <button @click.stop="regenerateSummary(chat)"
                          class="w-full px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 text-left flex items-center">
                          <svg class="w-3.5 h-3.5 mr-1.5 text-gray-500 dark:text-gray-400" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regenerate Summary
                        </button>
                        <button @click.stop.prevent="confirmDelete(chat.id)"
                          class="w-full px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-900 text-left flex items-center">
                          <svg class="w-3.5 h-3.5 mr-1.5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24"
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

              <!-- Chat Summary (more compact) -->
              <div class="px-2 py-1.5 bg-white dark:bg-oled-black text-xs" @click="emit('load-chat', chat.id)">
                <div v-if="isSummaryLoading(chat.id)" class="flex items-center text-gray-500 dark:text-gray-400">
                  <div class="animate-pulse w-full h-3 bg-gray-200 dark:bg-gray-800 rounded"></div>
                </div>
                <div v-else-if="chatSummaries[chat.id]" class="text-gray-700 dark:text-gray-300 line-clamp-2">
                  {{ chatSummaries[chat.id] }}
                </div>
                <div v-else class="text-gray-500 dark:text-gray-500 italic">
                  No summary available
                </div>
              </div>

              <!-- Chat Card Footer -->
              <div class="flex items-center justify-between px-2 py-1 text-xs bg-gray-50 dark:bg-oled-black">
                <!-- Models Summary Button -->
                <div class="flex items-center cursor-pointer model-dropdown-trigger" :data-chat-id="chat.id"
                  @click.stop="toggleModelsDropdown(chat.id)">
                  <!-- Show model icons in a compact way -->
                  <div class="flex -space-x-1 mr-1">
                    <span v-for="(model, idx) in getTopModels(chat).slice(0, 2)" :key="idx"
                      class="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 border border-gray-50 dark:border-black"
                      :class="model.bgColor">
                      <div :class="[model.icon, 'text-white w-2 h-2']"></div>
                    </span>
                  </div>
                  <span class="font-medium text-xs truncate max-w-[80px] monospace-text"
                    :class="getTopModels(chat)[0]?.color">
                    {{ getModelDisplayName(getTopModels(chat)[0]?.id || chat.model) }}
                    <span v-if="getTopModels(chat).length > 1" class="text-gray-400 dark:text-gray-500 ml-0.5">+{{
                      getTopModels(chat).length - 1 }}</span>
                  </span>
                  <svg class="w-3 h-3 ml-0.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <!-- Models Dropdown -->
                <div v-if="activeModelsDropdown === chat.id && getTopModels(chat).length > 1"
                  class="fixed z-20 bg-white dark:bg-oled-black shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-xs"
                  :style="getDropdownPosition(chat.id)" @click.stop>
                  <div
                    class="font-medium mb-1.5 text-gray-500 dark:text-gray-400 uppercase tracking-wide text-xs monospace-text">
                    MODELS USED
                  </div>
                  <div class="space-y-1.5">
                    <div v-for="(model, idx) in getTopModels(chat)" :key="idx"
                      class="grid grid-cols-3 gap-1 items-center">
                      <!-- Model Icon & Name Column -->
                      <div class="flex items-center gap-1 min-w-0" :class="model.color">
                        <span class="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          :class="model.bgColor">
                          <div :class="[model.icon, 'text-white w-2.5 h-2.5']"></div>
                        </span>
                        <span class="font-medium truncate text-xs monospace-text">{{ getModelDisplayName(model.id)
                        }}</span>
                      </div>

                      <!-- Message Count Column -->
                      <div class="text-center">
                        <span class="text-gray-500 dark:text-gray-400 text-xs monospace-text">{{ model.count }} {{
                          model.count === 1 ?
                            'msg' : 'msgs' }}</span>
                      </div>

                      <!-- Progress Bar Column -->
                      <div class="flex justify-end">
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                          <div class="h-1 rounded-full" :class="model.bgColor" :style="{
                            width: `${(model.count / getTotalMessages(chat)) * 100}%`
                          }"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Has Images/Documents indicator -->
                <div v-if="hasAttachments(chat)" class="flex items-center">
                  <svg class="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-xs">Media</span>
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
import { useSupabase } from '../composables/useSupabase'

// Preload the Monaspace Neon font to avoid FOIT (Flash of Invisible Text)
const preloadFont = () => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = 'https://cdn.jsdelivr.net/gh/githubnext/monaspace@v1.000/fonts/webfonts/MonaspaceNeon-Regular.woff';
  link.as = 'font';
  link.type = 'font/woff';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

const props = defineProps<{
  chatHistory: Chat[]
  currentChatId: string | null
  isAiResponding?: boolean // New prop to track when AI is actively responding
}>()

const emit = defineEmits(['new-chat', 'load-chat', 'delete-chat', 'rename-chat'])

const openRouter = useOpenRouter()
const chatSummaries = ref<Record<string, string>>({})
const summaryLoadingIds = ref<Set<string>>(new Set())
const isGeneratingSummaries = ref(false)
const searchQuery = ref('')

// Add state for log ticker visibility
const tickerVisible = ref(localStorage.getItem('logTickerShow') !== 'false')

// Storage event handler
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'logTickerShow') {
    tickerVisible.value = e.newValue !== 'false'
  }
}

// Custom event handler
const handleTickerVisibilityChange = ((e: Event) => {
  const customEvent = e as CustomEvent
  tickerVisible.value = customEvent.detail?.visible || false
}) as EventListener

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
  // SAFETY CHECK: Don't process if we've made an API call too recently
  if (Date.now() - lastSummaryApiCallTime < MIN_API_CALL_INTERVAL) {
    logger.debug(`Skipping generateSummaryForChat for chat ${chat.id} - throttled`);
    return;
  }
  
  // Skip if already has a recent summary (less than 24 hours old)
  const lastSummaryTime = chat.metadata.summaryLastUpdated ? new Date(chat.metadata.summaryLastUpdated).getTime() : 0
  const isRecent = lastSummaryTime > Date.now() - 24 * 60 * 60 * 1000

  if (chat.metadata.summary && isRecent && !summaryLoadingIds.value.has(chat.id)) {
    chatSummaries.value[chat.id] = chat.metadata.summary
    return
  }

  // Skip if already loading
  if (summaryLoadingIds.value.has(chat.id)) {
    logger.debug(`Summary already loading for chat ${chat.id}, skipping`)
    return
  }

  // Update the throttle timestamp
  lastSummaryApiCallTime = Date.now();

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

      // Update the chat object to prevent future regeneration
      chat.metadata.summary = summary
      chat.metadata.summaryLastUpdated = new Date().toISOString()

      // Save to store with error handling
      try {
        const store = useStore()
        // Using 'as any' because the type system doesn't correctly recognize the indexed signature in StoreSchema
        await store.set(`chat-summary-${chat.id}` as any, {
          summary,
          updatedAt: new Date().toISOString()
        })

        // Also update the metadata in Supabase to ensure persistence
        try {
          const { supabase } = useSupabase()
          await supabase
            .from('vulpeculachats')
            .update({ 
              metadata: updatedMetadata 
            })
            .eq('id', chat.id)
          
          logger.debug(`Updated summary metadata in database for chat ${chat.id}`)
        } catch (dbError) {
          logger.error('Failed to update summary in database', { chatId: chat.id, error: dbError })
        }
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
  // SAFETY CHECK: Don't process if we've made an API call too recently
  if (Date.now() - lastSummaryApiCallTime < MIN_API_CALL_INTERVAL) {
    logger.debug('Skipping regenerateSummary - throttled');
    return;
  }

  if (summaryLoadingIds.value.has(chat.id)) return

  // Update the throttle timestamp
  lastSummaryApiCallTime = Date.now();
  
  summaryLoadingIds.value.add(chat.id)
  try {
    const summary = await openRouter.generateChatSummary(chat.messages)
    if (summary) {
      chatSummaries.value[chat.id] = summary

      // Update the chat object to prevent future regeneration
      chat.metadata.summary = summary
      chat.metadata.summaryLastUpdated = new Date().toISOString()

      // Create updated metadata object
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

        // Also update the metadata in Supabase to ensure persistence
        try {
          const { supabase } = useSupabase()
          await supabase
            .from('vulpeculachats')
            .update({ 
              metadata: updatedMetadata 
            })
            .eq('id', chat.id)
          
          logger.debug(`Updated summary metadata in database for chat ${chat.id}`)
        } catch (dbError) {
          logger.error('Failed to update summary in database', { chatId: chat.id, error: dbError })
        }
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
  // SAFETY CHECK: Don't process if we've made an API call too recently
  if (Date.now() - lastSummaryApiCallTime < MIN_API_CALL_INTERVAL) {
    logger.debug('Skipping generateAllSummaries - throttled');
    return;
  }

  if (isGeneratingSummaries.value) return

  isGeneratingSummaries.value = true
  try {
    // Update the throttle timestamp
    lastSummaryApiCallTime = Date.now();
    
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

    // Generate missing summaries (limit to 3 at a time to prevent token overuse)
    const chatsNeedingSummaries = props.chatHistory.filter(
      chat => !chatSummaries.value[chat.id] && chat.messages.length > 1 &&
      // Only include chats that don't have a recent summary in their metadata
      (!chat.metadata.summary || !chat.metadata.summaryLastUpdated || 
       new Date(chat.metadata.summaryLastUpdated).getTime() < Date.now() - 24 * 60 * 60 * 1000)
    ).slice(0, 3) // Limit to 3 chats at a time

    if (chatsNeedingSummaries.length > 0) {
      logger.debug(`Generating summaries for ${chatsNeedingSummaries.length} chats`)
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

// Get the icon for a model provider
const getModelIcon = (modelId: string): string => {
  const provider = modelId.split('/')[0]

  // Map provider to icon
  switch (provider) {
    case 'anthropic':
      return 'i-ri-anthropic-fill'
    case 'openai':
      return 'i-ri-openai-fill'
    case 'google':
      return 'i-ri-google-fill'
    case 'meta':
      return 'i-ri-meta-fill'
    case 'mistral':
      return 'i-ri-terminal-box-fill' // Placeholder for Mistral
    case 'groq':
      return 'i-ri-rocket-2-fill' // Placeholder for Groq
    case 'cohere':
      return 'i-ri-bubble-chart-fill' // Placeholder for Cohere
    default:
      return 'i-ri-robot-fill' // Generic AI icon for unknown providers
  }
}

// Add ref for active dropdown
const activeDropdown = ref<string | null>(null)
const activeModelsDropdown = ref<string | null>(null)

// Add this to store dropdown trigger element positions
const dropdownTriggers = ref<Map<string, DOMRect>>(new Map())

// Add formatNumber function using Intl.NumberFormat API
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(num);
}

// Function to get dropdown position
const getDropdownPosition = (chatId: string) => {
  const rect = dropdownTriggers.value.get(chatId)
  if (!rect) {
    // Fallback: find the trigger element and get its position
    const triggerElement = document.querySelector(`.model-dropdown-trigger[data-chat-id="${chatId}"]`);
    if (triggerElement) {
      const newRect = triggerElement.getBoundingClientRect();
      dropdownTriggers.value.set(chatId, newRect);
      return {
        left: `${newRect.left}px`,
        top: `${newRect.bottom + 5}px`,
        maxWidth: '280px'
      };
    }
    return { left: '0px', top: '0px', maxWidth: '280px' }
  }

  return {
    left: `${rect.left}px`,
    top: `${rect.bottom + 5}px`,
    maxWidth: '280px'
  }
}

// Update click outside handler
onMounted(() => {
  // Preload Monaspace font
  preloadFont();

  // Generate summaries for visible chats
  console.log('ChatSidebar mounted - attempting to generate summaries');
  generateAllSummaries();

  // Check for chats that need titles
  console.log('Checking for auto titles for', props.chatHistory.length, 'chats');
  props.chatHistory.forEach(chat => {
    checkForAutoTitle(chat);
  });

  // Create a mutation observer to track when chat items are added or removed
  const observer = new MutationObserver(() => {
    // Update positions of dropdown triggers
    console.log('DOM mutation detected - updating dropdown positions');
    document.querySelectorAll('.model-dropdown-trigger').forEach((el) => {
      const chatId = el.getAttribute('data-chat-id');
      if (chatId) {
        dropdownTriggers.value.set(chatId, el.getBoundingClientRect());
      }
    });
  });

  // Start observing the chat list container
  const chatListContainer = document.querySelector('.chat-list-container');
  if (chatListContainer) {
    console.log('Found chat list container - setting up observer');
    observer.observe(chatListContainer, { childList: true, subtree: true });
  } else {
    console.warn('Could not find chat list container for observer');
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (activeDropdown.value) {
      activeDropdown.value = null
    }

    // Only close the models dropdown if the click wasn't on the trigger
    if (activeModelsDropdown.value) {
      const target = e.target as HTMLElement
      if (!target.closest('.model-dropdown-trigger')) {
        activeModelsDropdown.value = null
      }
    }
  }

  document.addEventListener('click', handleClickOutside)

  // Update watch for activeModelsDropdown to ensure positions are updated
  watch(activeModelsDropdown, (newValue) => {
    if (newValue) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        // Find all trigger elements and update their positions
        document.querySelectorAll('.model-dropdown-trigger').forEach((el) => {
          const chatId = el.getAttribute('data-chat-id')
          if (chatId) {
            dropdownTriggers.value.set(chatId, el.getBoundingClientRect())
          }
        })
      }, 10);
    }
  })

  // Add event listeners for ticker visibility
  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('logticker-visibility-changed', handleTickerVisibilityChange)

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    observer.disconnect()
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener('logticker-visibility-changed', handleTickerVisibilityChange)
  })
})

// Add simple throttling variables to prevent excessive API calls
let lastSummaryApiCallTime = Date.now() - 10000; // Initialize to 10 seconds ago
let lastTitleApiCallTime = Date.now() - 10000; // Initialize to 10 seconds ago
const MIN_API_CALL_INTERVAL = 3000; // 3 seconds minimum between API calls

// Watch for changes in chat history to update summaries and titles
watch(() => props.chatHistory, async (newHistory, oldHistory) => {
  // SAFETY CHECK: Don't process if we've made an API call too recently
  const now = Date.now();
  if (now - lastSummaryApiCallTime < MIN_API_CALL_INTERVAL) {
    logger.debug('Skipping summary generation - throttled');
    return;
  }

  if (newHistory.length !== oldHistory?.length) {
    // Check if there are any chats without summaries
    const unsummarizedChats = newHistory.filter(
      chat => !chatSummaries.value[chat.id] && chat.messages.length > 1 && 
      // Only include chats that don't have a recent summary in their metadata
      (!chat.metadata.summary || !chat.metadata.summaryLastUpdated || 
       new Date(chat.metadata.summaryLastUpdated).getTime() < Date.now() - 24 * 60 * 60 * 1000)
    )

    if (unsummarizedChats.length > 0) {
      // Limit to max 3 summaries per update to prevent token overuse
      const limitedChats = unsummarizedChats.slice(0, 3)
      logger.debug(`Generating summaries for ${limitedChats.length} chats out of ${unsummarizedChats.length} unsummarized`)
      
      // Update the throttle timestamp
      lastSummaryApiCallTime = now;
      
      // Generate summaries for each chat individually instead of calling generateAllSummaries
      // This prevents the function from checking all chats again
      for (const chat of limitedChats) {
        await generateSummaryForChat(chat)
      }
    }

    // Check for chats needing title generation
    // SAFETY CHECK: Don't process if we've made a title API call too recently
    if (now - lastTitleApiCallTime >= MIN_API_CALL_INTERVAL) {
      // Only check one chat at a time to prevent excessive API calls
      const chatNeedingTitle = newHistory.find(chat => {
        const defaultTitles = ['new chat', 'untitled chat', 'untitled', '']
        const hasDefaultTitle = !chat.title || defaultTitles.includes(chat.title.toLowerCase())
        
        // Check if we've already tried to generate a title in the last hour
        let lastTitleAttemptTime = 0
        const autoTitle = chat.metadata.autoTitle as { value?: string, lastGeneratedAt?: string } | undefined
        if (autoTitle && autoTitle.lastGeneratedAt) {
          lastTitleAttemptTime = new Date(autoTitle.lastGeneratedAt).getTime()
        }
        
        const oneHourAgo = Date.now() - (60 * 60 * 1000)
        const canGenerateAgain = lastTitleAttemptTime === 0 || lastTitleAttemptTime < oneHourAgo
        
        // Generate title at message thresholds: 5 messages, 10 messages, or every 20 messages
        const atThreshold = chat.messages.length === 5 ||
          chat.messages.length === 10 ||
          chat.messages.length % 20 === 0
        
        return chat.messages.length >= 5 && hasDefaultTitle && canGenerateAgain && atThreshold
      });
      
      if (chatNeedingTitle) {
        // Update the throttle timestamp
        lastTitleApiCallTime = now;
        checkForAutoTitle(chatNeedingTitle)
      }
    }
  } else {
    // Messages might have been added to existing chats, check if any need titles
    // SAFETY CHECK: Don't process if we've made a title API call too recently
    if (now - lastTitleApiCallTime >= MIN_API_CALL_INTERVAL) {
      for (let i = 0; i < newHistory.length; i++) {
        const newChat = newHistory[i]
        const oldChat = oldHistory?.[i]

        if (newChat && oldChat && newChat.messages.length !== oldChat.messages.length) {
          // Update the throttle timestamp
          lastTitleApiCallTime = now;
          checkForAutoTitle(newChat)
          break; // Only process one chat at a time
        }
      }
    }
  }
}, { deep: true })

// Helper function for message counts
const getMessageCounts = (chat: Chat) => {
  const messages = chat.messages || []
  return {
    human: messages.filter(m => m.role === 'user').length,
    ai: messages.filter(m => m.role === 'assistant').length,
    total: messages.length
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
  // SAFETY CHECK: Don't process if we've made an API call too recently
  if (Date.now() - lastTitleApiCallTime < MIN_API_CALL_INTERVAL) {
    logger.debug('Skipping checkForAutoTitle - throttled');
    return;
  }

  // Only suggest retitling if:
  // 1. Chat has enough messages (at least 5)
  // 2. Chat title is "New Chat" or "Untitled" or null
  // 3. We haven't already generated a title recently

  const defaultTitles = ['new chat', 'untitled chat', 'untitled', '']
  const hasDefaultTitle = !chat.title || defaultTitles.includes(chat.title.toLowerCase())

  // Check if we've already tried to generate a title in the last hour
  let lastTitleAttemptTime = 0
  // Use type assertion to avoid type errors
  const autoTitle = chat.metadata.autoTitle as { value?: string, lastGeneratedAt?: string } | undefined

  if (autoTitle && autoTitle.lastGeneratedAt) {
    lastTitleAttemptTime = new Date(autoTitle.lastGeneratedAt).getTime()
  }

  const oneHourAgo = Date.now() - (60 * 60 * 1000)
  const canGenerateAgain = lastTitleAttemptTime === 0 || lastTitleAttemptTime < oneHourAgo

  // Generate title at message thresholds: 5 messages, 10 messages, or every 20 messages
  const atThreshold = chat.messages.length === 5 ||
    chat.messages.length === 10 ||
    chat.messages.length % 20 === 0

  if (chat.messages.length >= 5 && hasDefaultTitle && canGenerateAgain && atThreshold) {
    logger.debug('Auto-generating title for chat', { chatId: chat.id, messageCount: chat.messages.length })
    generateTitleForChat(chat)
  }
}

/**
 * Generate a title for a chat using the Gemini model
 */
const generateTitleForChat = async (chat: Chat) => {
  // SAFETY CHECK: Don't process if we've made an API call too recently
  if (Date.now() - lastTitleApiCallTime < MIN_API_CALL_INTERVAL) {
    logger.debug('Skipping generateTitleForChat - throttled');
    return;
  }

  // Update the throttle timestamp
  lastTitleApiCallTime = Date.now();

  try {
    const messages = chat.messages.slice(0, Math.min(chat.messages.length, 10))

    // Create a prompt for title generation that specifically asks for 1-4 words
    const titlePrompt = `
      Create a VERY concise title (1-4 words only) for this conversation.
      The title should capture the essence of the conversation topic.
      Return ONLY the title with no quotes, explanations, or additional text.

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

    // Update the chat metadata to record that we attempted to generate a title
    try {
      const store = useStore()
      await store.set(`chat-metadata-${chat.id}-autoTitle` as any, {
        value: suggestedTitle,
        lastGeneratedAt: new Date().toISOString()
      })
    } catch (storeError) {
      logger.error('Failed to save title generation metadata', { chatId: chat.id, error: storeError })
    }

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

// Get the top 3 most used models in a chat
const getTopModels = (chat: Chat) => {
  // Count model usage
  const modelCounts: Record<string, number> = {}

  // Count models from messages
  chat.messages.forEach(message => {
    if (message.model) {
      modelCounts[message.model] = (modelCounts[message.model] || 0) + 1
    }
  })

  // If we don't have any models in messages, use the chat.model as default
  if (Object.keys(modelCounts).length === 0 && chat.model) {
    modelCounts[chat.model] = 1
  }

  // Sort models by usage count (descending)
  const sortedModels = Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Get top 5 for the dropdown
    .map(([model, count]) => ({
      id: model,
      count,
      initials: getModelInitials(model),
      icon: getModelIcon(model),
      color: getModelColor(model),
      bgColor: getModelBackgroundColor(model)
    }))

  return sortedModels
}

// Get total number of messages with identified models
const getTotalMessages = (chat: Chat) => {
  let total = 0
  const counts = getTopModels(chat)
  counts.forEach(model => {
    total += model.count
  })
  return total || 1 // Avoid division by zero
}

// Helper function to get a clean title
const getChatTitle = (chat: Chat) => {
  return chat.title || 'Untitled Chat'
}

// Format date for display
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Unknown date'
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}

// Confirm delete action
const confirmDelete = (chatId: string) => {
  // This could be enhanced with a modal confirmation
  if (confirm('Are you sure you want to delete this chat?')) {
    emit('delete-chat', chatId)
    // Close any open dropdowns after deletion
    activeDropdown.value = null
    activeModelsDropdown.value = null
  }
}

// Toggle models dropdown
const toggleModelsDropdown = (chatId: string) => {
  activeModelsDropdown.value = activeModelsDropdown.value === chatId ? null : chatId
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
  transform: translateY(-10px);
}

.chat-list-move {
  transition: transform 0.5s ease;
}

/* Import Monaspace Neon font from GitHub with proper fallbacks */
@font-face {
  font-family: 'Monaspace Neon';
  src: url('https://cdn.jsdelivr.net/gh/githubnext/monaspace@v1.000/fonts/webfonts/MonaspaceNeon-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Monaspace Neon';
  src: url('https://cdn.jsdelivr.net/gh/githubnext/monaspace@v1.000/fonts/webfonts/MonaspaceNeon-Bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* Apply monospace font to elements with proper fallbacks */
.monospace-text {
  font-family: 'Monaspace Neon', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  letter-spacing: -0.02em;
  font-feature-settings: "calt" 1, "liga" 1;
}

/* Base header styling */
.celestial-header-simple {
  @apply bg-gradient-to-r from-purple-700 to-indigo-800 overflow-hidden relative;
  height: 52px;
}

/* Dark mode true OLED black version */
.dark .celestial-header-simple {
  background: #000000;
  /* True OLED black */
  border-bottom-color: rgba(75, 85, 99, 0.5);
}

/* Modified header state when thinking/generating */
.celestial-header-thinking {
  @apply bg-gradient-to-r from-purple-800 to-indigo-900;
}

/* Dark mode thinking state with subtle gradient even on OLED black */
.dark .celestial-header-thinking {
  background: linear-gradient(90deg, #000000, #030303, #000000);
}

/* Northern lights bar animation - only shown during thinking state */
.northern-lights-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(to right,
      rgba(94, 114, 235, 0),
      rgba(94, 114, 235, 0.5),
      rgba(37, 206, 222, 0.8),
      rgba(123, 231, 174, 0.5),
      rgba(94, 114, 235, 0));
  animation: aurora 4s ease-in-out infinite alternate;
  opacity: 0.8;
  z-index: 5;
}

/* Northern lights flowing gradient overlay */
.constellation-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg,
      rgba(94, 114, 235, 0) 0%,
      rgba(94, 114, 235, 0.03) 25%,
      rgba(37, 206, 222, 0.05) 50%,
      rgba(123, 231, 174, 0.03) 75%,
      rgba(94, 114, 235, 0) 100%);
  background-size: 400% 400%;
  animation: northernLights 15s ease infinite;
  opacity: 0.4;
  z-index: 2;
  pointer-events: none;
}

/* Dark mode adjustment for the northern lights */
.dark .constellation-container::before {
  opacity: 0.15;
  background: linear-gradient(45deg,
      rgba(94, 114, 235, 0) 0%,
      rgba(94, 114, 235, 0.04) 25%,
      rgba(37, 206, 222, 0.08) 50%,
      rgba(123, 231, 174, 0.04) 75%,
      rgba(94, 114, 235, 0) 100%);
}

/* Star particles */
.constellation-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 1;
}

.star-particle {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 1;
  opacity: 0;
  /* Start invisible for fade in */
}

/* Star positions and animations with varied cycles */
.s1 {
  top: 20%;
  left: 10%;
  animation: fadeInOutTwinkle 8s ease-in-out infinite;
  animation-delay: 0.5s;
}

.s2 {
  top: 30%;
  left: 25%;
  animation: fadeInOutTwinkle 7s ease-in-out infinite;
  animation-delay: 1.2s;
}

.s3 {
  top: 15%;
  left: 50%;
  animation: fadeInOutTwinkle 9s ease-in-out infinite;
  animation-delay: 0.8s;
}

.s4 {
  top: 40%;
  left: 70%;
  animation: fadeInOutTwinkle 6.5s ease-in-out infinite;
  animation-delay: 2.1s;
}

.s5 {
  top: 25%;
  left: 85%;
  animation: fadeInOutTwinkle 8.5s ease-in-out infinite;
  animation-delay: 1.5s;
}

.s6 {
  top: 35%;
  left: 40%;
  animation: fadeInOutTwinkle 7.8s ease-in-out infinite;
  animation-delay: 0.3s;
}

.s7 {
  top: 45%;
  left: 60%;
  animation: fadeInOutTwinkle 9.2s ease-in-out infinite;
  animation-delay: 1.7s;
}

/* Additional stars for more cosmic depth */
.constellation-container .s8 {
  position: absolute;
  top: 12%;
  left: 35%;
  width: 1px;
  height: 1px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 1;
  animation: fadeInOutTwinkle 7.3s ease-in-out infinite;
  animation-delay: 2.7s;
}

.constellation-container .s9 {
  position: absolute;
  top: 38%;
  left: 15%;
  width: 1px;
  height: 1px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 1;
  animation: fadeInOutTwinkle 6.9s ease-in-out infinite;
  animation-delay: 3.2s;
}

/* Make dark mode stars more visible against true black */
.dark .star-particle,
.dark .constellation-container .s8,
.dark .constellation-container .s9 {
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 2px rgba(255, 255, 255, 0.6);
}

/* Complete fade-in, twinkle, fade-out animation */
@keyframes fadeInOutTwinkle {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }

  15% {
    opacity: 0.7;
    transform: scale(1);
  }

  40% {
    opacity: 1;
    transform: scale(1.2);
  }

  65% {
    opacity: 0.7;
    transform: scale(1);
  }

  100% {
    opacity: 0;
    transform: scale(0.5);
  }
}

/* Northern lights flowing animation */
@keyframes northernLights {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

/* Animation keyframes */
@keyframes twinkle {
  0% {
    opacity: 0.3;
    transform: scale(0.8);
  }

  100% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes aurora {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}

/* Light mode overrides */
:global(.light) .celestial-header-simple {
  background: #c9d6ff;
}

:global(.light) .celestial-header-thinking {
  background: #d8e1ff;
}

:global(.light) .celestial-header-simple h1 {
  color: #2a365c;
}

:global(.light) .star-particle {
  background-color: rgba(42, 54, 92, 0.6);
}

:global(.light) .star-particle::after {
  background-color: rgba(42, 54, 92, 0.1);
}

:global(.light) .northern-lights-bar {
  background: linear-gradient(to right,
      rgba(94, 114, 235, 0),
      rgba(94, 114, 235, 0.3),
      rgba(37, 120, 222, 0.5),
      rgba(94, 114, 235, 0.3),
      rgba(94, 114, 235, 0));
  opacity: 0.6;
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

/* App drag region */
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

/* Monochrome filter for the logo */
.logo-monochrome {
  filter: grayscale(100%) brightness(0.8) contrast(1.2);
  opacity: 0.85;
  transition: opacity 0.2s ease-in-out;
  position: relative;
  z-index: 2;
}

.logo-monochrome:hover {
  opacity: 1;
}

/* Dark mode adjustments */
:global(.dark) .logo-monochrome {
  filter: grayscale(100%) brightness(1.5) contrast(0.8);
  opacity: 0.7;
}

/* Global styles for dark mode with true OLED black */
:global(.dark) {
  --true-black: #000000;
}

:global(.dark) .bg-black {
  background-color: #000000 !important;
  /* True OLED black */
}

:global(.dark) .border-black {
  border-color: #000000 !important;
  /* True OLED black */
}
</style>
