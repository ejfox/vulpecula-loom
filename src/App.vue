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
        @update:is-context-panel-open="isContextPanelOpen = $event"
        @update:is-chat-sidebar-open="isChatSidebarOpen = $event" class="relative z-20 flex-shrink-0" />

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
            <ChatSidebar :chat-history="chatHistory" :current-chat-id="currentChatId" :current-model="currentModel"
              :available-models="availableModels" :show-only-pinned-models="preferences.showOnlyPinnedModels"
              @new-chat="createNewChat" @load-chat="loadChat" @set-model="setModel" @delete-chat="handleDeleteChat" />
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
      @validate-api-key="setApiKey"
      @update:show-only-pinned-models="(value) => preferences.showOnlyPinnedModels = value" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, nextTick, onUnmounted } from 'vue'
import { useLoadingSequence } from './composables/useLoadingSequence'
import { useActiveUser } from './composables/useActiveUser'
import { useBreakpoints, useLocalStorage, useEventBus, useKeyModifier, onKeyStroke } from '@vueuse/core'
import { useTheme } from './composables/useTheme'
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
import type { ChatMessage as ChatMessageType, ChatStats, OpenRouterModel, Chat } from './types'
import { useOpenRouter } from './composables/useOpenRouter'
import { useSupabase } from './composables/useSupabase'
import { useAIChat } from './composables/useAIChat'
import { useStore } from './lib/store'
import logger from './lib/logger'

const { steps, addStep, startSequence, completeStep, isComplete } = useLoadingSequence()
const { isAuthenticated, user } = useActiveUser()
const { loadChatHistories, supabase, saveChatHistory } = useSupabase()
const breakpoints = useBreakpoints({
  mobile: 640
})
const isMobile = breakpoints.smaller('mobile')

// Initialize theme
const { isDark, systemPrefersDark } = useTheme()

// Watch system preference changes
watch(systemPrefersDark, (prefersDark) => {
  // Update theme class on root element
  document.documentElement.classList.toggle('dark', prefersDark)
}, { immediate: true })

// Initialize composables
const aiChat = useAIChat()
const openRouter = useOpenRouter()
const store = useStore()

// Setup IPC listeners for menu actions
onMounted(() => {
  if (window.electron) {
    const cleanupFns = [
      window.electron.onOpenSettings(() => {
        console.log('Opening settings from menu')
        isSettingsModalOpen.value = true
      }),

      window.electron.onNewChat(() => {
        console.log('Creating new chat from menu')
        createNewChat()
      }),

      window.electron.onExportChat(() => {
        console.log('Exporting chat from menu')
        exportChat()
      }),

      window.electron.onToggleChatSidebar(() => {
        console.log('Toggling chat sidebar from menu')
        isChatSidebarOpen.value = !isChatSidebarOpen.value
      }),

      window.electron.onToggleContextPanel(() => {
        console.log('Toggling context panel from menu')
        isContextPanelOpen.value = !isContextPanelOpen.value
      })
    ]

    // Cleanup listeners when component unmounts
    onUnmounted(() => {
      console.log('Cleaning up IPC listeners')
      cleanupFns.forEach(cleanup => cleanup && cleanup())
    })
  }
})

// Keyboard shortcuts
const meta = useKeyModifier('Meta')

// Toggle panels with keyboard shortcuts
onKeyStroke('k', (e) => {
  if (meta.value) {
    e.preventDefault()
    isChatSidebarOpen.value = !isChatSidebarOpen.value
  }
})

onKeyStroke('/', (e) => {
  if (meta.value) {
    e.preventDefault()
    isContextPanelOpen.value = !isContextPanelOpen.value
  }
})

onKeyStroke('n', (e) => {
  if (meta.value) {
    e.preventDefault()
    createNewChat()
  }
})

// Add settings shortcut (Command + ,)
onKeyStroke(',', (e) => {
  if (meta.value) {
    e.preventDefault()
    isSettingsModalOpen.value = !isSettingsModalOpen.value
  }
})

// Chat state
const messages = computed(() => aiChat.messages.value)
const chatHistory = ref<Chat[]>([])
const availableModels = computed(() => {
  return openRouter.availableModels.value?.map(model => ({
    ...model, // Keep all original properties
    name: model.name || model.id.split('/').pop() || '',
    description: model.description
  })) || []
})
const preferences = useLocalStorage('preferences', {
  showOnlyPinnedModels: false,
  // Add other preferences here as we need them
})
const chatContainerRef = ref<HTMLElement>()
const messageInput = ref('')

// UI state
const isLoading = computed(() => aiChat.isLoading.value)
const isSending = ref(false)
const isContextPanelOpen = useLocalStorage('isContextPanelOpen', false)
const isChatSidebarOpen = useLocalStorage('isChatSidebarOpen', !isMobile)
const isSettingsModalOpen = ref(false)
const showMentionPopup = ref(false)
const isSearchingFiles = ref(false)
const hasObsidianVault = ref(false)
const obsidianSearchResults = ref([])
const searchQuery = ref('')

// Computed properties from AI Chat
const currentChatId = computed(() => aiChat.currentChatId.value)
const currentModel = computed(() => aiChat.currentModel.value)
const modelName = computed(() => aiChat.modelName.value)
const chatStats = computed(() => aiChat.chatStats.value)

// Sync hasValidKey with openRouter
const hasValidKey = computed(() => openRouter.hasValidKey.value)

// Add computed property for showing welcome screen
const shouldShowWelcome = computed(() => {
  return messages.value.length === 0 && chatHistory.value.length === 0
})

// Add function to sync chat history from Supabase
const syncChatHistory = async () => {
  try {
    logger.debug("Starting chat history sync", {
      currentChatId: currentChatId.value,
      currentHistoryLength: chatHistory.value.length,
      isAuthenticated: isAuthenticated.value,
      userId: user?.value?.id
    })

    const histories = await loadChatHistories()
    logger.debug("Raw histories from Supabase", {
      count: histories?.length || 0,
      firstChat: histories?.[0]?.id,
      lastChat: histories?.[histories?.length - 1]?.id,
      allIds: histories?.map(h => h.id)
    })

    if (histories) {
      chatHistory.value = histories
      logger.debug("Chat history updated", {
        newLength: chatHistory.value.length,
        currentChat: currentChatId.value,
        chatTitles: chatHistory.value.map(c => ({ id: c.id, title: c.title })),
        messageStats: chatHistory.value.map(c => ({
          id: c.id,
          messageCount: c.messages?.length || 0
        }))
      })
    } else {
      logger.warn("No histories returned from Supabase")
    }
  } catch (error) {
    logger.error('Failed to sync chat history:', error)
  }
}

// Methods
const createNewChat = async () => {
  try {
    logger.debug("Creating new chat from UI", {
      currentModel: currentModel.value,
      currentHistoryLength: chatHistory.value.length
    })

    // Generate a UUID for the new chat that will be consistent between local and Supabase
    const chatId = crypto.randomUUID()
    logger.debug("Generated new chat ID", { chatId })

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
    logger.debug("Saving new chat to Supabase", { chat: newChat })
    const savedChat = await saveChatHistory(newChat)
    logger.debug("Chat saved to Supabase", {
      savedId: savedChat.id,
      model: savedChat.model
    })

    // Update aiChat state
    await aiChat.loadChat(savedChat.id)
    logger.debug("Loaded new chat in aiChat", {
      currentChatId: aiChat.currentChatId.value,
      messageCount: aiChat.messages.value.length
    })

    // Sync chat history
    await syncChatHistory()
    logger.debug("History synced after new chat", {
      historyLength: chatHistory.value.length,
      newChatInHistory: chatHistory.value.some(c => c.id === savedChat.id),
      allChatIds: chatHistory.value.map(c => c.id)
    })

    return savedChat
  } catch (error) {
    logger.error('Failed to create new chat:', error)
    throw error
  }
}

const loadChat = async (id: string) => {
  try {
    logger.debug("Loading chat", {
      id,
      currentChatId: currentChatId.value,
      currentHistoryLength: chatHistory.value.length
    })

    isSending.value = true // Show loading state in input
    await aiChat.loadChat(id)

    // Scroll to bottom when loading a new chat
    nextTick(() => {
      scrollToBottom()
    })

    logger.debug("Chat loaded in aiChat", {
      loadedId: id,
      messageCount: messages.value.length
    })

    await syncChatHistory()
    logger.debug("History synced after loading chat", {
      historyLength: chatHistory.value.length,
      loadedChatInHistory: chatHistory.value.some(c => c.id === id),
      currentChatMessages: messages.value.length
    })
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
}

const exportChat = () => {
  aiChat.exportChat()
}

const setApiKey = async (key: string) => {
  try {
    await openRouter.saveApiKey(key)
  } catch (error) {
    console.error('Failed to save API key:', error)
  }
}

const handleSendMessage = async (content: string, images?: File[]) => {
  if (!content.trim() && (!images || images.length === 0) || isSending.value) return;

  isSending.value = true;
  try {
    await aiChat.sendMessage(content, undefined, images);
  } catch (error) {
    console.error('Failed to send message:', error);
  } finally {
    isSending.value = false;
  }
};

const handleObsidianLink = () => { }
const handlePruneBefore = (message: ChatMessageType) => {
  // Implement pruning logic
  console.log('Pruning before message:', message)
}
const handleRemoveDocument = (path: string) => {
  // Implement document removal logic
  console.log('Removing document:', path)
}
const formatModelCost = (modelId: string, cost: number): string => {
  return `$${cost.toFixed(4)}`
}

// Add scroll to bottom functionality
const scrollToBottom = () => {
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}

// Watch messages and scroll to bottom when they change
watch(messages, () => {
  // Use nextTick to ensure DOM is updated before scrolling
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

// Watch for chat updates
onMounted(async () => {
  try {
    // Add loading steps
    addStep({
      id: 'init',
      label: 'Initializing application...',
      delay: 0
    })

    addStep({
      id: 'auth',
      label: 'Checking authentication...',
      delay: 300
    })

    addStep({
      id: 'models',
      label: 'Loading available models...',
      delay: 300
    })

    addStep({
      id: 'chat-history',
      label: 'Loading chat history...',
      delay: 300
    })

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
})

// Watch chat history changes
watch(chatHistory, (newHistory) => {
  // logger.debug("Chat history changed", {
  //   length: newHistory.length,
  //   ids: newHistory.map(c => c.id),
  //   currentChatId: currentChatId.value
  // })
}, { deep: true })

// Watch for auth state to reload chat history
watch(isAuthenticated, async (newValue) => {
  logger.debug("Auth state changed", {
    isAuthenticated: newValue,
    userId: user?.value?.id,
    currentHistoryLength: chatHistory.value.length
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
