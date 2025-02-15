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
    <div v-if="isAuthenticated" class="relative flex flex-col flex-1">
      <!-- Title Bar -->
      <TitleBar :model-name="modelName" :is-loading="isLoading" :is-sending="isSending"
        :is-context-panel-open="isContextPanelOpen" :is-chat-sidebar-open="isChatSidebarOpen" :is-mobile="isMobile"
        @update:is-context-panel-open="isContextPanelOpen = $event"
        @update:is-chat-sidebar-open="isChatSidebarOpen = $event" class="relative z-20" />

      <!-- Main Content Area -->
      <div class="flex-1 flex min-h-0 p-1.5 gap-1.5 relative">
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
          <ChatMetadata :stats="chatStats" @export="exportChat" />

          <!-- API Key Warning -->
          <ApiKeyWarning :has-valid-key="openRouter.hasValidKey" :saving-key="isLoading" @save-api-key="setApiKey" />

          <!-- Messages Container -->
          <div ref="chatContainerRef" class="flex-1 overflow-y-auto p-4 space-y-4">
            <ChatMessage v-for="(message, index) in messages"
              :key="message.id || `msg-${currentChatId}-${index}-${message.timestamp}`" :message="message"
              :model-name="modelName" :index="index" :current-chat-id="currentChatId"
              :format-model-cost="formatModelCost" />
          </div>

          <!-- Input Area -->
          <div class="relative z-20">
            <ChatInput v-model="newMessage" :is-loading="isSending" :has-valid-key="hasValidKey"
              :show-mention-popup="showMentionPopup" :is-searching-files="isSearchingFiles"
              :has-obsidian-vault="hasObsidianVault" :obsidian-search-results="obsidianSearchResults"
              @send="handleSendMessage" @mention-popup="(show) => showMentionPopup = show"
              @obsidian-link="handleObsidianLink" @input="(query) => searchQuery = query" />
          </div>
        </main>
      </div>

      <!-- Context Panel -->
      <ContextAlchemyPanel :is-context-panel-open="isContextPanelOpen" :messages="messages" :chat-stats="chatStats"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useLoadingSequence } from './composables/useLoadingSequence'
import { useActiveUser } from './composables/useActiveUser'
import { useBreakpoints } from '@vueuse/core'
import { useTheme } from './composables/useTheme'
import LoadingOverlay from './components/LoadingOverlay.vue'
import LoginOverlay from './components/LoginOverlay.vue'
import TitleBar from './components/TitleBar.vue'
import ChatSidebar from './components/ChatSidebar.vue'
import ChatMetadata from './components/ChatMetadata.vue'
import ApiKeyWarning from './components/ApiKeyWarning.vue'
import ChatMessage from './components/ChatMessage.vue'
import ChatInput from './components/ChatInput.vue'
import type { ChatMessage as ChatMessageType, ChatStats, OpenRouterModel, Chat } from './types'
import { useOpenRouter } from './composables/useOpenRouter'
import { useSupabase } from './composables/useSupabase'

const { steps, addStep, startSequence, completeStep, isComplete } = useLoadingSequence()
const { isAuthenticated } = useActiveUser()
const { loadChatHistories } = useSupabase()
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

// Chat state
const messages = ref<ChatMessageType[]>([])
const newMessage = ref('')
const currentChatId = ref('')
const currentModel = ref('')
const modelName = ref('')
const chatHistory = ref<Chat[]>([])
const availableModels = ref<OpenRouterModel[]>([])
const preferences = ref({ showOnlyPinnedModels: false })
const chatStats = ref<ChatStats>({
  promptTokens: 0,
  completionTokens: 0,
  cost: 0,
  totalMessages: 0
})
const chatContainerRef = ref<HTMLElement>()

// UI state
const isLoading = ref(false)
const isSending = ref(false)
const isContextPanelOpen = ref(false)
const isChatSidebarOpen = ref(true)
const showMentionPopup = ref(false)
const isSearchingFiles = ref(false)
const hasObsidianVault = ref(false)
const obsidianSearchResults = ref([])
const searchQuery = ref('')
const hasValidKey = ref(false)
const openRouter = useOpenRouter()

// Methods
const createNewChat = () => { }
const loadChat = () => { }
const setModel = () => { }
const handleDeleteChat = () => { }
const exportChat = () => { }
const setApiKey = () => { }
const handleSendMessage = () => { }
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

// Set up loading sequence
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
      availableModels.value = openRouter.availableModels.value || []
      if (availableModels.value.length > 0) {
        currentModel.value = availableModels.value[0].id
        modelName.value = availableModels.value[0].name || availableModels.value[0].id.split('/').pop() || ''
      }
      completeStep('models')
    } catch (error) {
      console.error('Failed to load models:', error)
      completeStep('models', false)
    }

    // Load chat history
    try {
      const history = await loadChatHistories()
      chatHistory.value = history || []
      completeStep('chat-history')
    } catch (error) {
      console.error('Failed to load chat history:', error)
      completeStep('chat-history', false)
    }
  } catch (error) {
    console.error('Error during loading sequence:', error)
    steps.value.forEach(step => completeStep(step.id, false))
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
