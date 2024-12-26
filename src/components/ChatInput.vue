<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import type { ChatInputProps, Mention, IncludedFile, ObsidianFile } from '../types'
import ObsidianMentionPopup from './ObsidianMentionPopup.vue'

const props = defineProps<{
  modelValue: string
  isLoading: boolean
  hasValidKey: boolean
  showMentionPopup: boolean
  isSearchingFiles: boolean
  hasObsidianVault: boolean
  obsidianSearchResults: ObsidianFile[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'send', message: string): void
  (e: 'mention-popup', show: boolean): void
  (e: 'obsidian-link', params: any): void
  (e: 'input', query: string): void
}>()

const newMessage = ref('')
const mentionStartIndex = ref(-1)
const messageIncludedFiles = ref<IncludedFile[]>([])
const mentions = ref<Mention[]>([])
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const previewRef = ref<HTMLDivElement | null>(null)

// Format the message with styled mentions
const formattedMessage = computed(() => {
  let result = newMessage.value
  const parts: { text: string; isMention?: boolean; title?: string }[] = []
  let lastIndex = 0

  // Sort mentions by startIndex to process them in order
  const sortedMentions = [...mentions.value].sort((a, b) => a.startIndex - b.startIndex)

  sortedMentions.forEach(mention => {
    // Add text before mention
    if (mention.startIndex > lastIndex) {
      parts.push({ text: result.slice(lastIndex, mention.startIndex) })
    }
    // Add mention
    parts.push({
      text: `@${mention.file.title}`,
      isMention: true,
      title: mention.file.title
    })
    lastIndex = mention.endIndex
  })

  // Add remaining text
  if (lastIndex < result.length) {
    parts.push({ text: result.slice(lastIndex) })
  }

  return parts
})

const adjustTextareaHeight = async () => {
  await nextTick()
  if (!textareaRef.value) return

  // Reset height to auto to get the correct scrollHeight
  textareaRef.value.style.height = 'auto'
  // Set the height to match content
  textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`
}

// Watch for changes in the message content
watch(newMessage, () => {
  adjustTextareaHeight()
})

// Adjust height on mount
onMounted(() => {
  adjustTextareaHeight()
})

const handleSubmit = () => {
  if (!newMessage.value.trim() || props.isLoading) return
  emit('send', newMessage.value)
  newMessage.value = ''
  messageIncludedFiles.value = []
  mentions.value = []
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === '@') {
    emit('mention-popup', true)
    mentionStartIndex.value = (e.target as HTMLTextAreaElement).selectionStart || 0
  } else if (e.key === 'Escape') {
    emit('mention-popup', false)
  } else if (e.key === 'Enter') {
    if (props.showMentionPopup) {
      e.preventDefault()
      if (props.obsidianSearchResults.length > 0) {
        insertObsidianLink(props.obsidianSearchResults[0])
      }
    } else if (!e.shiftKey) {
      e.preventDefault()
      handleSubmit()
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
  } else if (mentionStartIndex.value >= 0) {
    emit('mention-popup', false)
    mentionStartIndex.value = -1
    emit('input', '')
  }
}

const insertObsidianLink = (file: { title: string; path: string }) => {
  // Calculate the new text with the file mention
  const beforeMention = newMessage.value.slice(0, mentionStartIndex.value)
  const afterMentionMatch = newMessage.value.slice(mentionStartIndex.value).match(/^@[^\s]*\s*(.*)$/)
  const afterMention = afterMentionMatch ? afterMentionMatch[1] : newMessage.value.slice(mentionStartIndex.value)
  const mentionText = `@${file.title} `

  // Update the message text immediately
  newMessage.value = `${beforeMention}${mentionText}${afterMention}`

  // Add to included files if not already present
  if (!messageIncludedFiles.value.some(f => f.path === file.path)) {
    messageIncludedFiles.value.push({
      title: file.title,
      path: file.path,
      content: '' // Content will be fetched by parent component
    })
  }

  // Add to mentions array
  mentions.value.push({
    startIndex: mentionStartIndex.value,
    endIndex: mentionStartIndex.value + mentionText.length,
    file: {
      title: file.title,
      path: file.path
    }
  })

  // Emit the event for parent component handling
  emit('obsidian-link', {
    file,
    mentionStartIndex: mentionStartIndex.value,
    messageIncludedFiles,
    mentions,
    newMessage: newMessage.value
  })

  mentionStartIndex.value = -1
  emit('mention-popup', false)
}

const removeFile = (fileToRemove: IncludedFile) => {
  // Remove from included files
  messageIncludedFiles.value = messageIncludedFiles.value.filter(f => f.path !== fileToRemove.path)

  // Remove from mentions and update text
  const mentionToRemove = mentions.value.find(m => m.file.path === fileToRemove.path)
  if (mentionToRemove) {
    // Remove the mention from text
    const beforeMention = newMessage.value.slice(0, mentionToRemove.startIndex)
    const afterMention = newMessage.value.slice(mentionToRemove.endIndex)
    newMessage.value = beforeMention + afterMention

    // Remove from mentions array
    mentions.value = mentions.value.filter(m => m.file.path !== fileToRemove.path)

    // Adjust remaining mention indices
    mentions.value.forEach(mention => {
      if (mention.startIndex > mentionToRemove.endIndex) {
        const shift = mentionToRemove.endIndex - mentionToRemove.startIndex
        mention.startIndex -= shift
        mention.endIndex -= shift
      }
    })
  }
}
</script>

<template>
  <footer class="flex-shrink-0 p-3 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
    <form @submit.prevent="handleSubmit" class="flex items-center gap-2">
      <div class="relative flex-1">
        <!-- Hidden preview div for styling -->
        <div ref="previewRef" aria-hidden="true"
          class="absolute inset-0 pointer-events-none p-2 whitespace-pre-wrap break-words opacity-0">
          <template v-for="(part, index) in formattedMessage" :key="index">
            <span v-if="part.isMention"
              class="inline-flex items-center gap-1 px-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-sm">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {{ part.text }}
            </span>
            <span v-else>{{ part.text }}</span>
          </template>
        </div>

        <!-- Actual textarea -->
        <textarea v-model="newMessage" ref="textareaRef"
          placeholder="Type your message... (Use @ to link Obsidian files, Shift+Enter for new line)"
          :disabled="isLoading || !hasValidKey" @keydown="handleKeydown" @input="handleInput" rows="1" class="w-full p-2 rounded-md border border-gray-200 dark:border-gray-700 
                 bg-white dark:bg-gray-900 
                 text-gray-900 dark:text-gray-50 
                 placeholder-gray-500 dark:placeholder-gray-400
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                 text-sm min-w-0
                 resize-none overflow-y-auto
                 max-h-[50vh] min-h-[38px]" />

        <!-- File mention popup -->
        <ObsidianMentionPopup :show="showMentionPopup" :results="obsidianSearchResults" :is-searching="isSearchingFiles"
          :has-vault="hasObsidianVault" @select="insertObsidianLink" @close="() => emit('mention-popup', false)" />

        <!-- Included files preview -->
        <div v-if="messageIncludedFiles.length > 0"
          class="absolute left-0 right-0 -top-16 p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-t-md">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{{ messageIncludedFiles.length }} file{{ messageIncludedFiles.length > 1 ? 's' : '' }}
                  included</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <div v-for="file in messageIncludedFiles" :key="file.path"
                class="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 text-xs">
                <span class="truncate max-w-[150px]">{{ file.title }}</span>
                <button @click="removeFile(file)"
                  class="hover:text-blue-900 dark:hover:text-blue-100 transition-colors">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button type="submit" :disabled="isLoading || !hasValidKey"
        class="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-600 rounded-md whitespace-nowrap text-sm transition-colors">
        {{ isLoading ? 'Sending...' : 'Send' }}
      </button>
    </form>
  </footer>
</template>

<style scoped>
textarea {
  background: transparent;
}

.mention-highlight {
  @apply inline-flex items-center gap-1 px-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-sm;
  animation: mention-glow 2s ease-in-out infinite;
}

@keyframes mention-glow {

  0%,
  100% {
    box-shadow: 0 0 0 rgba(59, 130, 246, 0);
  }

  50% {
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
  }
}
</style>