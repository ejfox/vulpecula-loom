<template>
  <!-- Z-index layers (using Tailwind):
    z-0:    Default/base layer
    z-10:   Base app content (main chat area)
    z-20:   Floating UI elements (dropdowns, popovers)
    z-30:   Sidebar/panels (when floating)
    z-40:   Modal backdrops
    z-50:   Modals/dialogs/overlays
  -->
  <div class="h-screen flex flex-col bg-white dark:bg-oled-black">
    <!-- Base App Shell -->
    <div v-if="isAuthenticated" class="relative flex flex-col flex-1 min-h-0">
      <!-- Title Bar -->
      <TitleBar :model-name="modelName" :is-loading="isLoading" :is-sending="isSending"
        :is-context-panel-open="isContextPanelOpen" :is-chat-sidebar-open="isChatSidebarOpen" :is-mobile="isMobile"
        :current-model="currentModel" :available-models="availableModels"
        @update:is-context-panel-open="isContextPanelOpen = $event"
        @update:is-chat-sidebar-open="isChatSidebarOpen = $event" @set-model="setModel"
        @open-settings="isSettingsModalOpen = true" @open-api-keys="isSettingsModalOpen = true"
        class="relative z-20 flex-shrink-0" />

      <!-- Main Content Area -->
      <div class="flex-1 flex min-h-0 p-1.5 gap-1.5 relative overflow-hidden">
        <!-- Chat Sidebar Container with Beautiful Enter/Leave Transitions -->
        <div class="sidebar-container"
          :class="{ 'sidebar-open': isChatSidebarOpen, 'sidebar-closed': !isChatSidebarOpen }">
          <Transition enter-active-class="transform-transition-enter" leave-active-class="transform-transition-leave"
            enter-from-class="-translate-x-full" leave-to-class="-translate-x-full">
            <div v-if="isChatSidebarOpen" :class="[
              'bg-white dark:bg-oled-black rounded-lg overflow-hidden flex flex-col h-full',
              isMobile ? 'fixed inset-y-0 left-0 z-30 w-80 mt-10' : 'w-full'
            ]">
              <ChatSidebar :chat-history="chatHistory" :current-chat-id="currentChatId" @new-chat="createNewChat"
                @load-chat="loadChat" @delete-chat="handleDeleteChat" @rename-chat="renameChat"
                :is-ai-responding="isSending" />
            </div>
          </Transition>
        </div>

        <!-- Main Chat Area with Coordinated Transition -->
        <main
          class="main-content-container flex flex-col min-h-0 bg-white dark:bg-oled-black rounded-lg overflow-hidden relative"
          :class="{ 'content-with-sidebar': isChatSidebarOpen, 'content-without-sidebar': !isChatSidebarOpen }">
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

          <!-- Context Usage Bar -->
          <ContextUsageBar :key="`context-usage-${currentModel}`"
            :total-tokens="(currentChatStats?.promptTokens || 0) + (currentChatStats?.completionTokens || 0)"
            :model-context-size="getModelContextSize(currentModel)"
            v-model:is-context-panel-open="isContextPanelOpen" />

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

    <!-- Keyboard Shortcuts Modal -->
    <KeyboardShortcutsModal :is-open="isKeyboardShortcutsModalOpen" @close="isKeyboardShortcutsModalOpen = false" />

    <!-- Clear Chat History Confirmation Modal -->
    <ConfirmationModal :is-open="isClearChatHistoryModalOpen" title="Clear Chat History"
      message="Are you sure you want to clear all chat history? This action cannot be undone."
      confirm-text="Clear All History" cancel-text="Cancel" :is-dangerous="true" @confirm="confirmClearChatHistory"
      @cancel="isClearChatHistoryModalOpen = false" />

    <!-- Add title banner component -->
    <ChatTitleBanner />

    <!-- Log Ticker -->
    <LogTicker :max-logs="100" />

    <!-- Persistent Debug Console Toggle -->
    <DebugConsoleToggle />
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
import { useObsidianFiles } from './composables/useObsidianFiles'
import type { ObsidianFile } from './types'

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
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal.vue'
import ConfirmationModal from './components/ConfirmationModal.vue'
import ChatTitleBanner from './components/ChatTitleBanner.vue'
import ContextUsageBar from './components/ContextUsageBar.vue'
import LogTicker from './components/LogTicker.vue'
import DebugConsoleToggle from './components/DebugConsoleToggle.vue'

// Types
import type { ChatMessage as ChatMessageType, ChatStats, Chat } from './types'

// Utilities
import logger from './lib/logger'

// =========================================
// Core application state and composables
// =========================================
const { isAuthenticated, user } = useActiveUser()
const { loadChatHistories, saveChatHistory, deleteAllChats } = useSupabase()
const { isDark, systemPrefersDark } = useTheme()
const aiChat = useAIChat()
const openRouter = useOpenRouter()
const store = useStore()
const obsidian = useObsidianFiles()

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
const obsidianSearchResults = ref<ObsidianFile[]>([])
const searchQuery = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)
const messageInput = ref('')
const isKeyboardShortcutsModalOpen = ref(false)
const isClearChatHistoryModalOpen = ref(false)

// =========================================
// Chat state
// =========================================
const messages = computed(() => aiChat.messages.value)
const chatHistory = ref<Chat[]>([])
const currentChatId = computed(() => aiChat.currentChatId.value)
const currentModel = computed(() => aiChat.currentModel.value)
const modelName = computed(() => aiChat.modelName.value)
const chatStats = computed<ChatStats>(() => aiChat.chatStats.value || {
  promptTokens: 0,
  completionTokens: 0,
  cost: 0,
  totalMessages: 0,
  responseTime: 0
})

// Create currentChatStats as a reference to chatStats for the ContextUsageBar
const currentChatStats = computed(() => chatStats.value)

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

  // Toggle debug console (Alt+L)
  const alt = useKeyModifier('Alt')
  onKeyStroke(['l', 'L'], (e) => {
    if (alt.value) {
      e.preventDefault()
      // Toggle debug console state
      const currentState = localStorage.getItem('logTickerShow')
      const newState = currentState === 'false' ? 'true' : 'false'
      localStorage.setItem('logTickerShow', newState)

      // Dispatch event to all components
      const event = new CustomEvent('logticker-visibility-changed', {
        detail: { visible: newState === 'true' }
      })
      window.dispatchEvent(event)
    }
  })
}

// =========================================
// IPC event handling for desktop app
// =========================================
const setupIpcListeners = () => {
  if (!window.electron) return []

  return [
    window.electron.ipc.on("menu:open-settings", () => {
      logger.debug('Opening settings from menu')
      isSettingsModalOpen.value = true
    }),

    window.electron.ipc.on("menu:new-chat", () => {
      logger.debug('Creating new chat from menu')
      createNewChat()
    }),

    window.electron.ipc.on("menu:export-chat", () => {
      logger.debug('Exporting chat from menu')
      exportChat()
    }),

    window.electron.ipc.on("menu:toggle-chat-sidebar", () => {
      logger.debug('Toggling chat sidebar from menu')
      isChatSidebarOpen.value = !isChatSidebarOpen.value
    }),

    window.electron.ipc.on("menu:toggle-context-panel", () => {
      logger.debug('Toggling context panel from menu')
      isContextPanelOpen.value = !isContextPanelOpen.value
    }),

    // New menu action handlers
    window.electron.ipc.on("menu:print-chat", () => {
      logger.debug('Printing chat from menu')
      if (window.electron) {
        window.electron.ipc.invoke('print-window')
      } else {
        window.print()
      }
    }),

    window.electron.ipc.on("menu:search-in-chat", () => {
      logger.debug('Search in chat from menu')
      // TODO: Implement search functionality
      // This could open a search overlay or focus a search input
    }),

    window.electron.ipc.on("menu:search-across-chats", () => {
      logger.debug('Search across chats from menu')
      // TODO: Implement cross-chat search
      // This would likely open the sidebar with a search field focused
      isChatSidebarOpen.value = true
    }),

    window.electron.ipc.on("menu:clear-chat-history", () => {
      logger.debug('Clear chat history from menu')
      showClearChatHistoryModal()
    }),

    window.electron.ipc.on("menu:regenerate-response", () => {
      logger.debug('Regenerate response from menu')
      // TODO: Implement regenerate functionality
      // This should regenerate the last AI response
    }),

    window.electron.ipc.on("menu:change-model", () => {
      logger.debug('Change model from menu')
      // Open settings modal with model selection tab focused
      isSettingsModalOpen.value = true
    }),

    window.electron.ipc.on("menu:show-keyboard-shortcuts", () => {
      logger.debug('Show keyboard shortcuts from menu')
      isKeyboardShortcutsModalOpen.value = true
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

/**
 * Show the confirmation modal for clearing chat history
 */
const showClearChatHistoryModal = () => {
  isClearChatHistoryModalOpen.value = true
}

/**
 * Clear all chat history after confirmation
 */
const confirmClearChatHistory = async () => {
  try {
    logger.debug("Clearing all chat history")

    // Close the modal first
    isClearChatHistoryModalOpen.value = false

    // Create a new chat to switch to
    const newChat = await createNewChat()

    // Delete all chat history from Supabase
    await deleteAllChats()

    // Clear local chat history
    chatHistory.value = [newChat]

    // Load the new chat
    await loadChat(newChat.id)

    logger.debug("All chat history cleared successfully")
  } catch (error) {
    logger.error('Failed to clear chat history:', error)
  }
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
// Obsidian integration
// =========================================
const handleObsidianLink = async (params: any) => {
  try {
    if (!obsidian.hasVault.value) {
      logger.warn('No Obsidian vault configured')
      return
    }

    const { file, messageIncludedFiles } = params
    logger.debug('Handling Obsidian link:', file.title)

    // Get content for the file
    isSearchingFiles.value = true
    const vaultPath = obsidian.vaultPath.value

    if (vaultPath && file.path) {
      try {
        const response = await window.electron?.ipc.invoke('get-obsidian-file-content', {
          vaultPath,
          filePath: file.path
        })

        // Update the included file with content
        if (response && response.content && messageIncludedFiles.value) {
          const fileIndex = messageIncludedFiles.value.findIndex((f: { path: string }) => f.path === file.path)
          if (fileIndex >= 0) {
            messageIncludedFiles.value[fileIndex].content = response.content
            logger.debug(`Added content to ${file.title}, length: ${response.content.length}`)
          }
        }
      } catch (err) {
        logger.error('Failed to get file content:', err)
      }
    }

    isSearchingFiles.value = false
  } catch (error) {
    logger.error('Error handling Obsidian link:', error)
    isSearchingFiles.value = false
  }
}

// =========================================
// Placeholder functions for future implementation
// =========================================
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

// Watch for model changes to update the UI
watch(currentModel, () => {
  // Force refresh of chat stats display when model changes
  logger.debug("Model changed to:", currentModel.value)
  // The chat stats and context size calculations will automatically update
  // through their respective computed properties
})

// =========================================
// Functions
// =========================================

// Get the context size for a given model
function getModelContextSize(modelId: string): number {
  if (!modelId) return 8192 // Default size

  // Claude models have different context sizes
  if (modelId.includes('claude-3-opus')) return 200000
  if (modelId.includes('claude-3-sonnet')) return 180000
  if (modelId.includes('claude-3-haiku')) return 150000
  if (modelId.includes('claude-2')) return 100000
  if (modelId.includes('claude-')) return 100000

  // GPT models
  if (modelId.includes('gpt-4-turbo')) return 128000
  if (modelId.includes('gpt-4-1106')) return 128000
  if (modelId.includes('gpt-4-32k')) return 32768
  if (modelId.includes('gpt-4')) return 8192
  if (modelId.includes('gpt-3.5-turbo-16k')) return 16384
  if (modelId.includes('gpt-3.5')) return 16384

  // Anthropic models (more specific versions)
  if (modelId.includes('anthropic/claude-3-opus')) return 200000
  if (modelId.includes('anthropic/claude-3-sonnet')) return 180000
  if (modelId.includes('anthropic/claude-3-haiku')) return 150000

  // Default for unknown models
  return 8192
}

// Add renameChat function
const renameChat = async (id: string, newTitle: string) => {
  try {
    logger.debug("Renaming chat", { id, newTitle })

    // Find the chat in history
    const chatToUpdate = chatHistory.value.find(c => c.id === id)
    if (!chatToUpdate) {
      logger.warn("Chat not found for renaming", { id })
      return
    }

    // Update title
    chatToUpdate.title = newTitle

    // We need to create a new object with the right type for saveChatHistory
    const chatForSaving = {
      title: newTitle,
      messages: chatToUpdate.messages,
      model: chatToUpdate.model,
      metadata: chatToUpdate.metadata,
      thread: chatToUpdate.thread === null ? undefined : chatToUpdate.thread
    }

    // Save to database
    await saveChatHistory(chatForSaving)

    // Sync chat history to update the UI
    await syncChatHistory()

    logger.debug("Chat renamed successfully", { id, newTitle })
  } catch (error) {
    logger.error('Failed to rename chat:', error)
  }
}

// Initialize obsidian integration
watch(() => obsidian.hasVault.value, (hasVault) => {
  hasObsidianVault.value = hasVault
  logger.debug('Obsidian vault detected:', hasVault)
})

// Watch for search query changes
watch(() => searchQuery.value, async (query) => {
  console.log('App.vue - searchQuery changed:', query)
  console.log('App.vue - hasObsidianVault:', obsidian.hasVault.value)

  if (query && obsidian.hasVault.value) {
    isSearchingFiles.value = true
    console.log('App.vue - Before searchFiles call')
    await obsidian.searchFiles(query)
    console.log('App.vue - After searchFiles call')
    console.log('App.vue - searchResults:', obsidian.searchResults.value)
    obsidianSearchResults.value = obsidian.searchResults.value as ObsidianFile[]
    isSearchingFiles.value = false
    logger.debug('Obsidian search results:', obsidianSearchResults.value.length)
  } else {
    obsidianSearchResults.value = []
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

/* Beautiful coordinated transitions */
.sidebar-container {
  transition-property: width, flex-basis;
  transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
  /* Quad easing */
  transition-duration: 450ms;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar-open {
  width: 38.2%;
  max-width: 24rem;
  /* max-w-sm equivalent */
}

.sidebar-closed {
  width: 0;
}

/* Add text fade effect for smoother content transitions */
.sidebar-container,
.main-content-container {
  position: relative;
}

.sidebar-container::after,
.main-content-container::after {
  content: '';
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0);
  pointer-events: none;
  z-index: 10;
  transition: background-color 180ms ease-in-out;
}

.sidebar-open::after {
  background-color: rgba(255, 255, 255, 0);
}

.sidebar-closed::after {
  background-color: rgba(255, 255, 255, 1);
}

/* Apply to dark mode too */
.dark .sidebar-container::after,
.dark .main-content-container::after {
  background-color: rgba(0, 0, 0, 0);
}

.dark .sidebar-closed::after {
  background-color: rgba(0, 0, 0, 1);
}

/* Apply the fade effect to main content as well for consistent resizing */
.content-with-sidebar::after {
  background-color: rgba(255, 255, 255, 0);
}

.content-without-sidebar::after {
  background-color: rgba(255, 255, 255, 0.2);
  /* Just a hint of fade for main content */
  animation: quick-flash 450ms;
}

.dark .content-with-sidebar::after {
  background-color: rgba(0, 0, 0, 0);
}

.dark .content-without-sidebar::after {
  background-color: rgba(0, 0, 0, 0.2);
  /* Just a hint of fade for main content in dark mode */
  animation: quick-flash-dark 450ms;
}

@keyframes quick-flash {
  0% {
    background-color: rgba(255, 255, 255, 0);
  }

  25% {
    background-color: rgba(255, 255, 255, 0.35);
  }

  75% {
    background-color: rgba(255, 255, 255, 0.35);
  }

  100% {
    background-color: rgba(255, 255, 255, 0);
  }
}

@keyframes quick-flash-dark {
  0% {
    background-color: rgba(0, 0, 0, 0);
  }

  25% {
    background-color: rgba(0, 0, 0, 0.35);
  }

  75% {
    background-color: rgba(0, 0, 0, 0.35);
  }

  100% {
    background-color: rgba(0, 0, 0, 0);
  }
}

.main-content-container {
  transition-property: flex-grow, width;
  transition-timing-function: cubic-bezier(0.33, 0, 0.67, 1);
  /* Slightly different easing for staggered effect */
  transition-duration: 450ms;
  transition-delay: 25ms;
  /* Subtle stagger for refinement */
  flex: 1;
}

/* Stagger the transform and opacity transitions separately */
.transform-transition-enter {
  transition: transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease;
  /* Slightly bouncy transform */
  opacity: 0;
  animation: subtle-fade-in 450ms forwards;
}

.transform-transition-leave {
  transition: transform 450ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 250ms ease;
  opacity: 1;
  animation: subtle-fade-out 350ms forwards;
}

@keyframes subtle-fade-in {
  0% {
    opacity: 0;
  }

  30% {
    opacity: 0.5;
  }

  100% {
    opacity: 1;
  }
}

@keyframes subtle-fade-out {
  0% {
    opacity: 1;
  }

  70% {
    opacity: 0.5;
  }

  100% {
    opacity: 0;
  }
}

/* For mobile devices, maintain existing behavior */
@media (max-width: 640px) {
  .sidebar-container {
    position: absolute;
    z-index: 30;
    width: auto;
  }

  .sidebar-open,
  .sidebar-closed {
    width: auto;
    max-width: none;
  }
}
</style>
