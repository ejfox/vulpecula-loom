<template>
  <div v-if="show" ref="popupRef"
    class="fixed bottom-20 left-0 right-0 mx-auto w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
    <div class="p-4">
      <div v-if="isSearching" class="flex items-center justify-center py-4">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
      <div v-else-if="results.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400">
        No results found
      </div>
      <div v-else ref="listRef" class="space-y-2 max-h-60 overflow-y-auto">
        <button v-for="(file, index) in results" :key="file.path" :class="[
          'w-full text-left px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
          { 'bg-gray-100 dark:bg-gray-700': index === currentIndex }
        ]" @click="handleSelect(file)">
          <div class="font-medium">{{ file.title }}</div>
          <div v-if="file.preview" class="text-sm text-gray-500 dark:text-gray-400 truncate">
            {{ file.preview }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { ObsidianFile } from '../types'

const props = defineProps<{
  show: boolean
  results: ObsidianFile[]
  isSearching: boolean
  selectedIndex?: number
}>()

const emit = defineEmits<{
  (e: 'select', file: ObsidianFile): void
  (e: 'close'): void
}>()

const popupRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const currentIndex = ref(0)

const handleClickOutside = (event: MouseEvent) => {
  if (popupRef.value && !popupRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

const handleSelect = (file: ObsidianFile) => {
  emit('select', file)
  emit('close')
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.show || props.results.length === 0) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      currentIndex.value = (currentIndex.value + 1) % props.results.length
      scrollToSelected()
      break
    case 'ArrowUp':
      event.preventDefault()
      currentIndex.value = currentIndex.value <= 0 ? props.results.length - 1 : currentIndex.value - 1
      scrollToSelected()
      break
    case 'Enter':
      event.preventDefault()
      if (props.results[currentIndex.value]) {
        handleSelect(props.results[currentIndex.value])
      }
      break
    case 'Escape':
      event.preventDefault()
      emit('close')
      break
  }
}

const scrollToSelected = async () => {
  await nextTick()
  const listElement = listRef.value
  if (!listElement) return

  const selectedElement = listElement.children[currentIndex.value] as HTMLElement
  if (!selectedElement) return

  const containerTop = listElement.scrollTop
  const containerBottom = containerTop + listElement.clientHeight
  const elementTop = selectedElement.offsetTop
  const elementBottom = elementTop + selectedElement.offsetHeight

  if (elementTop < containerTop) {
    listElement.scrollTop = elementTop
  } else if (elementBottom > containerBottom) {
    listElement.scrollTop = elementBottom - listElement.clientHeight
  }
}

// Reset selection when results change
watch(() => props.results, () => {
  currentIndex.value = 0
})

// Setup handlers
watch(() => props.show, (newVal) => {
  if (newVal) {
    nextTick(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    })
  } else {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleKeyDown)
  }
})

// Cleanup
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>