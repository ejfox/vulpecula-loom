<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed, onUnmounted } from 'vue'
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
  (e: 'send', message: string, images?: File[]): void
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

// Add state for drag & drop and images
const isDraggingOver = ref(false)
const droppedImages = ref<File[]>([])

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

  const textarea = textareaRef.value

  // Reset height to minimum to get the correct scrollHeight
  textarea.style.height = 'auto'

  // Calculate the new height, capped at 50vh
  const viewportHeight = window.innerHeight
  const maxHeight = viewportHeight * 0.5
  const newHeight = Math.min(textarea.scrollHeight, maxHeight)

  // Set the height with a small buffer for smooth expansion
  textarea.style.height = `${newHeight}px`
}

// Watch for viewport resizing to readjust height
const resizeObserver = new ResizeObserver(() => {
  adjustTextareaHeight()
})

onMounted(() => {
  adjustTextareaHeight()
  // Start observing viewport changes
  if (textareaRef.value) {
    resizeObserver.observe(textareaRef.value)
  }
})

// Cleanup observer
onUnmounted(() => {
  resizeObserver.disconnect()
})

// Watch for changes in the message content
watch(newMessage, () => {
  adjustTextareaHeight()
})

// Add drag & drop handlers
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDraggingOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDraggingOver.value = false
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDraggingOver.value = false

  const files = Array.from(e.dataTransfer?.files || [])
  const images = files.filter(file => file.type.startsWith('image/'))

  if (images.length > 0) {
    droppedImages.value = [...droppedImages.value, ...images]
  }
}

const removeImage = (index: number) => {
  droppedImages.value = droppedImages.value.filter((_, i) => i !== index)
}

// Update submit to include images
const handleSubmit = () => {
  if (!newMessage.value.trim() && droppedImages.value.length === 0 || props.isLoading) return

  // Store message and images before clearing
  const messageToSend = newMessage.value
  const imagesToSend = [...droppedImages.value]

  // Clear input and images
  newMessage.value = ''
  messageIncludedFiles.value = []
  mentions.value = []
  droppedImages.value = []

  // Maintain focus after sending
  nextTick(() => {
    textareaRef.value?.focus()
  })

  // Emit after UI is updated
  emit('send', messageToSend, imagesToSend)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === '@' && !e.isComposing) {
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
      // Handle normal message sending on Enter
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
  if (!(e instanceof InputEvent)) return

  const input = e.target as HTMLInputElement
  const value = input.value
  const cursorPosition = input.selectionStart || 0

  // Only process @ symbol if it was just typed (not pasted)
  if (e.inputType === 'insertText' && value[cursorPosition - 1] === '@') {
    mentionStartIndex.value = cursorPosition - 1
    emit('mention-popup', true)
    const query = value.slice(mentionStartIndex.value + 1, cursorPosition)
    emit('input', query)
  } else if (mentionStartIndex.value >= 0) {
    // Continue handling existing mention
    const query = value.slice(mentionStartIndex.value + 1, cursorPosition)
    if (!query.trim() || query.includes(' ')) {
      emit('mention-popup', false)
      mentionStartIndex.value = -1
      emit('input', '')
    } else {
      emit('input', query)
    }
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

        <!-- Drag & Drop Overlay -->
        <div v-if="isDraggingOver"
          class="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-md flex items-center justify-center">
          <div class="text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Drop images here</span>
          </div>
        </div>

        <!-- Actual textarea with drag & drop handlers -->
        <textarea v-model="newMessage" ref="textareaRef"
          placeholder="Type your message... (Use @ to link Obsidian files, Shift+Enter for new line, or drop images)"
          :disabled="isLoading || !hasValidKey" @keydown="handleKeydown" @input="handleInput" @dragover="handleDragOver"
          @dragleave="handleDragLeave" @drop="handleDrop" rows="1" class="w-full p-2 rounded-md border border-gray-200 dark:border-gray-700 
                 bg-white dark:bg-gray-900 
                 text-gray-900 dark:text-gray-50 
                 placeholder-gray-500 dark:placeholder-gray-400
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                 text-sm min-w-0
                 resize-none overflow-y-auto
                 max-h-[50vh] min-h-[38px]
                 transition-[height] duration-200 ease-in-out" />

        <!-- Image Previews -->
        <div v-if="droppedImages.length > 0"
          class="absolute left-0 right-0 -top-24 p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-t-md">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{{ droppedImages.length }} image{{ droppedImages.length > 1 ? 's' : '' }}</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <div v-for="(image, index) in droppedImages" :key="index"
                class="relative group w-16 h-16 rounded-md overflow-hidden border border-blue-200 dark:border-blue-800">
                <img :src="URL.createObjectURL(image)" class="w-full h-full object-cover" />
                <button @click="removeImage(index)"
                  class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

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