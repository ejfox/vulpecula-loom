<template>
  <div
    class="h-screen flex flex-col overflow-hidden w-full min-w-[420px] bg-white dark:bg-gray-900 transition-opacity duration-300"
    :class="{ 'opacity-90': !isWindowFocused }">
    <!-- Window Drag Handle with Gradient -->
    <div :class="[
      'h-10 drag-handle transition-all duration-300',
      'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800',
      'dark:from-black dark:via-gray-900 dark:to-black',
      isWindowFocused ? 'opacity-100' : 'opacity-75'
    ]">
      <span class="text-xs text-white ml-20">{{ modelName }}</span>
      <span class="text-xs text-white/80">狐狸座</span>
    </div>

    <div class="flex flex-1 overflow-hidden p-1.5">
      <ChatSidebar :chat-history="chatHistory" :current-chat-id="currentChatId" :current-model="currentModel"
        :MODEL_CONFIGS="MODEL_CONFIGS" @clear-chat="clearChat" @load-chat="loadChat" @set-model="setModel" />

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col bg-white dark:bg-gray-900 ml-1.5 rounded-lg min-w-0">
        <!-- Add this conversation stats bar -->
        <ChatMetadata :stats="chatStats" @export="exportChat" />

        <!-- API Key Warning -->
        <div v-if="!hasValidKey"
          class="p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 flex items-center justify-between">
          <div class="flex items-center flex-1">
            <span>Please set your OpenRouter API key:</span>
            <form @submit.prevent="saveApiKey" class="flex items-center ml-2 flex-1">
              <input v-model="tempApiKey" type="password"
                class="p-1 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 max-w-md"
                placeholder="sk-or-..." @keydown.enter="saveApiKey" />
              <button type="submit" :disabled="!tempApiKey.trim()"
                class="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50">
                {{ savingKey ? 'Saving...' : 'Save' }}
              </button>
            </form>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100">
          {{ error }}
        </div>

        <!-- Chat History -->
        <section ref="chatContainer" class="flex-1 p-3 sm:p-4 space-y-3 overflow-y-auto scroll-smooth">
          <TransitionGroup name="message" tag="div" class="space-y-3">
            <div v-for="message in messages" :key="`${message.id}-${message.timestamp.getTime()}`" :class="[
              'max-w-[85%] transition-all duration-300',
              message.role === 'user' ? 'ml-auto' : ''
            ]">
              <!-- Enhanced Message Metadata -->
              <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <div class="flex items-center space-x-2">
                  <span>{{ message.role === 'user' ? 'You' : 'AI' }}</span>
                  <span>•</span>
                  <span>{{ message.model || modelName }}</span>
                  <span v-if="message.tokens">
                    <span>•</span>
                    <span>{{ message.tokens.total }} tokens</span>
                    <span v-if="message.cost" class="ml-1 text-blue-600 dark:text-blue-400">
                      (${{ message.cost.toFixed(4) }})
                    </span>
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <span>{{ new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                    hour12: true
                  }).format(message.timestamp) }}</span>
                  <button @click="copyMessage(message.content)"
                    class="opacity-0 group-hover:opacity-100 transition-opacity" title="Copy message">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Message Content -->
              <div class="p-2 sm:p-3 rounded-lg prose dark:prose-invert max-w-none" :class="message.role === 'user' ?
                'bg-blue-200 dark:bg-blue-800 prose-blue dark:prose-blue' :
                'bg-gray-200 dark:bg-gray-700'" v-html="renderMarkdown(message.content)">
              </div>

              <!-- Note Preview -->
              <div v-if="message.preview" class="p-2 sm:p-3 rounded-lg bg-gray-100 dark:bg-gray-800 max-w-none">
                <div class="text-sm text-gray-700 dark:text-gray-300">
                  {{ message.preview }}
                </div>
                <button @click="togglePreview(message)" class="text-blue-500 dark:text-blue-400 hover:underline">
                  {{ message.showFullPreview ? 'Read less' : 'Read more' }}
                </button>
                <div v-if="message.showFullPreview" class="text-sm text-gray-700 dark:text-gray-300 mt-2">
                  {{ message.fullContent }}
                </div>
              </div>
            </div>
          </TransitionGroup>
        </section>

        <!-- Message Input -->
        <footer class="p-2 sm:p-3 bg-gray-100 dark:bg-gray-800 rounded-b-lg text-xs">
          <form @submit.prevent="handleSubmit" class="flex items-center gap-2">
            <div class="relative flex-1">
              <input v-model="newMessage" type="text" placeholder="Type your message... (Use @ to link Obsidian files)"
                :disabled="isLoading || !hasValidKey" @keydown="handleKeydown" @input="handleInput" class="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       text-sm sm:text-base min-w-0
                       disabled:bg-gray-100 dark:disabled:bg-gray-800
                       disabled:text-gray-500 dark:disabled:text-gray-400" />

              <!-- Obsidian Mention Popup -->
              <ObsidianMentionPopup :show="showMentionPopup" :results="obsidianSearchResults"
                :is-searching="isSearchingFiles" :has-vault="hasObsidianVault" @select="insertObsidianLink" />
            </div>

            <button type="submit" :disabled="isLoading || !hasValidKey" class="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white 
                           hover:bg-blue-600 dark:hover:bg-blue-700 
                           disabled:bg-gray-400 dark:disabled:bg-gray-600 
                           rounded-md whitespace-nowrap text-sm sm:text-base
                           transition-colors">
              {{ isLoading ? 'Sending...' : 'Send' }}
            </button>
          </form>
        </footer>
      </main>
    </div>

    <!-- Settings Modal -->
    <SettingsModal v-model:isOpen="showSettings" :apiKey="apiKey || ''" @update:apiKey="updateApiKey"
      @nukeData="nukeAllData" />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { useScroll } from '@vueuse/core'
import { useAIChat } from './composables/useAIChat'
import { useSupabase } from './composables/useSupabase'
import type { ChatHistory } from './composables/useSupabase'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import SettingsModal from './components/SettingsModal.vue'
import { useWindowFocus } from '@vueuse/core'
import { useShortcuts } from './composables/useShortcuts'
import { useOpenRouter } from './composables/useOpenRouter'
import ChatSidebar from './components/ChatSidebar.vue'
import ChatMetadata from './components/ChatMetadata.vue'
import { useObsidianFiles } from './composables/useObsidianFiles'
import ObsidianMentionPopup from './components/ObsidianMentionPopup.vue'

const { setApiKey } = useOpenRouter()

const {
  messages,
  isLoading,
  error,
  currentModel,
  modelName,
  hasValidKey,
  apiKey,
  MODEL_CONFIGS,
  sendMessage,
  setModel,
  currentChatId,
  loadChat,
  clearChat,
  chatStats,
  temperature,
  updateTemperature,
  exportChat
} = useAIChat()

const { loadChatHistories, hasValidSupabaseConfig, deleteAllChats } = useSupabase()
const chatHistory = ref<ChatHistory[]>([])

// Load chat history on mount
onMounted(async () => {
  try {
    chatHistory.value = await loadChatHistories()

    // If there's a current chat, load it
    if (chatHistory.value.length > 0) {
      await loadChat(chatHistory.value[0].id)
    }
  } catch (err) {
    console.error('Failed to load chat history:', err)
  }
})

// Watch for new messages to update chat history
watch(messages, async () => {
  try {
    chatHistory.value = await loadChatHistories()
  } catch (err) {
    console.error('Failed to refresh chat history:', err)
  }
}, { deep: true })

const chatContainer = ref<HTMLElement | null>(null)
const { y: scrollY } = useScroll(chatContainer)
const newMessage = ref('')

// Smooth scroll to bottom
async function scrollToBottom(smooth = true) {
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

async function handleSubmit() {
  if (!newMessage.value.trim() || isLoading.value) return
  const message = newMessage.value
  newMessage.value = ''

  // Instant scroll after user message
  await scrollToBottom(false)
  await sendMessage(message)
}

// Configure marked options
marked.setOptions({
  gfm: true,  // GitHub Flavored Markdown
  breaks: true,  // Convert \n to <br>
  sanitize: false,  // We'll use DOMPurify instead
  highlight: function (code, lang) {
    return `<pre><code class="language-${lang}">${code}</code></pre>`
  }
})

// Safe markdown rendering
function renderMarkdown(content: string): string {
  const rawHtml = marked(content)
  return DOMPurify.sanitize(rawHtml)
}

const showSettings = ref(false)

// Add shortcut handlers
useShortcuts({
  newChat: clearChat,
  clearChat: () => {
    if (confirm('Clear current chat?')) {
      clearChat()
    }
  },
  closeModal: () => {
    showSettings.value = false
  },
  openSettings: () => {
    showSettings.value = true
  },
  exportChat
})

const isWindowFocused = useWindowFocus()

// Add handler for apiKey updates
function updateApiKey(newKey: string) {
  if (typeof apiKey === 'object' && 'value' in apiKey) {
    apiKey.value = newKey
  }
}

function copyMessage(content: string) {
  navigator.clipboard.writeText(content)
    .then(() => {
      // Could add a toast notification here
      console.log('Message copied to clipboard')
    })
    .catch(err => {
      console.error('Failed to copy message:', err)
    })
}

async function nukeAllData() {
  try {
    // Clear all messages
    messages.value = []
    currentChatId.value = null

    // Clear chat history
    chatHistory.value = []

    // Reset stats
    if (chatStats && typeof chatStats.value === 'object') {
      chatStats.value = {
        promptTokens: 0,
        completionTokens: 0,
        cost: 0,
        totalMessages: 0
      }
    }

    // Clear localStorage
    localStorage.clear()

    // Clear Supabase data
    if (hasValidSupabaseConfig) {
      try {
        await deleteAllChats()

        // Refresh chat history after deletion
        chatHistory.value = await loadChatHistories()

        // Show success message
        if (error && typeof error.value === 'string') {
          error.value = 'All data has been deleted'
          setTimeout(() => {
            if (error) error.value = null
          }, 3000)
        }
      } catch (supabaseError) {
        console.error('Supabase deletion error:', supabaseError)
        throw new Error('Failed to delete Supabase data')
      }
    }

  } catch (err) {
    console.error('Failed to nuke data:', err)
    if (error && typeof error.value === 'string') {
      error.value = 'Failed to delete all data'
    }
  }
}

const tempApiKey = ref('')
const savingKey = ref(false)

async function saveApiKey() {
  if (!tempApiKey.value.trim()) return

  try {
    savingKey.value = true

    // Use setApiKey from useOpenRouter
    const success = await setApiKey(tempApiKey.value.trim())

    if (success) {
      tempApiKey.value = ''
      // Force a refresh of hasValidKey by updating apiKey
      if (typeof apiKey === 'object' && 'value' in apiKey) {
        apiKey.value = tempApiKey.value.trim()
      }
      error.value = 'API key saved successfully!'
      setTimeout(() => {
        error.value = null
      }, 2000)
      console.log('API key saved and validated successfully')
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

const {
  searchQuery,
  searchResults: obsidianSearchResults,
  isSearching: isSearchingFiles,
  hasVault: hasObsidianVault,
} = useObsidianFiles()

const showMentionPopup = ref(false)
const mentionStartIndex = ref(-1)

function handleKeydown(e: KeyboardEvent) {
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

function handleInput(e: Event) {
  const input = e.target as HTMLInputElement
  const value = input.value

  if (showMentionPopup.value && mentionStartIndex.value >= 0) {
    const query = value.slice(mentionStartIndex.value + 1)
    searchQuery.value = query

    if (!query.includes('@')) {
      showMentionPopup.value = true
    }
  }
}

function insertObsidianLink(file: ObsidianFile) {
  const before = newMessage.value.slice(0, mentionStartIndex.value)
  const after = newMessage.value.slice(mentionStartIndex.value + searchQuery.value.length + 1)
  newMessage.value = `${before}[[${file.title}]]${after}`
  showMentionPopup.value = false
  mentionStartIndex.value = -1
  searchQuery.value = ''
}

function togglePreview(message: any) {
  message.showFullPreview = !message.showFullPreview
}
</script>

<style>
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
  @apply p-3 rounded-lg bg-gray-100 dark:bg-gray-600 overflow-x-auto;
  margin: 0.5em 0;
}

.prose pre code {
  @apply p-0 bg-transparent;
  color: inherit;
}

.prose p {
  margin: 0.5em 0;
}

.prose ul,
.prose ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.prose li {
  margin: 0.25em 0;
}

.prose blockquote {
  @apply border-l-4 border-gray-300 dark:border-gray-500 pl-4 italic;
  margin: 0.5em 0;
}

.prose a {
  @apply text-blue-600 dark:text-blue-400 hover:underline;
}

.prose table {
  @apply w-full border-collapse;
  margin: 0.5em 0;
}

.prose th,
.prose td {
  @apply border border-gray-300 dark:border-gray-600 p-2;
}

.prose th {
  @apply bg-gray-100 dark:bg-gray-600;
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
</style>
