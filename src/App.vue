<template>
  <div class="h-screen flex flex-col bg-gray-900 dark:bg-gray-950 overflow-hidden">
    <TitleBar :model-name="modelName" :is-loading="isLoading" :is-sending="isSending"
      v-model:isContextPanelOpen="isContextPanelOpen" v-model:isChatSidebarOpen="isChatSidebarOpen"
      :is-mobile="isMobile">
      <template #actions>
        <!-- Context Panel Toggle Button -->
        <button v-if="!isMobile" @click="isContextPanelOpen = !isContextPanelOpen"
          class="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          :class="{ 'text-gray-700 dark:text-gray-200': isContextPanelOpen }">
          <span class="sr-only">Toggle context panel</span>
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </template>
    </TitleBar>

    <!-- Main Layout -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <!-- Left side: Sidebar + Chat -->
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div class="flex-1 flex min-h-0 p-1.5 gap-1.5 relative overflow-hidden">
          <!-- Chat Sidebar -->
          <Transition enter-active-class="transition-transform duration-300 ease-in-out"
            leave-active-class="transition-transform duration-300 ease-in-out" enter-from-class="-translate-x-full"
            leave-to-class="-translate-x-full">
            <div v-if="isChatSidebarOpen" :class="[
              'bg-white dark:bg-gray-950 rounded-lg overflow-hidden flex flex-col',
              isMobile ? 'fixed inset-y-0 left-0 z-40 w-80 mt-10' : 'w-[38.2%] max-w-sm flex-shrink-0'
            ]">
              <ChatSidebar :chat-history="chatHistory" :current-chat-id="currentChatId" :current-model="currentModel"
                :available-models="availableModels" :show-only-pinned-models="preferences.showOnlyPinnedModels"
                @new-chat="createNewChat" @load-chat="loadChat" @set-model="setModel" @delete-chat="handleDeleteChat" />
            </div>
          </Transition>

          <!-- Main Chat Area -->
          <main class="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-950 rounded-lg overflow-hidden">
            <ChatMetadata :stats="chatStats" @export="exportChat" />

            <!-- API Key Warning -->
            <ApiKeyWarning :has-valid-key="openRouter.hasValidKey" :saving-key="isLoading" @save-api-key="setApiKey" />

            <!-- Supabase Warning -->
            <div v-if="!hasValidSupabaseConfig"
              class="flex-shrink-0 p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100">
              <div class="flex items-center flex-1">
                <span>Please configure Supabase to enable chat history</span>
              </div>
            </div>

            <!-- Messages Container -->
            <div ref="chatContainerRef" class="flex-1 overflow-y-auto p-4 space-y-4">
              <ChatMessage v-for="(message, index) in messages"
                :key="message.id || `msg-${currentChatId}-${index}-${message.timestamp}`" :message="message"
                :model-name="modelName" :index="index" :current-chat-id="currentChatId"
                :is-loading="isLoading && index === messages.length - 1"
                :show-actions="activeMessageActions === (message.id || `msg-${currentChatId}-${index}-${message.timestamp}`)"
                :format-model-cost="formatModelCost" :ref="el => updateMessageElement(index, el)"
                @open-actions="openMessageActions(message, index)" @copy="copyMessage" @delete="deleteMessage"
                @fork="handleForkChat" />
            </div>

            <!-- Input Area -->
            <ChatInput v-model="newMessage" :is-loading="isSending" :has-valid-key="hasValidKey"
              :show-mention-popup="showMentionPopup" :is-searching-files="isSearchingFiles"
              :has-obsidian-vault="hasObsidianVault" :obsidian-search-results="obsidianSearchResults"
              @send="handleSendMessage" @mention-popup="(show) => showMentionPopup = show"
              @obsidian-link="handleObsidianLink" @input="(query) => searchQuery = query" />
          </main>
        </div>
      </div>

      <!-- Context Panel -->
      <Transition enter-active-class="transition-transform duration-300 ease-in-out"
        leave-active-class="transition-transform duration-300 ease-in-out" enter-from-class="translate-x-full"
        leave-to-class="translate-x-full">
        <div v-if="isContextPanelOpen" :class="[
          'bg-white dark:bg-gray-950 overflow-hidden flex flex-col',
          isMobile ? 'fixed inset-y-0 right-0 z-40 w-80 mt-10' : 'w-96 flex-shrink-0'
        ]">
          <ContextAlchemyPanel v-model:isContextPanelOpen="isContextPanelOpen" />
        </div>
      </Transition>
    </div>

    <!-- Settings Modal -->
    <SettingsModal v-model="isSettingsOpen" v-model:theme="theme" v-model:showProgressBar="showProgressBar"
      v-model:showOnlyPinnedModels="preferences.showOnlyPinnedModels" :available-models="openRouter.availableModels.value"
      @validate-api-key="validateApiKey" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useBreakpoints, useScroll, useWindowFocus } from '@vueuse/core'
import { useAIChat } from './composables/useAIChat'
import { useSupabase } from './composables/useSupabase'
import { useOpenRouter } from './composables/useOpenRouter'
import { useObsidianFiles } from './composables/useObsidianFiles'
import { useStore } from './lib/store'
import { useTheme } from './composables/useTheme'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useAnimeAnimations } from './composables/useAnimeAnimations'

// Import ALL types from the central system
import type {
  Chat,
  IncludedFile,
  Mention,
  UIPreferences,
  StoreSchema,
  ObsidianFile,
  ScrollConfig,
  StaggerConfig,
  AnimationConfig,
  ObsidianLinkParams,
  IpcChannels,
  ElectronAPI,
} from './types'

// Import composable types
import type { UseOpenRouterReturn } from './composables/useOpenRouter'
import type { UseSupabaseReturn } from './composables/useSupabase'

// Components
import TitleBar from './components/TitleBar.vue'
import ChatSidebar from './components/ChatSidebar.vue'
import ChatMetadata from './components/ChatMetadata.vue'
import ObsidianMentionPopup from './components/ObsidianMentionPopup.vue'
import ContextAlchemyPanel from './components/ContextAlchemyPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import ChatMessage from './components/ChatMessage.vue'
import ChatInput from './components/ChatInput.vue'
import ApiKeyWarning from './components/ApiKeyWarning.vue'

// Initialize store
const store = useStore()

// Initialize composables
const { scrollTimeline, createScrollObserver } = useAnimeAnimations()
const openRouter = useOpenRouter()
const aiChat = useAIChat()
const supabaseClient = useSupabase()

// Destructure values from composables
const {
  messages,
  isLoading,
  error,
  currentModel,
  modelName,
  currentChatId,
  temperature,
  chatStats,
  availableModels,
  enabledModels,
  sendMessage,
  clearChat,
  setModel,
  loadChat,
  updateTemperature,
  exportChat,
} = aiChat

// Computed values
const hasValidKey = computed(() => openRouter.hasValidKey.value)

// Handle electron IPC calls
const invokeElectron = async <T extends keyof IpcChannels>(
  channel: T,
  ...args: Parameters<IpcChannels[T]>
): Promise<ReturnType<IpcChannels[T]>> => {
  if (!window.electron?.ipc?.invoke) {
    throw new Error('Electron IPC not available')
  }
  return window.electron.ipc.invoke(channel, ...args)
}

// Handle external links
const openExternal = async (url: string) => {
  if (window.electron?.shell?.openExternal) {
    await window.electron.shell.openExternal(url)
  } else {
    window.open(url, '_blank')
  }
}

// OpenRouter functionality (just for API key management and model tracking)
const {
  setApiKey,
  recentModels,
  validateApiKey,
  formatModelCost,
} = openRouter

// Chat history
const {
  supabase,
  isConfigured,
  hasValidSupabaseConfig,
  saveChatHistory,
  updateChatHistory,
  loadChatHistory,
  loadChatHistories,
  deleteChat,
  deleteAllChats,
  updateChatMetadata,
  forkChat: forkChatInDb,
  generateChatSummary,
  createThread,
  addChatToThread,
  getThreadChats,
  removeChatFromThread
} = useSupabase()

// Add refs with proper typing from central system
const messageElements = ref<(HTMLElement | null)[]>([])
const mentions = ref<Mention[]>([])
const messageIncludedFiles = ref<IncludedFile[]>([])
const chatHistory = ref<Chat[]>([])

// UI State
const isSending = ref(false)
const isSettingsOpen = ref(false)
const isChatSidebarOpen = ref(true)
const isContextPanelOpen = ref(false)
const theme = ref<UIPreferences['theme']>('dark')
const showProgressBar = ref(true)

// State
const preferences = ref<UIPreferences>({
  showOnlyPinnedModels: false,
  theme: 'dark',
  showProgressBar: true
})

const pinnedModels = ref<(string | { id: string })[]>([])
const apiKeys = ref<Record<string, string>>({})

// Input handling
const newMessage = ref('')
const tempApiKey = ref('')
const savingKey = ref(false)
const chatContainerRef = ref<HTMLElement | null>(null)

// Breakpoint detection
const breakpoints = useBreakpoints({
  mobile: 620,
  sm: 640,
  md: 768,
  lg: 1024,
})
const isMobile = computed(() => breakpoints.smaller('mobile').value)

// Obsidian integration
const {
  searchQuery,
  searchResults: obsidianSearchResults,
  isSearching: isSearchingFiles,
  hasVault: hasObsidianVault,
} = useObsidianFiles()

const showMentionPopup = ref(false)
const mentionStartIndex = ref(-1)

// Load initial data
const { isDark } = useTheme()

// Update message elements handling with flexible types
const updateMessageElement = (index: number, el: any) => {
  const elements = messageElements.value
  if (!elements) return

  if (!el) {
    elements[index] = null
    return
  }

  const element = el.$el || el
  if (element instanceof HTMLElement) {
    elements[index] = element
  }
}

// Enhanced scroll to bottom function
const scrollToBottom = async (smooth = true) => {
  await nextTick()
  if (!chatContainerRef.value) return

  const container = chatContainerRef.value
  container.scrollTo({
    top: container.scrollHeight,
    behavior: smooth ? 'smooth' : 'instant'
  })
}

// Initialize animations with flexible types
const initializeMessageAnimations = () => {
  if (!chatContainerRef.value || !messageElements.value) return

  const elements = messageElements.value
    .filter(el => el !== null)
    .map(el => ref(el))

  if (elements.length === 0) return

  scrollTimeline(elements, {
    scroll: {
      container: ref(chatContainerRef.value as Element),
      enter: "bottom-=30% top",
      leave: "top+=10% bottom",
      sync: "smooth",
      repeat: true,
      debug: false,
    },
    stagger: {
      value: 50,
      from: "first",
    },
    duration: "normal"
  })
}

// Update watch handlers
watch(messages, async () => {
  await nextTick()
  if (!messageElements.value) return
  messageElements.value = new Array(messages.value.length).fill(null)
  initializeMessageAnimations()
  scrollToBottom()
}, { deep: true })

watch(() => currentChatId.value, async (newId: string | null) => {
  if (!newId) return

  try {
    const loaded: any = await loadChat(newId)
    await nextTick()
    if (!messageElements.value) return
    messageElements.value = new Array(messages.value.length).fill(null)
    initializeMessageAnimations()
    scrollToBottom(false)
  } catch (err) {
    console.error('Failed to load chat:', err)
    error.value = 'Failed to load chat'
  }
}, { immediate: true })

// Keyboard shortcut handler
const handleKeyboardShortcuts = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === ',') {
    e.preventDefault()
    isSettingsOpen.value = true
  }
}

// Initialize animations when component mounts
onMounted(() => {
  initializeMessageAnimations()
})

onMounted(async () => {
  // Add keyboard shortcut handler
  window.addEventListener('keydown', handleKeyboardShortcuts)

  try {
    // Load theme and settings
    const [
      savedTheme,
      savedProgressBar,
      showOnlyPinnedModels,
      savedPinnedModels,
      savedApiKey,
      savedEnabledModelIds,
      savedRecentModelIds
    ] = await Promise.all([
      store.get('theme'),
      store.get('show-progress-bar'),
      store.get('show-only-pinned-models'),
      store.get('pinned-models'),
      store.get('api-key'),
      store.get('enabled-model-ids'),
      store.get('recent-model-ids')
    ])

    // Apply settings
    theme.value = (savedTheme as string || 'dark') as UIPreferences['theme']
    showProgressBar.value = Boolean(savedProgressBar ?? true)
    preferences.value.showOnlyPinnedModels = Boolean(showOnlyPinnedModels)
    pinnedModels.value = savedPinnedModels as string[] || []
    if (savedApiKey) {
      await setApiKey(savedApiKey as string)
      apiKeys.value = { 'openrouter': savedApiKey as string }
    }

    // Load theme
    if (savedTheme === 'dark') {
      isDark.value = true
    } else if (savedTheme === 'light') {
      isDark.value = false
    }

    // Load chat history from Supabase
    chatHistory.value = await loadChatHistories()
    if (chatHistory.value.length > 0 && loadChat) {
      await loadChat(chatHistory.value[0].id)
    }
  } catch (err) {
    console.error('Failed to load initial data:', err)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardShortcuts)
})

// Methods
const saveApiKey = async () => {
  if (!tempApiKey.value.trim()) return

  try {
    savingKey.value = true
    const success = await setApiKey(tempApiKey.value.trim())
    if (success) {
      tempApiKey.value = ''
      error.value = 'API key saved successfully!'
      setTimeout(() => error.value = null, 2000)
    } else {
      error.value = 'Invalid API key'
    }
  } catch (err) {
    console.error('Failed to save API key:', err)
    error.value = 'Failed to save API key'
  } finally {
    savingKey.value = false
  }
}

const createNewChat = async () => {
  try {
    // Clear current messages
    messages.value = []
    currentChatId.value = null

    // Create new chat in Supabase
    const newChat = await saveChatHistory({
      title: null as any,
      messages: [],
      model: currentModel.value,
      metadata: {
        lastModel: currentModel.value,
        lastUpdated: new Date().toISOString(),
        messageCount: 0
      }
    })

    // Set as current chat
    currentChatId.value = newChat.id

    // Refresh chat history
    chatHistory.value = await loadChatHistories()
  } catch (err) {
    console.error('Failed to create new chat:', err)
    error.value = 'Failed to create new chat'
  }
}

const activeMessageActions = ref<string | null>(null)

const openMessageActions = (message: any, index: number) => {
  const messageKey = message.id || `msg-${currentChatId}-${index}-${message.timestamp}`
  activeMessageActions.value = activeMessageActions.value === messageKey ? null : messageKey
}

const copyMessage = async (message: any) => {
  await navigator.clipboard.writeText(message.content)
  activeMessageActions.value = null
}

const deleteMessage = (message: any) => {
  messages.value = messages.value.filter((m: any) => m.id !== message.id)
  activeMessageActions.value = null
}

// Close dropdown when clicking outside
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (activeMessageActions.value && !e.defaultPrevented) {
      activeMessageActions.value = null
    }
  }

  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})

async function handleObsidianLink(params: ObsidianLinkParams) {
  if (!window.electron?.ipc) {
    console.error('Electron IPC not available')
    return
  }

  const vaultPath = await window.electron.ipc.invoke('get-vault-path')
  if (!vaultPath) {
    console.error('No vault path set')
    return
  }

  try {
    const result = await window.electron.ipc.invoke('get-obsidian-file-content', {
      vaultPath,
      filePath: params.file.path
    })

    if (result && result.content) {
      // Create the file inclusion object
      const includedFile: IncludedFile = {
        title: params.file.title,
        path: params.file.path,
        content: result.content
      }

      // Add to included files array if not already present
      if (!messageIncludedFiles.value.some(f => f.path === includedFile.path)) {
        messageIncludedFiles.value.push(includedFile)
      }

      // Create the mention object
      const mention: Mention = {
        startIndex: params.mentionStartIndex,
        endIndex: params.mentionStartIndex + params.file.title.length + 1,
        file: {
          title: params.file.title,
          path: params.file.path
        }
      }

      // Add to mentions array if not already present
      if (!mentions.value.some(m => m.file.path === mention.file.path)) {
        mentions.value.push(mention)
      }

      // Update the message text to include the file reference
      const beforeMention = newMessage.value.slice(0, params.mentionStartIndex)
      const afterMention = newMessage.value.slice(params.mentionStartIndex)
      const mentionText = `@${params.file.title}`
      newMessage.value = `${beforeMention}${mentionText}${afterMention.slice(mentionText.length)}`

      // Hide the mention popup
      showMentionPopup.value = false

      console.log('File included:', {
        file: includedFile,
        mention,
        messageText: newMessage.value
      })
    }
  } catch (error) {
    console.error('Error getting Obsidian file content:', error)
  }
}

// Add forkChat handler
const handleForkChat = async (message: any) => {
  if (!currentChatId.value) return

  // Get all messages up to and including the forked message
  const messageIndex = messages.value.findIndex((m: any) => m.id === message.id)
  if (messageIndex === -1) return

  // Clone messages up to fork point to ensure we have complete copies
  const messagesUpToFork = messages.value.slice(0, messageIndex + 1).map((msg: any) => ({
    ...msg,
    id: crypto.randomUUID(), // Give new IDs to avoid conflicts
    timestamp: new Date().toISOString()
  }))

  try {
    // Create the forked chat
    const forkedChat = await forkChatInDb({
      parentId: currentChatId.value,
      forkMessageId: message.id,
      messages: messagesUpToFork,
      newTitle: `Fork of ${messages.value[0]?.content.slice(0, 30)}...`
    })

    if (forkedChat) {
      // Load the forked chat
      const loadedChat: any = await loadChat(forkedChat.id)
      if (loadedChat) {
        // Update local state
        currentChatId.value = forkedChat.id
        messages.value = loadedChat.messages

        // Refresh chat history
        chatHistory.value = await loadChatHistories()

        // Scroll to bottom
        setTimeout(() => {
          scrollToBottom(false)
        }, 100)
      }
    }
  } catch (err) {
    console.error('Failed to fork chat:', err)
    error.value = 'Failed to fork chat'
  }
}

// Modify the message handling to show popups
const handleNewMessage = (message: any) => {
  // Empty function - we'll remove it later
}

// Watch messages for changes
watch(messages, (newMessages: any[], oldMessages: any[]) => {
  if (newMessages?.length > (oldMessages?.length || 0)) {
    const newMessage = newMessages[newMessages.length - 1]
    if (newMessage.role === 'assistant') {
      handleNewMessage(newMessage)
    }
  }
}, { deep: true })

// Add deleteChat handler
const handleDeleteChat = async (chatId: string) => {
  try {
    // If we're deleting the current chat, clear it first
    if (chatId === currentChatId.value) {
      messages.value = []
      currentChatId.value = null
    }

    // Delete from Supabase
    await deleteChat(chatId)

    // Refresh chat history
    chatHistory.value = await loadChatHistories()
  } catch (err) {
    console.error('Failed to delete chat:', err)
    error.value = 'Failed to delete chat'
  }
}

// Save preferences when they change
watch([preferences], async () => {
  await store.set('show-only-pinned-models', preferences.value.showOnlyPinnedModels)
  await store.set('show-progress-bar', preferences.value.showProgressBar)
  await store.set('theme', preferences.value.theme)
})

// Save pinned models when they change
watch([pinnedModels], async () => {
  const modelIds = pinnedModels.value.map(m => typeof m === 'string' ? m : m.id)
  await store.set('pinned-models', modelIds)
})

// Save API keys when they change
watch([apiKeys], async () => {
  await store.set('api-key', apiKeys.value['openrouter'] || '')
})

// Save enabled models when they change
watch([enabledModels], async () => {
  const modelIds = enabledModels.value.map(m => typeof m === 'string' ? m : m.id)
  await store.set('enabled-model-ids', modelIds)
})

// Save recent models when they change
watch([recentModels], async () => {
  const modelIds = recentModels.value.map(m => typeof m === 'string' ? m : m.id)
  await store.set('recent-model-ids', modelIds)
})

// Update the message sending logic
const handleSendMessage = async (content: string) => {
  if (!content.trim()) return

  try {
    isSending.value = true
    console.log('Sending message:', content)

    // Create the message with included files
    const messageWithFiles = {
      content,
      includedFiles: messageIncludedFiles.value
    }

    // Use sendAIMessage from useAIChat
    const response = await sendMessage(messageWithFiles)
    console.log('Got response:', response)

    // Clear input and included files
    newMessage.value = ''
    messageIncludedFiles.value = []
    mentions.value = []

    // Scroll to bottom
    await nextTick()
    scrollToBottom()
  } catch (err) {
    console.error('Failed to send message:', err)
    error.value = 'Failed to send message'
  } finally {
    isSending.value = false
  }
}

// Add logging for available models
watch(() => openRouter.availableModels.value, (newModels) => {
  console.log('App.vue - Available models changed:', {
    count: newModels.length,
    first: newModels[0],
    last: newModels[newModels.length - 1]
  })
}, { immediate: true, deep: true })
</script>

<style>
:root {
  font-size: 14px;
}

html {
  font-size: 14px;
}

/* Select element dark mode styles */
select {
  @apply text-gray-900 dark:text-white;
}

select option {
  @apply text-gray-900 dark:text-white;
  background-color: inherit;
}

/* Optional - Subtle overflow scrolling behavior */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

/* Enhanced gradient animation for drag handle */
.drag-handle {
  -webkit-app-region: drag;
  -webkit-user-select: none;
  background-size: 200% 100%;
  animation: gradient 15s ease infinite;
}

@keyframes gradient {
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

/* Make sure interactive elements within draggable regions are still clickable */
.drag-handle button,
.drag-handle a,
.drag-handle input {
  -webkit-app-region: no-drag;
}

/* Message transition animations */
.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.message-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Add smooth scrolling to container */
.scroll-smooth {
  scroll-behavior: smooth;
}

/* Base prose styles */
.prose {
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Light mode */
.prose {
  color: theme('colors.gray.900');
}

.prose code {
  background-color: theme('colors.gray.100');
  color: theme('colors.gray.900');
}

.prose pre {
  background-color: theme('colors.gray.100');
  color: theme('colors.gray.900');
}

/* Dark mode */
.dark .prose {
  color: theme('colors.white');
}

.dark .prose code {
  color: theme('colors.white');
  background-color: theme('colors.gray.800');
}

.dark .prose pre {
  background-color: theme('colors.gray.800');
  color: theme('colors.white');
}

/* Syntax highlighting - Light */
.prose .language-javascript .keyword {
  @apply text-purple-700;
}

.prose .language-javascript .string {
  @apply text-green-700;
}

.prose .language-javascript .number {
  @apply text-yellow-700;
}

.prose .language-javascript .function {
  @apply text-blue-700;
}

/* Syntax highlighting - Dark */
.dark .prose .language-javascript .keyword {
  @apply text-purple-300;
}

.dark .prose .language-javascript .string {
  @apply text-green-300;
}

.dark .prose .language-javascript .number {
  @apply text-yellow-300;
}

.dark .prose .language-javascript .function {
  @apply text-blue-300;
}

/* Smooth transitions for focus effects */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Optional: Add a subtle blur when unfocused */
.blur-subtle {
  backdrop-filter: blur(0.5px);
}

/* Dark mode specific markdown styles */
.dark .prose {
  color: theme('colors.gray.300');
}

.dark .prose strong {
  color: theme('colors.gray.200');
}

.dark .prose a {
  color: theme('colors.blue.400');
}

.dark .prose code {
  color: theme('colors.gray.200');
  background-color: theme('colors.gray.800');
  border-color: theme('colors.gray.700');
}

.dark .prose pre {
  background-color: theme('colors.gray.800');
  border: 1px solid theme('colors.gray.700');
}

.dark .prose pre code {
  background-color: transparent;
  color: theme('colors.gray.200');
}

.dark .prose blockquote {
  color: theme('colors.gray.400');
  border-color: theme('colors.gray.700');
  background-color: theme('colors.gray.800/50');
}

.dark .prose h1,
.dark .prose h2,
.dark .prose h3,
.dark .prose h4 {
  color: theme('colors.gray.200');
}

.dark .prose hr {
  border-color: theme('colors.gray.700');
}

.dark .prose table {
  border-color: theme('colors.gray.700');
}

.dark .prose thead {
  background-color: theme('colors.gray.800');
  color: theme('colors.gray.200');
}

.dark .prose tbody tr {
  border-bottom-color: theme('colors.gray.700');
}

.dark .prose tbody td {
  background-color: theme('colors.gray.900');
}

/* Dark mode scrollbar */
.dark ::-webkit-scrollbar {
  width: 8px;
}

.dark ::-webkit-scrollbar-track {
  background-color: theme('colors.gray.900');
}

.dark ::-webkit-scrollbar-thumb {
  background-color: theme('colors.gray.700');
  border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background-color: theme('colors.gray.600');
}

/* Message transitions */
.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from,
.message-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Smooth scrolling for the chat container */
.overflow-y-auto {
  scroll-behavior: smooth;
}

/* Optional: Add a subtle fade at the top/bottom of the chat container */
.chat-container {
  mask-image: linear-gradient(to bottom,
      transparent 0%,
      black 5%,
      black 95%,
      transparent 100%);
}
</style>
