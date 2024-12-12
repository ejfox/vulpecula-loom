<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import ObsidianMentionPopup from './ObsidianMentionPopup.vue'

interface Props {
  isLoading: boolean
  hasValidKey: boolean
  showMentionPopup: boolean
  isSearchingFiles: boolean
  hasObsidianVault: boolean
  obsidianSearchResults: Array<{ title: string; path: string }>
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

const props = defineProps<Props>()
const emit = defineEmits(['submit', 'mention-popup', 'obsidian-link', 'input'])

const newMessage = ref('')
const mentionStartIndex = ref(-1)
const messageIncludedFiles = ref<IncludedFile[]>([])
const mentions = ref<Mention[]>([])

const handleSubmit = () => {
  if (!newMessage.value.trim() || props.isLoading) return
  emit('submit', {
    message: newMessage.value,
    includedFiles: messageIncludedFiles.value
  })
  newMessage.value = ''
  messageIncludedFiles.value = []
  mentions.value = []
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === '@') {
    emit('mention-popup', true)
    mentionStartIndex.value = (e.target as HTMLInputElement).selectionStart || 0
  } else if (e.key === 'Escape') {
    emit('mention-popup', false)
  } else if (e.key === 'Enter' && props.showMentionPopup) {
    e.preventDefault()
    if (props.obsidianSearchResults.length > 0) {
      insertObsidianLink(props.obsidianSearchResults[0])
    }
  }
}

const findLastUnusedAtSymbol = (text: string, cursorPosition: number) => {
  const textBeforeCursor = text.slice(0, cursorPosition)
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')

  if (lastAtIndex === -1) return -1

  // Check if this @ is part of an existing mention
  return mentions.value.some((mention: Mention) =>
    lastAtIndex >= mention.startIndex && lastAtIndex <= mention.endIndex
  ) ? -1 : lastAtIndex
}

const handleInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const value = input.value
  const cursorPosition = input.selectionStart || 0

  // Find the last @ before cursor that isn't part of an existing mention
  const lastAtIndex = findLastUnusedAtSymbol(value, cursorPosition)

  if (lastAtIndex >= 0) {
    mentionStartIndex.value = lastAtIndex
    emit('mention-popup', true)
    const query = value.slice(lastAtIndex + 1, cursorPosition)
    emit('input', query)
  } else {
    emit('mention-popup', false)
    mentionStartIndex.value = -1
    emit('input', '')
  }
}

const insertObsidianLink = (file: { title: string; path: string }) => {
  emit('obsidian-link', {
    file,
    mentionStartIndex: mentionStartIndex.value,
    messageIncludedFiles,
    mentions,
    newMessage: newMessage.value
  })
}
</script>

<template>
  <footer class="flex-shrink-0 p-3 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
    <form @submit.prevent="handleSubmit" class="flex items-center gap-2">
      <div class="relative flex-1">
        <input v-model="newMessage" type="text" placeholder="Type your message... (Use @ to link Obsidian files)"
          :disabled="isLoading || !hasValidKey" @keydown="handleKeydown" @input="handleInput" class="w-full p-2 rounded-md border border-gray-200 dark:border-gray-700 
                   bg-white dark:bg-gray-900 
                   text-gray-900 dark:text-gray-50 
                   placeholder-gray-500 dark:placeholder-gray-400
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                   text-sm min-w-0" />

        <ObsidianMentionPopup :show="showMentionPopup" :results="obsidianSearchResults" :is-searching="isSearchingFiles"
          :has-vault="hasObsidianVault" @select="insertObsidianLink" />
      </div>

      <button type="submit" :disabled="isLoading || !hasValidKey"
        class="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-600 rounded-md whitespace-nowrap text-sm transition-colors">
        {{ isLoading ? 'Sending...' : 'Send' }}
      </button>
    </form>
  </footer>
</template>