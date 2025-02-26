<template>
  <!-- Z-index layers (using Tailwind):
    z-0:    Default/base layer
    z-10:   Base app content (main chat area)
    z-20:   Floating UI elements (dropdowns, popovers)
    z-30:   Sidebar/panels (when floating)
    z-40:   Modal backdrops
    z-50:   Modals/dialogs/overlays
  -->
  <div class="h-screen flex flex-col bg-white dark:bg-gray-900">
    <!-- Base App Shell -->
    <div v-if="isAuthenticated" class="relative flex flex-col flex-1 min-h-0">
      <!-- Title Bar -->
      <TitleBar :model-name="modelName" :is-loading="isLoading" :is-sending="isSending"
        :is-context-panel-open="isContextPanelOpen" :is-chat-sidebar-open="isChatSidebarOpen" :is-mobile="isMobile"
        :current-model="currentModel" :available-models="availableModels"
        @update:is-context-panel-open="isContextPanelOpen = $event"
        @update:is-chat-sidebar-open="isChatSidebarOpen = $event" @set-model="setModel" class="relative z-20 flex-shrink-0" />

      <!-- Main Content Area -->
      <div class="flex-1 flex min-h-0 p-1.5 gap-1.5 relative overflow-hidden">
        <!-- Chat Sidebar -->
        <Transition enter-active-class="transition-transform duration-300 ease-in-out"
          leave-active-class="transition-transform duration-300 ease-in-out" enter-from-class="-translate-x-full"
          leave-to-class="-translate-x-full">
          <div v-if="isChatSidebarOpen" :class="[
            'bg-white dark:bg-gray-950 rounded-lg overflow-hidden flex flex-col',
            isMobile ? 'fixed inset-y-0 left-0 z-30 w-80 mt-10' : 'w-[38.2%] max-w-sm flex-shrink-0'
          ]">
            <ChatSidebar :chat-history="chatHistory" :current-chat-id="currentChatId"
              @new-chat="createNewChat" @load-chat="loadChat" @delete-chat="handleDeleteChat" />
          </div>
        </Transition>

        <!-- Main Chat Area -->
        <main class="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-950 rounded-lg overflow-hidden relative">
          <ChatMetadata :stats="chatStats" @export="exportChat" class="flex-shrink-0" />

          <!-- API Key Warning -->
          <ApiKeyWarning v-if="!openRouter.hasValidKey.value" :has-valid-key="openRouter.hasValidKey"
            :saving-key="isLoading" @save-api-key="setApiKey" class="flex-shrink-0" />

          <!-- Welcome Screen -->
          <WelcomeScreen v-if="shouldShowWelcome" :has-valid-key="openRouter.hasValidKey.value" :saving-key="isLoading"
            :model-name="modelName" :available-models="availableModels" :current-api-key="openRouter.apiKey.value"
            @save-api-key="setApiKey" @start-chat="createNewChat" @open-settings="isContextPanelOpen = true" />

          <!-- Messages Container -->
          <div v-else ref="chatContainerRef" class="flex-1 overflow-y-auto p-4 space-y-4">
            <ChatMessage v-for="(message, index) in messages"
              :key="message.id || `msg-${currentChatId}-${index}-${message.timestamp}`" :message="message"
              :model-name="modelName" :index="index" :current-chat-id="currentChatId"
              :format-model-cost="formatModelCost" />
          </div>

          <!-- Input Area -->
          <div class="relative z-20">
            <ChatInput v-model="messageInput" :is-loading="isSending" :has-valid-key="hasValidKey"
              :show-mention-popup="showMentionPopup" :is-searching-files="isSearchingFiles"
              :has-obsidian-vault="hasObsidianVault" :obsidian-search-results="obsidianSearchResults"
              @send="handleSendMessage" @mention-popup="(show) => showMentionPopup = show"
              @obsidian-link="handleObsidianLink" @input="(query) => searchQuery = query" />
          </div>
        </main>
      </div>

      <!-- Context Panel -->
      <ContextAlchemyPanel :is-context-panel-open="isContextPanelOpen" :messages="messages"
        @update:is-context-panel-open="isContextPanelOpen = $event" @prune-before="handlePruneBefore"
        @remove-document="handleRemoveDocument" class="z-30" />
    </div>

    <!-- Overlay States -->
    <Transition name="fade">
      <div v-if="!isComplete && steps.length > 0" class="fixed inset-0 z-50 pointer-events-auto">
        <LoadingOverlay :steps="steps" />
      </div>
    </Transition>

    <!-- Auth Overlay -->
    <Transition name="fade">
      <div v-if="!isAuthenticated" class="fixed inset-0 z-50 pointer-events-auto">
        <LoginOverlay />
      </div>
    </Transition>

    <!-- Debug Overlay -->
    <DebugOverlay :is-authenticated="isAuthenticated" :user-id="user?.id" :chat-history="chatHistory"
      :current-chat-id="currentChatId" :messages="messages" :current-model="currentModel" :chat-stats="chatStats" />

    <!-- Settings Modal -->
    <SettingsModal v-model="isSettingsModalOpen" :theme="isDark ? 'dark' : 'light'" :show-progress-bar="true"
      :show-only-pinned-models="preferences.showOnlyPinnedModels" :available-models="availableModels"
      @update:theme="(theme) => isDark = theme === 'dark'" @update:show-progress-bar="(value) => { }"
      @validate-api-key="setApiKey" @select-model="setModel"
      @update:show-only-pinned-models="(value) => preferences.showOnlyPinnedModels = value" />
  </div>
</template>

<script setup lang="ts">
// Core Vue imports
import { onMounted, ref, watch, computed, nextTick, onUnmounted } from 'vue'

// VueUse utilities
import { useBreakpoints, useLocalStorage, useKeyModifier, onKeyStroke } from '@vueuse/core'

// Application composables
import { useLoadingSequence } from './composables/useLoadingSequence'
import { useActiveUser } from './composables/useActiveUser'
import { useTheme } from './composables/useTheme'
import { useOpenRouter } from './composables/useOpenRouter'
import { useSupabase } from './composables/useSupabase'
import { useAIChat } from './composables/useAIChat'
import { useStore } from './lib/store'

// Component imports
import LoadingOverlay from './components/LoadingOverlay.vue'
import LoginOverlay from './components/LoginOverlay.vue'
import TitleBar from './components/TitleBar.vue'
import ChatSidebar from './components/ChatSidebar.vue'
import ChatMetadata from './components/ChatMetadata.vue'
import ApiKeyWarning from './components/ApiKeyWarning.vue'
import ChatMessage from './components/ChatMessage.vue'
import ChatInput from './components/ChatInput.vue'
import ContextAlchemyPanel from './components/ContextAlchemyPanel.vue'
import WelcomeScreen from './components/WelcomeScreen.vue'
import DebugOverlay from './components/DebugOverlay.vue'
import SettingsModal from './components/SettingsModal.vue'

// Types
import type { ChatMessage as ChatMessageType, ChatStats, Chat } from './types'

// Utilities
import logger from './lib/logger'

// =========================================
// Core application state and composables
// =========================================
const { isAuthenticated, user } = useActiveUser()
const { loadChatHistories, saveChatHistory } = useSupabase()
const { isDark, systemPrefersDark } = useTheme()
const aiChat = useAIChat()
const openRouter = useOpenRouter()
const store = useStore()

// =========================================
// Responsive layout
// =========================================
const breakpoints = useBreakpoints({ mobile: 640 })
const isMobile = breakpoints.smaller('mobile')

// =========================================
// Loading sequence
// =========================================
const { steps, addStep, startSequence, completeStep, isComplete } = useLoadingSequence()

// =========================================
// UI state
// =========================================
const isLoading = computed(() => aiChat.isLoading.value)
const isSending = ref(false)
const isContextPanelOpen = useLocalStorage('isContextPanelOpen', false)
const isChatSidebarOpen = useLocalStorage('isChatSidebarOpen', !isMobile.value)
const isSettingsModalOpen = ref(false)
const showMentionPopup = ref(false)
const isSearchingFiles = ref(false)
const hasObsidianVault = ref(false)
const obsidianSearchResults = ref([])
const searchQuery = ref('')
const chatContainerRef = ref<HTMLElement>()
const messageInput = ref('')

// =========================================
// Chat state
// =========================================
const messages = computed(() => aiChat.messages.value)
const chatHistory = ref<Chat[]>([])
const currentChatId = computed(() => aiChat.currentChatId.value)
const currentModel = computed(() => aiChat.currentModel.value)
const modelName = computed(() => aiChat.modelName.value)
const chatStats = computed(() => aiChat.chatStats.value)
const hasValidKey = computed(() => openRouter.hasValidKey.value)

// User preferences
const preferences = useLocalStorage('preferences', {
  showOnlyPinnedModels: false,
})

// =========================================
// Computed properties
// =========================================
const availableModels = computed(() => {
  return openRouter.availableModels.value?.map(model => ({
    ...model,
    name: model.name || model.id.split('/').pop() || '',
    description: model.description
  })) || []
})

const shouldShowWelcome = computed(() => {
  return messages.value.length === 0 && chatHistory.value.length === 0
})

// =========================================
// Theme handling
// =========================================
watch(systemPrefersDark, (prefersDark) => {
  document.documentElement.classList.toggle('dark', prefersDark)
}, { immediate: true })

// =========================================
// Keyboard shortcuts
// =========================================
const setupKeyboardShortcuts = () => {
  const meta = useKeyModifier('Meta')
  
  // Toggle chat sidebar (Cmd+K)
  onKeyStroke('k', (e) => {
    if (meta.value) {
      e.preventDefault()
      isChatSidebarOpen.value = !isChatSidebarOpen.value
    }
  })
  
  // Toggle context panel (Cmd+/)
  onKeyStroke('/', (e) => {
    if (meta.value) {
      e.preventDefault()
      isContextPanelOpen.value = !isContextPanelOpen.value
    }
  })
  
  // New chat (Cmd+N)
  onKeyStroke('n', (e) => {
    if (meta.value) {
      e.preventDefault()
      createNewChat()
    }
  })
  
  // Settings (Cmd+,)
  onKeyStroke(',', (e) => {
    if (meta.value) {
      e.preventDefault()
      isSettingsModalOpen.value = !isSettingsModalOpen.value
    }
  })
}

// =========================================
// IPC event handling for desktop app
// =========================================
const setupIpcListeners = () => {
  if (!window.electron) return []
  
  return [
    window.electron.onOpenSettings(() => {
      logger.debug('Opening settings from menu')
      isSettingsModalOpen.value = true
    }),

    window.electron.onNewChat(() => {
      logger.debug('Creating new chat from menu')
      createNewChat()
    }),

    window.electron.onExportChat(() => {
      logger.debug('Exporting chat from menu')
      exportChat()
    }),

    window.electron.onToggleChatSidebar(() => {
      logger.debug('Toggling chat sidebar from menu')
      isChatSidebarOpen.value = !isChatSidebarOpen.value
    }),

    window.electron.onToggleContextPanel(() => {
      logger.debug('Toggling context panel from menu')
      isContextPanelOpen.value = !isContextPanelOpen.value
    })
  ]
}

// =========================================
// Chat history synchronization
// =========================================
const syncChatHistory = async () => {
  try {
    logger.debug("Starting chat history sync", {
      currentChatId: currentChatId.value,
      currentHistoryLength: chatHistory.value.length,
      isAuthenticated: isAuthenticated.value,
      userId: user?.value?.id
    })

    const histories = await loadChatHistories()
    
    if (histories) {
      chatHistory.value = histories
      logger.debug("Chat history updated", {
        newLength: chatHistory.value.length,
        currentChat: currentChatId.value
      })
    } else {
      logger.warn("No histories returned from Supabase")
    }
  } catch (error) {
    logger.error('Failed to sync chat history:', error)
  }
}

// =========================================
// Chat management methods
// =========================================
const createNewChat = async () => {
  try {
    logger.debug("Creating new chat from UI")

    // Generate a UUID for the new chat
    const chatId = crypto.randomUUID()
    
    // Create new chat with the pre-generated ID
    const newChat = {
      id: chatId,
      title: "New Chat",
      messages: [],
      model: currentModel.value,
      metadata: {
        lastModel: currentModel.value,
        lastUpdated: new Date().toISOString(),
        messageCount: 0,
        stats: chatStats.value,
      }
    }

    // Save to Supabase first
    const savedChat = await saveChatHistory(newChat)
    
    // Update aiChat state
    await aiChat.loadChat(savedChat.id)
    
    // Sync chat history
    await syncChatHistory()
    
    return savedChat
  } catch (error) {
    logger.error('Failed to create new chat:', error)
    throw error
  }
}

const loadChat = async (id: string) => {
  try {
    logger.debug("Loading chat", { id })

    isSending.value = true // Show loading state in input
    await aiChat.loadChat(id)

    // Scroll to bottom when loading a new chat
    nextTick(() => {
      scrollToBottom()
    })

    await syncChatHistory()
  } catch (error) {
    logger.error('Failed to load chat:', error)
  } finally {
    isSending.value = false
  }
}

const setModel = (modelId: string) => {
  aiChat.setModel(modelId)
}

const handleDeleteChat = async (id: string) => {
  // TODO: Implement chat deletion
  logger.debug('Delete chat requested for:', id)
}

const exportChat = () => {
  aiChat.exportChat()
}

// =========================================
// API and message handling
// =========================================
const setApiKey = async (key: string) => {
  try {
    await openRouter.saveApiKey(key)
  } catch (error) {
    logger.error('Failed to save API key:', error)
  }
}

const handleSendMessage = async (content: string, images?: File[]) => {
  if (!content.trim() && (!images || images.length === 0) || isSending.value) return;

  isSending.value = true;
  try {
    await aiChat.sendMessage(content, undefined, images);
  } catch (error) {
    logger.error('Failed to send message:', error);
  } finally {
    isSending.value = false;
  }
};

// =========================================
// UI utility functions
// =========================================
const scrollToBottom = () => {
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}

const formatModelCost = (modelId: string, cost: number): string => {
  return `$${cost.toFixed(4)}`
}

// =========================================
// Placeholder functions for future implementation
// =========================================
const handleObsidianLink = () => { 
  // Placeholder for Obsidian integration
}

const handlePruneBefore = (message: ChatMessageType) => {
  // Placeholder for message pruning
  logger.debug('Pruning before message:', message.id)
}

const handleRemoveDocument = (path: string) => {
  // Placeholder for document removal
  logger.debug('Removing document:', path)
}

// =========================================
// Loading sequence implementation
// =========================================
const initializeLoadingSequence = async () => {
  try {
    // Define loading steps
    addStep({ id: 'init', label: 'Initializing application...', delay: 0 })
    addStep({ id: 'auth', label: 'Checking authentication...', delay: 300 })
    addStep({ id: 'models', label: 'Loading available models...', delay: 300 })
    addStep({ id: 'chat-history', label: 'Loading chat history...', delay: 300 })

    // Start the sequence
    await startSequence()

    // Initialize core app
    await new Promise(resolve => setTimeout(resolve, 500))
    completeStep('init')

    // Check authentication
    if (!isAuthenticated.value) {
      completeStep('auth')
      completeStep('models')
      completeStep('chat-history')
      return
    }
    completeStep('auth')

    // Load models
    try {
      await openRouter.fetchAvailableModels()
      const firstModel = openRouter.availableModels.value?.[0]
      if (firstModel) {
        aiChat.setModel(firstModel.id)
      }
      completeStep('models')
    } catch (error) {
      logger.error('Failed to load models:', error)
      completeStep('models', false)
    }

    // Load chat history
    try {
      await syncChatHistory()

      // Load most recent chat if one exists and no chat is currently loaded
      if (chatHistory.value.length > 0 && !currentChatId.value) {
        // Sort by lastUpdated and get most recent chat
        const mostRecentChat = [...chatHistory.value]
          .sort((a, b) => {
            const aDate = a.metadata?.lastUpdated ? new Date(a.metadata.lastUpdated) : new Date(0)
            const bDate = b.metadata?.lastUpdated ? new Date(b.metadata.lastUpdated) : new Date(0)
            return bDate.getTime() - aDate.getTime()
          })[0]

        if (mostRecentChat) {
          logger.debug("Loading most recent chat", {
            chatId: mostRecentChat.id,
            lastUpdated: mostRecentChat.metadata?.lastUpdated
          })
          await loadChat(mostRecentChat.id)
        }
      }

      completeStep('chat-history')
    } catch (error) {
      logger.error('Failed to load chat history:', error)
      completeStep('chat-history', false)
    }
  } catch (error) {
    logger.error('Error during loading sequence:', error)
    steps.value.forEach(step => completeStep(step.id, false))
  }
}

// =========================================
// Lifecycle hooks and watchers
// =========================================
onMounted(async () => {
  // Setup keyboard shortcuts
  setupKeyboardShortcuts()
  
  // Setup IPC listeners for desktop app
  const cleanupFns = setupIpcListeners()
  
  // Initialize loading sequence
  await initializeLoadingSequence()
  
  // Cleanup listeners when component unmounts
  onUnmounted(() => {
    logger.debug('Cleaning up IPC listeners')
    cleanupFns.forEach(cleanup => cleanup && cleanup())
  })
})

// Watch messages and scroll to bottom when they change
watch(messages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

// Watch for auth state to reload chat history
watch(isAuthenticated, async (newValue) => {
  logger.debug("Auth state changed", {
    isAuthenticated: newValue,
    userId: user?.value?.id
  })

  if (newValue) {
    await syncChatHistory()
  } else {
    chatHistory.value = []
    logger.debug("Cleared chat history due to logout")
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
