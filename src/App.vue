<template>
  <div class="h-screen flex flex-col bg-gray-900 overflow-hidden">
    <TitleBar 
      :model-name="modelName" 
      :is-loading="isLoading" 
      :is-sending="isSending"
      v-model:isContextPanelOpen="isContextPanelOpen" 
      v-model:isChatSidebarOpen="isChatSidebarOpen"
      :is-mobile="isMobile"
    >
      <template #actions>
        <!-- Context Panel Toggle Button -->
        <button 
          v-if="!isMobile" 
          @click="isContextPanelOpen = !isContextPanelOpen"
          class="p-1 text-white/40 hover:text-white/600 transition-colors"
          :class="{ 'text-white/80': isContextPanelOpen }"
        >
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
          <Transition
            enter-active-class="transition-transform duration-300 ease-in-out"
            leave-active-class="transition-transform duration-300 ease-in-out"
            enter-from-class="-translate-x-full"
            leave-to-class="-translate-x-full"
          >
            <div 
              v-if="isChatSidebarOpen"
              :class="[
                'bg-gray-900 rounded-lg overflow-hidden flex flex-col',
                isMobile ? 'fixed inset-y-0 left-0 z-40 w-80 mt-10' : 'w-[38.2%] max-w-sm flex-shrink-0'
              ]"
            >
              <ChatSidebar 
                :chat-history="chatHistory"
                :current-chat-id="currentChatId"
                :current-model="currentModel"
                @clear-chat="clearChat"
                @load-chat="loadChat"
                @set-model="setModel"
              />
            </div>
          </Transition>

          <!-- Main Chat Area -->
          <main class="flex-1 flex flex-col min-h-0 bg-gray-900 rounded-lg overflow-hidden">
            <ChatMetadata :stats="chatStats" @export="exportChat" />

            <!-- API Key Warning -->
            <div v-if="!hasValidKey" class="flex-shrink-0 p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100">
              <div class="flex items-center flex-1">
                <span>Please set your OpenRouter API key:</span>
                <form @submit.prevent="saveApiKey" class="flex items-center ml-2 flex-1">
                  <input 
                    v-model="tempApiKey" 
                    type="password"
                    class="p-1 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 max-w-md"
                    placeholder="sk-or-..."
                  />
                  <button 
                    type="submit"
                    :disabled="!tempApiKey.trim()"
                    class="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {{ savingKey ? 'Saving...' : 'Save' }}
                  </button>
                </form>
              </div>
            </div>

            <!-- Supabase Warning -->
            <div v-if="!hasValidSupabaseConfig" class="flex-shrink-0 p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100">
              <div class="flex items-center flex-1">
                <span>Please configure Supabase to enable chat history</span>
              </div>
            </div>

            <!-- Chat Messages -->
            <section ref="chatContainer" class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div class="p-4 space-y-3">
                <TransitionGroup name="message" tag="div" class="space-y-3">
                  <div 
                    v-for="message in messages" 
                    :key="`${message.id}-${message.timestamp}`"
                    :class="[
                      'max-w-[85%] transition-all duration-300 group',
                      message.role === 'user' ? 'ml-auto' : ''
                    ]"
                  >
                    <!-- Message Metadata -->
                    <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <div class="flex items-center space-x-2">
                        <span>{{ message.role === 'user' ? 'You' : 'AI' }}</span>
                        <span>•</span>
                        <span>{{ message.model || modelName }}</span>
                        <span v-if="message.tokens">
                          <span>•</span>
                          <span>{{ message.tokens.total }} tokens</span>
                          <span v-if="message.cost" class="ml-1 text-blue-600 dark:text-blue-400">
                            ({{ formatModelCost(message.model || modelName, message.cost) }})
                          </span>
                        </span>
                      </div>
                      <div class="flex items-center space-x-2">
                        <span>{{ new Intl.DateTimeFormat('en-US', {
                          hour: 'numeric',
                          minute: 'numeric',
                          second: 'numeric',
                          hour12: true
                        }).format(new Date(message.timestamp)) }}</span>
                      </div>
                    </div>

                    <!-- Message Content -->
                    <div 
                      class="p-2 sm:p-3 rounded-lg prose dark:prose-invert max-w-none" 
                      :class="message.role === 'user' ?
                        'bg-blue-200 dark:bg-blue-800 prose-blue dark:prose-blue' :
                        'bg-gray-200 dark:bg-gray-700'"
                      v-html="renderMarkdown(message.content)"
                    >
                    </div>
                  </div>
                </TransitionGroup>
              </div>
            </section>

            <!-- Message Input -->
            <footer class="flex-shrink-0 p-3 bg-gray-800">
              <form @submit.prevent="handleSubmit" class="flex items-center gap-2">
                <div class="relative flex-1">
                  <input 
                    v-model="newMessage"
                    type="text"
                    placeholder="Type your message... (Use @ to link Obsidian files)"
                    :disabled="isLoading || !hasValidKey"
                    @keydown="handleKeydown"
                    @input="handleInput"
                    class="w-full p-2 rounded-md border border-gray-700 bg-gray-900 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-0"
                  />
                  
                  <ObsidianMentionPopup 
                    :show="showMentionPopup"
                    :results="obsidianSearchResults"
                    :is-searching="isSearchingFiles"
                    :has-vault="hasObsidianVault"
                    @select="insertObsidianLink"
                  />
                </div>

                <button 
                  type="submit"
                  :disabled="isLoading || !hasValidKey"
                  class="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-600 rounded-md whitespace-nowrap text-sm transition-colors"
                >
                  {{ isLoading ? 'Sending...' : 'Send' }}
                </button>
              </form>
            </footer>
          </main>
        </div>
      </div>

      <!-- Context Panel -->
      <Transition
        enter-active-class="transition-transform duration-300 ease-in-out"
        leave-active-class="transition-transform duration-300 ease-in-out"
        enter-from-class="translate-x-full"
        leave-to-class="translate-x-full"
      >
        <div 
          v-if="isContextPanelOpen"
          :class="[
            'bg-gray-900 overflow-hidden flex flex-col',
            isMobile ? 'fixed inset-y-0 right-0 z-40 w-80 mt-10' : 'w-96 flex-shrink-0'
          ]"
        >
          <ContextAlchemyPanel v-model:isContextPanelOpen="isContextPanelOpen" />
        </div>
      </Transition>
    </div>

    <!-- Settings Modal -->
    <SettingsModal 
      v-model="isSettingsOpen"
      v-model:theme="theme"
      v-model:showProgressBar="showProgressBar"
      @validate-api-key="validateApiKey"
    />
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
  exportChat
} = useOpenRouter()

// Chat history
const { loadChatHistories, hasValidSupabaseConfig } = useSupabase()

// Types
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  model?: string
  tokens?: {
    total: number
    prompt: number
    completion: number
  }
  cost?: number
}

interface ChatHistoryItem {
  id: string
  title: string
  messages: ChatMessage[]
  model: string
  created_at: string
  updated_at: string
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

onMounted(async () => {
  try {
    chatHistory.value = await loadChatHistories()
    if (chatHistory.value.length > 0 && loadChat) {
      await loadChat(chatHistory.value[0].id)
    }
    
    // Load settings
    const [savedTheme, savedProgressBar] = await Promise.all([
      store.get('theme'),
      store.get('showProgressBar')
    ])
    theme.value = savedTheme || 'dark'
    showProgressBar.value = Boolean(savedProgressBar ?? true)

    // Load theme
    if (savedTheme === 'dark') {
      isDark.value = true
    } else if (savedTheme === 'light') {
      isDark.value = false
    }
    // If 'system', useTheme will handle it automatically
    
  } catch (err) {
    console.error('Failed to load initial data:', err)
  }
})

// Methods
const handleSubmit = async () => {
  if (!newMessage.value.trim() || isLoading.value) return
  
  try {
    await sendMessage(newMessage.value, messageIncludedFiles.value)
    newMessage.value = ''
    messageIncludedFiles.value = []
    mentions.value = []
  } catch (err) {
    console.error('Failed to send message:', err)
    error.value = 'Failed to send message'
  }
}

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

// Add missing methods
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === '@') {
    showMentionPopup.value = true
    mentionStartIndex.value = (e.target as HTMLInputElement).selectionStart || 0
  } else if (e.key === 'Escape') {
    showMentionPopup.value = false
  } else if (e.key === 'Enter' && showMentionPopup.value) {
    e.preventDefault()
    if (obsidianSearchResults.value.length > 0) {
      insertObsidianLink(obsidianSearchResults.value[0])
    }
  }
}

const handleInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const value = input.value
  const cursorPosition = input.selectionStart || 0

  // Find the last @ before cursor that isn't part of an existing mention
  const lastAtIndex = findLastUnusedAtSymbol(value, cursorPosition)

  if (lastAtIndex >= 0) {
    mentionStartIndex.value = lastAtIndex
    showMentionPopup.value = true
    const query = value.slice(lastAtIndex + 1, cursorPosition)
    searchQuery.value = query
  } else {
    showMentionPopup.value = false
    mentionStartIndex.value = -1
    searchQuery.value = ''
  }
}

const findLastUnusedAtSymbol = (text: string, cursorPosition: number) => {
  const textBeforeCursor = text.slice(0, cursorPosition)
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')

  if (lastAtIndex === -1) return -1

  // Check if this @ is part of an existing mention
  return mentions.value.some(mention =>
    lastAtIndex >= mention.startIndex && lastAtIndex <= mention.endIndex
  ) ? -1 : lastAtIndex
}

const insertObsidianLink = async (file: { title: string; path: string }) => {
  try {
    // Get the vault path
    const vaultPath = await store.get('obsidian-vault-path')

    // Get the file content
    const content = await window.electron.ipcRenderer.invoke('get-obsidian-file-content', {
      vaultPath,
      filePath: file.path
    })

    // Calculate the end index based on the current mention
    const endIndex = mentionStartIndex.value + searchQuery.value.length + 1
    const linkText = `[[${file.title}]]`
    const oldLength = endIndex - mentionStartIndex.value
    const newLength = linkText.length
    const lengthDiff = newLength - oldLength

    // Insert the link
    newMessage.value =
      newMessage.value.slice(0, mentionStartIndex.value) +
      linkText +
      newMessage.value.slice(endIndex)

    // Update positions of existing mentions
    updateMentionPositions(mentionStartIndex.value, lengthDiff)

    // Track this mention
    mentions.value.push({
      startIndex: mentionStartIndex.value,
      endIndex: mentionStartIndex.value + linkText.length,
      file
    })

    // Store the file content
    if (!messageIncludedFiles.value.some(f => f.path === file.path)) {
      messageIncludedFiles.value.push({
        title: file.title,
        path: file.path,
        content: content || ''
      })
    }

    showMentionPopup.value = false
    mentionStartIndex.value = -1
    searchQuery.value = ''
  } catch (err) {
    console.error('Failed to get file content:', err)
    error.value = 'Failed to include file content'
  }
}

const updateMentionPositions = (afterIndex: number, lengthDiff: number) => {
  mentions.value = mentions.value.map(mention => {
    if (mention.startIndex > afterIndex) {
      return {
        ...mention,
        startIndex: mention.startIndex + lengthDiff,
        endIndex: mention.endIndex + lengthDiff
      }
    }
    return mention
  }).sort((a, b) => a.startIndex - b.startIndex)
}

// Add scroll handling
const { y: scrollY } = useScroll(chatContainer)

const scrollToBottom = async (smooth = true) => {
  await nextTick()
  if (!chatContainer.value) return

  chatContainer.value.scrollTo({
    top: chatContainer.value.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

// Watch for new messages and scroll
watch(messages, () => {
  scrollToBottom()
}, { deep: true })

// Watch for chat history updates
watch(() => currentChatId.value, async (newId) => {
  if (newId) {
    try {
      await loadChat(newId)
    } catch (err) {
      console.error('Failed to load chat:', err)
      error.value = 'Failed to load chat'
    }
  }
}, { immediate: true })

// Also add a watcher for messages to update chat history
watch(messages, async () => {
  try {
    chatHistory.value = await loadChatHistories()
  } catch (err) {
    console.error('Failed to refresh chat history:', err)
  }
}, { deep: true })

const renderMarkdown = (content: string): string => {
  const html = marked(content)
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['onclick'],
    ADD_TAGS: ['button'],
  })
}
</script>

<style>
:root {
  font-size: 14px;
}

html {
  font-size: 14px;
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
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
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

/* Markdown Styles */
.prose {
  font-size: 0.875rem;
  line-height: 1.5;
}

.prose code {
  @apply px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-600;
  font-size: 0.875em;
}

.prose pre {
  @apply relative rounded-lg bg-gray-800 p-4 overflow-x-auto;
  margin: 0 !important;
}

.prose pre code {
  @apply bg-transparent p-0 text-sm text-gray-200;
  border: none !important;
}

.prose code {
  @apply rounded bg-gray-800 px-1.5 py-0.5 text-gray-200;
}

/* Language-specific syntax highlighting */
.prose .language-javascript .keyword { @apply text-purple-400; }
.prose .language-javascript .string { @apply text-green-400; }
.prose .language-javascript .number { @apply text-yellow-400; }
.prose .language-javascript .function { @apply text-blue-400; }

.prose .language-typescript .keyword { @apply text-purple-400; }
.prose .language-typescript .string { @apply text-green-400; }
.prose .language-typescript .number { @apply text-yellow-400; }
.prose .language-typescript .function { @apply text-blue-400; }

.prose .language-python .keyword { @apply text-purple-400; }
.prose .language-python .string { @apply text-green-400; }
.prose .language-python .number { @apply text-yellow-400; }
.prose .language-python .function { @apply text-blue-400; }

/* Smooth transitions for focus effects */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Optional: Add a subtle blur when unfocused */
.blur-subtle {
  backdrop-filter: blur(0.5px);
}
</style>
