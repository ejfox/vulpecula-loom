<template>
  <div class="h-screen flex flex-col bg-gray-900 overflow-hidden">
    <TitleBar :model-name="modelName" :is-loading="isLoading" :is-sending="isSending"
      v-model:isContextPanelOpen="isContextPanelOpen" v-model:isChatSidebarOpen="isChatSidebarOpen"
      :is-mobile="isMobile">
      <template #actions>
        <!-- Context Panel Toggle Button -->
        <button v-if="!isMobile" @click="isContextPanelOpen = !isContextPanelOpen"
          class="p-1 text-white/40 hover:text-white/60 transition-colors"
          :class="{ 'text-white/80': isContextPanelOpen }">
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
          <!-- Chat Sidebar Overlay -->
          <Transition enter-active-class="transition-transform duration-300 ease-in-out"
            leave-active-class="transition-transform duration-300 ease-in-out" enter-from-class="-translate-x-full"
            leave-to-class="-translate-x-full">
            <div v-if="isChatSidebarOpen" :class="[
              'bg-gray-900 rounded-lg overflow-hidden flex flex-col',
              isMobile ? 'fixed inset-y-0 left-0 z-40 w-80 mt-10' : 'w-[38.2%] max-w-sm flex-shrink-0'
            ]">
              <ChatSidebar :chat-history="chatHistory" :current-chat-id="currentChatId" :current-model="currentModel"
                @clear-chat="clearChat" @load-chat="loadChat" @set-model="setModel" />
            </div>
          </Transition>

          <!-- Backdrop for mobile sidebar -->
          <Transition enter-active-class="transition-opacity duration-300"
            leave-active-class="transition-opacity duration-300" enter-from-class="opacity-0"
            leave-to-class="opacity-0">
            <div v-if="isMobile && isChatSidebarOpen" class="fixed inset-0 bg-black/50 z-30 mt-10"
              @click="isChatSidebarOpen = false" />
          </Transition>

          <!-- Main Chat Area -->
          <main class="flex-1 flex flex-col min-h-0 bg-gray-900 rounded-lg overflow-hidden">
            <ChatMetadata :stats="chatStats" @export="exportChat" />

            <!-- API Key Warning -->
            <div v-if="!hasValidKey"
              class="flex-shrink-0 p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100">
              <div class="flex items-center flex-1">
                <span>Please set your OpenRouter API key:</span>
                <form @submit.prevent="saveApiKey" class="flex items-center ml-2 flex-1">
                  <input v-model="tempApiKey" type="password"
                    class="p-1 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 max-w-md"
                    placeholder="sk-or-..." />
                  <button type="submit" :disabled="!tempApiKey.trim()"
                    class="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50">
                    {{ savingKey ? 'Saving...' : 'Save' }}
                  </button>
                </form>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="flex-shrink-0 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100">
              {{ error }}
            </div>

            <!-- Chat Messages -->
            <section ref="chatContainer" class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div class="p-4 space-y-3">
                <TransitionGroup name="message" tag="div" class="space-y-3">
                  <div v-for="message in messages" :key="`${message.id}-${message.timestamp.getTime()}`" :class="[
                    'max-w-[85%] transition-all duration-300 group',
                    message.role === 'user' ? 'ml-auto' : ''
                  ]">
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
                        }).format(message.timestamp) }}</span>

                        <!-- Message Actions Menu -->
                        <div class="relative message-menu">
                          <button @click.stop="toggleMessageMenu(message.id, $event)" class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md 
                                   hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500
                                   hover:scale-110 active:scale-95 transform duration-150">
                            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="8" cy="2" r="1.5" />
                              <circle cx="8" cy="8" r="1.5" />
                              <circle cx="8" cy="14" r="1.5" />
                            </svg>
                          </button>

                          <!-- Success Indicator -->
                          <Transition enter-active-class="transition duration-200 ease-out"
                            enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100"
                            leave-active-class="transition duration-150 ease-in"
                            leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
                            <div v-if="recentlyCopied === message.id"
                              class="absolute -right-6 top-1 text-green-500 dark:text-green-400">
                              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clip-rule="evenodd" />
                              </svg>
                            </div>
                          </Transition>

                          <!-- Dropdown Menu -->
                          <Transition enter-active-class="transition duration-100 ease-out"
                            enter-from-class="transform scale-95 opacity-0"
                            enter-to-class="transform scale-100 opacity-100"
                            leave-active-class="transition duration-75 ease-in"
                            leave-from-class="transform scale-100 opacity-100"
                            leave-to-class="transform scale-95 opacity-0">
                            <div v-if="activeMessageMenu === message.id" :class="[
                              'absolute right-0 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50',
                              menuPositions[message.id] === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                            ]">
                              <div class="py-1">
                                <button @click="copyMessage(message.content, message.id)" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                                         hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                  <svg
                                    class="w-4 h-4 mr-3 opacity-60 group-hover:scale-110 transition-transform duration-150"
                                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path
                                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10" />
                                  </svg>
                                  <span class="group-hover:translate-x-0.5 transition-transform duration-150">
                                    Copy Message
                                  </span>
                                </button>

                                <button @click="forkFromMessage(message.id)" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                                         hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                  <svg
                                    class="w-4 h-4 mr-3 opacity-60 group-hover:scale-110 transition-transform duration-150"
                                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                  </svg>
                                  <span class="group-hover:translate-x-0.5 transition-transform duration-150">
                                    Fork from Here
                                  </span>
                                </button>

                                <hr class="my-1 border-gray-200 dark:border-gray-600" />

                                <button @click="pinMessage(message.id)" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                                         hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                  <svg
                                    class="w-4 h-4 mr-3 opacity-60 group-hover:scale-110 transition-transform duration-150"
                                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                  </svg>
                                  <span class="group-hover:translate-x-0.5 transition-transform duration-150">
                                    Pin for Later
                                  </span>
                                </button>

                                <button @click="getMessagePermalink(message.id)" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                                         hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                  <svg
                                    class="w-4 h-4 mr-3 opacity-60 group-hover:scale-110 transition-transform duration-150"
                                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path
                                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  <span class="group-hover:translate-x-0.5 transition-transform duration-150">
                                    Get Permalink
                                  </span>
                                </button>
                              </div>
                            </div>
                          </Transition>
                        </div>
                      </div>
                    </div>

                    <!-- Message Content -->
                    <div class="p-2 sm:p-3 rounded-lg prose dark:prose-invert max-w-none" :class="message.role === 'user' ?
                      'bg-blue-200 dark:bg-blue-800 prose-blue dark:prose-blue' :
                      'bg-gray-200 dark:bg-gray-700'" v-html="renderMarkdown(message.content)">
                    </div>
                  </div>
                </TransitionGroup>
              </div>
            </section>

            <!-- Message Input -->
            <footer class="flex-shrink-0 p-3 bg-gray-800">
              <form @submit.prevent="handleSubmit" class="flex items-center gap-2">
                <div class="relative flex-1">
                  <input v-model="newMessage" type="text"
                    placeholder="Type your message... (Use @ to link Obsidian files)"
                    :disabled="isLoading || !hasValidKey" @keydown="handleKeydown" @input="handleInput" class="w-full p-2 rounded-md border border-gray-700
                           bg-gray-900 text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           text-sm min-w-0" />

                  <ObsidianMentionPopup :show="showMentionPopup" :results="obsidianSearchResults"
                    :is-searching="isSearchingFiles" :has-vault="hasObsidianVault" @select="insertObsidianLink" />
                </div>

                <button type="submit" :disabled="isLoading || !hasValidKey" class="px-4 py-2 bg-blue-500 text-white 
                         hover:bg-blue-600
                         disabled:bg-gray-600 
                         rounded-md whitespace-nowrap text-sm
                         transition-colors">
                  {{ isLoading ? 'Sending...' : 'Send' }}
                </button>
              </form>
            </footer>
          </main>
        </div>

        <StatusBar :model-name="currentModel" :is-connected="true" />
      </div>

      <!-- Context Panel Overlay -->
      <Transition enter-active-class="transition-transform duration-300 ease-in-out"
        leave-active-class="transition-transform duration-300 ease-in-out" enter-from-class="translate-x-full"
        leave-to-class="translate-x-full">
        <div v-if="isContextPanelOpen" :class="[
          'bg-gray-900 overflow-hidden flex flex-col',
          isMobile ? 'fixed inset-y-0 right-0 z-40 w-80 mt-10' : 'w-96 flex-shrink-0'
        ]">
          <ContextAlchemyPanel v-model:isContextPanelOpen="isContextPanelOpen" />
        </div>
      </Transition>

      <!-- Backdrop for mobile context panel -->
      <Transition enter-active-class="transition-opacity duration-300"
        leave-active-class="transition-opacity duration-300" enter-from-class="opacity-0" leave-to-class="opacity-0">
        <div v-if="isMobile && isContextPanelOpen" class="fixed inset-0 bg-black/50 z-30 mt-10"
          @click="isContextPanelOpen = false" />
      </Transition>
    </div>

    <!-- Settings Modal -->
    <SettingsModal v-model="isSettingsOpen" v-model:theme="theme" v-model:showProgressBar="showProgressBar"
      @validate-api-key="validateApiKey" />

    <!-- Code Block Menu -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
        <div v-if="activeCodeMenu" class="fixed code-menu z-50" :style="{
          top: `${activeCodeMenu ? document.getElementById(activeCodeMenu)?.getBoundingClientRect().top + window.scrollY + 40 : 0}px`,
          right: `${activeCodeMenu ? document.getElementById(activeCodeMenu)?.getBoundingClientRect().right - 100 : 0}px`
        }">
          <div class="w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
            <div class="py-1">
              <button @click="saveCodeToFile(document.getElementById(activeCodeMenu)?.textContent || '',
                document.getElementById(activeCodeMenu)?.className.replace('language-', '') || '')" class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                       hover:bg-gray-100 dark:hover:bg-gray-700 group">
                <svg class="w-4 h-4 mr-3 opacity-60 group-hover:scale-110 transition-transform duration-150"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span class="group-hover:translate-x-0.5 transition-transform duration-150">
                  Save to File
                </span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, type Ref } from 'vue'
import { useBreakpoints, useScroll, useWindowFocus, useClipboard } from '@vueuse/core'
import type { Breakpoints } from '@vueuse/core'
import { useAIChat } from './composables/useAIChat'
import { useSupabase } from './composables/useSupabase'
import type { ChatHistory } from './composables/useSupabase'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import SettingsModal from './components/SettingsModal.vue'
import { useShortcuts } from './composables/useShortcuts'
import { useOpenRouter } from './composables/useOpenRouter'
import ChatSidebar from './components/ChatSidebar.vue'
import ChatMetadata from './components/ChatMetadata.vue'
import { useObsidianFiles } from './composables/useObsidianFiles'
import ObsidianMentionPopup from './components/ObsidianMentionPopup.vue'
import StatusBar from './components/StatusBar.vue'
import TitleBar from './components/TitleBar.vue'
import ContextAlchemyPanel from './components/ContextAlchemyPanel.vue'
import * as DropdownMenu from 'radix-vue'
import { MoreVertical, Copy, GitFork, Bookmark, Link2 } from 'lucide-vue-next'
import { useStore } from './lib/store'

// Core chat functionality
const { setApiKey } = useOpenRouter()
const store = useStore()

const {
  messages,
  isLoading,
  error,
  currentModel,
  modelName,
  hasValidKey,
  availableModels,
  enabledModels,
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

// Chat history
const { loadChatHistories, hasValidSupabaseConfig, deleteAllChats } = useSupabase()
const chatHistory = ref<ChatHistory[]>([])

// Load chat history on mount
onMounted(async () => {
  try {
    chatHistory.value = await loadChatHistories()
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

// Chat container and scrolling
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

// Message sending
const isSending = ref(false)

async function handleSubmit() {
  if (!newMessage.value.trim() || isLoading.value) return

  try {
    isSending.value = true
    const message = newMessage.value
    newMessage.value = ''

    await scrollToBottom(false)
    await sendMessage(message)
  } finally {
    isSending.value = false
  }
}

// Basic markdown rendering
marked.setOptions({
  gfm: true,
  breaks: true,
  highlight: function (code: string, lang: string) {
    console.log('Found code block:', { code, lang }) // Debug log
    return `<pre class="relative group">
      <div class="absolute right-2 top-2 opacity-0 group-hover:opacity-100">
        <button class="p-1 rounded bg-gray-700/50 hover:bg-gray-700/75 text-gray-300"
                onclick="navigator.clipboard.writeText(this.parentElement.parentElement.textContent)">
          Copy
        </button>
      </div>
      <code class="language-${lang}">${code}</code>
    </pre>`
  }
})

const renderMarkdown = (content: string): string => {
  console.log('Rendering content:', content) // Debug log
  const html = marked(content)
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['onclick'],
    ADD_TAGS: ['button'],
  })
}

// Settings
const showSettings = ref(false)

// Shortcuts
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

// API key handling
const tempApiKey = ref('')
const savingKey = ref(false)

async function saveApiKey() {
  if (!tempApiKey.value.trim()) return

  try {
    savingKey.value = true
    const success = await setApiKey(tempApiKey.value.trim())

    if (success) {
      tempApiKey.value = ''
      if (typeof apiKey === 'object' && 'value' in apiKey) {
        apiKey.value = tempApiKey.value.trim()
      }
      error.value = 'API key saved successfully!'
      setTimeout(() => {
        error.value = null
      }, 2000)
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

// Obsidian integration
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

function insertObsidianLink(file: any) {
  const before = newMessage.value.slice(0, mentionStartIndex.value)
  const after = newMessage.value.slice(mentionStartIndex.value + searchQuery.value.length + 1)
  newMessage.value = `${before}[[${file.title}]]${after}`
  showMentionPopup.value = false
  mentionStartIndex.value = -1
  searchQuery.value = ''
}

// Panel state
const isChatSidebarOpen = ref(true)
const isContextPanelOpen = ref(false)

// Breakpoint detection
const breakpoints = useBreakpoints({
  mobile: 620,  // Custom breakpoint for sidebar behavior
  sm: 640,
  md: 768,
  lg: 1024,
})
const isMobile = computed(() => breakpoints.smaller('mobile').value)

// Panel toggle handlers
const handleToggleChatSidebar = () => {
  isChatSidebarOpen.value = !isChatSidebarOpen.value
}

const handleToggleContextPanel = () => {
  isContextPanelOpen.value = !isContextPanelOpen.value
}

// IPC listeners
onMounted(() => {
  window?.electronAPI?.onToggleChatSidebar(handleToggleChatSidebar)
  window?.electronAPI?.onToggleContextPanel(handleToggleContextPanel)
  window?.electronAPI?.onOpenSettings(() => {
    isSettingsOpen.value = true
  })
})

onUnmounted(() => {
  window?.electronAPI?.removeToggleChatSidebar(handleToggleChatSidebar)
  window?.electronAPI?.removeToggleContextPanel(handleToggleContextPanel)
  window?.electronAPI?.removeOpenSettings(() => {
    isSettingsOpen.value = true
  })
})

// Message actions
const activeMessageMenu = ref<string | null>(null)
const menuPositions = ref<Record<string, 'top' | 'bottom'>>({})
const recentlyCopied = ref<string | null>(null)

// Success feedback animation
const showSuccessFor = (messageId: string, duration = 2000) => {
  recentlyCopied.value = messageId
  setTimeout(() => {
    if (recentlyCopied.value === messageId) {
      recentlyCopied.value = null
    }
  }, duration)
}

const toggleMessageMenu = (messageId: string, event: MouseEvent) => {
  // If already open, just close it
  if (activeMessageMenu.value === messageId) {
    activeMessageMenu.value = null
    return
  }

  // Get button and viewport positions
  const button = event.currentTarget as HTMLElement
  const buttonRect = button.getBoundingClientRect()
  const spaceBelow = window.innerHeight - buttonRect.bottom

  // If less than 200px below, position menu above
  menuPositions.value[messageId] = spaceBelow < 200 ? 'top' : 'bottom'
  activeMessageMenu.value = messageId
}

const copyMessage = async (content: string, messageId: string) => {
  await navigator.clipboard.writeText(content)
  showSuccessFor(messageId)
  activeMessageMenu.value = null
}

const forkFromMessage = (messageId: string) => {
  // TODO: Implement fork functionality
  console.log('Fork from message:', messageId)
  activeMessageMenu.value = null
}

const pinMessage = (messageId: string) => {
  // TODO: Implement pin functionality
  console.log('Pin message:', messageId)
  activeMessageMenu.value = null
}

const getMessagePermalink = (messageId: string) => {
  // TODO: Implement permalink functionality
  console.log('Get permalink for message:', messageId)
  activeMessageMenu.value = null
}

// Close menu when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.message-menu')) {
      activeMessageMenu.value = null
    }
  })
})

// Settings state
const isSettingsOpen = ref(false)

// Initialize theme and progress bar
const theme = ref('dark')
const showProgressBar = ref(true)

// Load settings on mount
onMounted(async () => {
  try {
    const [savedTheme, savedProgressBar] = await Promise.all([
      store.get('theme'),
      store.get('showProgressBar')
    ])
    theme.value = savedTheme || 'dark'
    showProgressBar.value = Boolean(savedProgressBar ?? true)
  } catch (error) {
    console.error('Error loading settings:', error)
  }
})

// Watch for changes
watch(theme, async (newValue) => {
  try {
    await store.set('theme', newValue)
  } catch (error) {
    console.error('Error saving theme:', error)
  }
})

watch(showProgressBar, async (newValue) => {
  try {
    await store.set('showProgressBar', newValue)
  } catch (error) {
    console.error('Error saving progress bar setting:', error)
  }
})

// Handle API key validation
async function validateApiKey(key: string) {
  try {
    const success = await setApiKey(key)
    if (success) {
      tempApiKey.value = ''
      error.value = 'API key saved successfully!'
      setTimeout(() => {
        error.value = null
      }, 3000)
    } else {
      error.value = 'Invalid API key'
    }
  } catch (err) {
    console.error('Error validating API key:', err)
    error.value = 'Error validating API key'
  }
}

// Code block handling
const { copy: copyToClipboard, copied } = useClipboard()
const activeCodeMenu = ref<string | null>(null)

const extractCodeBlocks = (content: string) => {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  const blocks: Array<{ language: string, code: string, id: string }> = []
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
      id: `code-${Math.random().toString(36).substr(2, 9)}`
    })
  }
  return blocks
}

const saveCodeToFile = async (code: string, language: string) => {
  const blob = new Blob([code], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `code-snippet.${language || 'txt'}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  activeCodeMenu.value = null
}

// Event listeners for code block actions
onMounted(() => {
  document.addEventListener('copy-code', ((e: CustomEvent) => {
    const codeElement = document.getElementById(e.detail)
    if (codeElement) {
      copyToClipboard(codeElement.textContent || '')
      showSuccessFor(e.detail)
    }
  }) as EventListener)

  document.addEventListener('code-menu', ((e: CustomEvent) => {
    activeCodeMenu.value = activeCodeMenu.value === e.detail ? null : e.detail
  }) as EventListener)

  // Close code menu when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.code-menu') && !target.closest('button')) {
      activeCodeMenu.value = null
    }
  })
})

const { formatModelCost } = useOpenRouter()
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
.prose .language-javascript .keyword {
  @apply text-purple-400;
}

.prose .language-javascript .string {
  @apply text-green-400;
}

.prose .language-javascript .number {
  @apply text-yellow-400;
}

.prose .language-javascript .function {
  @apply text-blue-400;
}

.prose .language-typescript .keyword {
  @apply text-purple-400;
}

.prose .language-typescript .string {
  @apply text-green-400;
}

.prose .language-typescript .number {
  @apply text-yellow-400;
}

.prose .language-typescript .function {
  @apply text-blue-400;
}

.prose .language-python .keyword {
  @apply text-purple-400;
}

.prose .language-python .string {
  @apply text-green-400;
}

.prose .language-python .number {
  @apply text-yellow-400;
}

.prose .language-python .function {
  @apply text-blue-400;
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
