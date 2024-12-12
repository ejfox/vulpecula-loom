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
            <ApiKeyWarning :has-valid-key="hasValidKey" :saving-key="savingKey" @save-api-key="saveApiKey" />

            <!-- Supabase Warning -->
            <div v-if="!hasValidSupabaseConfig"
              class="flex-shrink-0 p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100">
              <div class="flex items-center flex-1">
                <span>Please configure Supabase to enable chat history</span>
              </div>
            </div>

            <!-- Chat Messages -->
            <section ref="chatContainer"
              class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-950">
              <div class="p-4 space-y-3">
                <TransitionGroup name="message-list" tag="div" class="space-y-3" :duration="300"
                  move-class="message-move">
                  <ChatMessage v-for="(message, index) in messages"
                    :key="message.id || `msg-${currentChatId}-${index}-${message.timestamp}`" :message="message"
                    :model-name="modelName" :index="index" :current-chat-id="currentChatId"
                    :format-model-cost="formatModelCost" @copy="copyMessage" @delete="deleteMessage"
                    @fork="handleForkChat" />
                </TransitionGroup>
              </div>
            </section>

            <!-- Message Input -->
            <ChatInput :is-loading="isLoading" :has-valid-key="hasValidKey" :show-mention-popup="showMentionPopup"
              :is-searching-files="isSearchingFiles" :has-obsidian-vault="hasObsidianVault"
              :obsidian-search-results="obsidianSearchResults"
              @submit="({ message, includedFiles }) => sendMessage(message, includedFiles)"
              @mention-popup="(show) => showMentionPopup = show" @obsidian-link="handleObsidianLink"
              @input="(query) => searchQuery = query" />
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
      v-model:showOnlyPinnedModels="preferences.showOnlyPinnedModels" :available-models="availableModels"
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

// Core chat functionality
const {
  apiKey,
  setApiKey,
  hasValidKey,
  messages,
  isLoading,
  error,
  currentModel,
  modelName,
  sendMessage,
  setModel,
  currentChatId,
  loadChat,
  clearChat,
  chatStats,
  exportChat,
  validateApiKey,
  formatModelCost,
  availableModels
} = useOpenRouter()

// Chat history
const {
  loadChatHistories,
  hasValidSupabaseConfig,
  forkChat: forkChatInDb,
  supabase,
  deleteChat,
  saveChatHistory
} = useSupabase()

// Types
interface ChatMessage {
  id?: string  // Optional since some messages might not have IDs yet
  role: 'user' | 'assistant'
  content: string
  timestamp: string  // ISO string from the database
  model?: string
  tokens?: {
    total: number
    prompt: number
    completion: number
  }
  cost?: number
}

interface ChatMetadata {
  lastModel: string
  lastUpdated: string
  messageCount: number
}

interface ChatHistoryItem {
  id: string
  title: string | null
  messages: ChatMessage[]
  model: string
  metadata: ChatMetadata
  created_at: string
  updated_at: string
  user_id?: string
  thread?: string | null
}

interface Mention {
  startIndex: number
  endIndex: number
  file: {
    title: string
    path: string
  }
}

interface IncludedFile {
  title: string
  path: string
  content: string
}

// Update ref type
const chatHistory = ref<ChatHistoryItem[]>([])

// UI State
const isSending = ref(false)
const isSettingsOpen = ref(false)
const isChatSidebarOpen = ref(true)
const isContextPanelOpen = ref(false)
const theme = ref('dark')
const showProgressBar = ref(true)

// Input handling
const newMessage = ref('')
const tempApiKey = ref('')
const savingKey = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

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
const messageIncludedFiles = ref<IncludedFile[]>([])
const mentions = ref<Mention[]>([])

// Load initial data
const { isDark } = useTheme()

// Keyboard shortcut handler
const handleKeyboardShortcuts = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === ',') {
    e.preventDefault()
    isSettingsOpen.value = true
  }
}

// Add to the preferences section at the top
const preferences = ref({
  showOnlyPinnedModels: false
})

onMounted(async () => {
  // Add keyboard shortcut handler
  window.addEventListener('keydown', handleKeyboardShortcuts)

  try {
    // Load all settings at once
    const [savedTheme, savedProgressBar, showOnlyPinnedModels] = await Promise.all([
      store.get('theme'),
      store.get('show-progress-bar'),
      store.get('show-only-pinned-models')
    ])

    // Apply settings
    theme.value = savedTheme || 'dark'
    showProgressBar.value = Boolean(savedProgressBar ?? true)
    preferences.value.showOnlyPinnedModels = Boolean(showOnlyPinnedModels)

    // Load theme
    if (savedTheme === 'dark') {
      isDark.value = true
    } else if (savedTheme === 'light') {
      isDark.value = false
    }

    // Load chat history
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

// Modify scroll behavior
const scrollToBottom = async (smooth = true) => {
  await nextTick()
  if (!chatContainer.value) return

  const container = chatContainer.value
  container.scrollTo({
    top: container.scrollHeight,
    behavior: 'instant' // Always use instant to avoid jarring scroll
  })
}

// Watch for chat history updates
watch(() => currentChatId.value, async (newId) => {
  if (newId) {
    try {
      await loadChat(newId)
      scrollToBottom() // Scroll after loading
    } catch (err) {
      console.error('Failed to load chat:', err)
      error.value = 'Failed to load chat'
    }
  }
}, { immediate: true })

// Watch for new messages and scroll
watch(messages, () => {
  scrollToBottom()
}, { deep: true })

const createNewChat = async () => {
  try {
    // Clear current messages
    messages.value = []
    currentChatId.value = null

    // Create new chat in Supabase
    const newChat = await saveChatHistory({
      title: null,
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

const openMessageActions = (message: ChatMessage, index: number) => {
  const messageKey = message.id || `msg-${currentChatId}-${index}-${message.timestamp}`
  activeMessageActions.value = activeMessageActions.value === messageKey ? null : messageKey
}

const copyMessage = async (message: ChatMessage) => {
  await navigator.clipboard.writeText(message.content)
  activeMessageActions.value = null
}

const deleteMessage = (message: ChatMessage) => {
  messages.value = messages.value.filter(m => m.id !== message.id)
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

// Add proper types for handleObsidianLink parameters
interface ObsidianLinkParams {
  file: {
    title: string
    path: string
  }
  mentionStartIndex: number
  messageIncludedFiles: IncludedFile[]
  mentions: Mention[]
  newMessage: string
}

const handleObsidianLink = async ({ file, mentionStartIndex, messageIncludedFiles, mentions, newMessage }: ObsidianLinkParams) => {
  try {
    // Get the vault path
    const vaultPath = await store.get('obsidian-vault-path')

    // Get the file content
    const content = await window.electron.ipcRenderer.invoke('get-obsidian-file-content', {
      vaultPath,
      filePath: file.path
    })

    // Calculate the end index based on the current mention
    const endIndex = mentionStartIndex + searchQuery.value.length + 1
    const linkText = `[[${file.title}]]`
    const oldLength = endIndex - mentionStartIndex
    const newLength = linkText.length
    const lengthDiff = newLength - oldLength

    // Insert the link
    newMessage =
      newMessage.slice(0, mentionStartIndex) +
      linkText +
      newMessage.slice(endIndex)

    // Update positions of existing mentions
    mentions = mentions.map((mention: Mention) => {
      if (mention.startIndex > mentionStartIndex) {
        return {
          ...mention,
          startIndex: mention.startIndex + lengthDiff,
          endIndex: mention.endIndex + lengthDiff
        }
      }
      return mention
    }).sort((a: Mention, b: Mention) => a.startIndex - b.startIndex)

    // Track this mention
    mentions.push({
      startIndex: mentionStartIndex,
      endIndex: mentionStartIndex + linkText.length,
      file
    })

    // Store the file content
    if (!messageIncludedFiles.some((f: IncludedFile) => f.path === file.path)) {
      messageIncludedFiles.push({
        title: file.title,
        path: file.path,
        content: content || ''
      })
    }

    showMentionPopup.value = false
    mentionStartIndex = -1
    searchQuery.value = ''
  } catch (err) {
    console.error('Failed to get file content:', err)
    error.value = 'Failed to include file content'
  }
}

// Add forkChat handler
const handleForkChat = async (message: ChatMessage) => {
  if (!currentChatId.value) return

  // Get all messages up to and including the forked message
  const messageIndex = messages.value.findIndex(m => m.id === message.id)
  if (messageIndex === -1) return

  // Clone messages up to fork point to ensure we have complete copies
  const messagesUpToFork = messages.value.slice(0, messageIndex + 1).map(msg => ({
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
      const loadedChat = await loadChat(forkedChat.id)
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
const handleNewMessage = (message: ChatMessage) => {
  // Empty function - we'll remove it later
}

// Watch messages for changes
watch(messages, (newMessages, oldMessages) => {
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

/* Message list transitions */
.message-list-move {
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.message-list-enter-active {
  transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: relative;
}

.message-list-leave-active {
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: absolute;
  width: 100%;
}

.message-list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}

.message-list-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
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
