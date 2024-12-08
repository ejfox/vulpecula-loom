<template>
  <div v-if="show" ref="popupContainer" class="absolute bottom-full left-0 mb-1 w-80 max-h-64 overflow-y-auto
              bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
              z-50">
    <div v-if="isSearching" class="p-3 text-sm text-gray-500 dark:text-gray-400">
      Searching files...
    </div>

    <div v-else-if="!hasVault" class="p-3 text-sm text-gray-500 dark:text-gray-400">
      Please set up your Obsidian vault in settings first
    </div>

    <div v-else-if="results.length === 0" class="p-3 text-sm text-gray-500 dark:text-gray-400">
      No files found
    </div>

    <div v-else class="py-1">
      <button v-for="(file, index) in results" :key="file.path" 
        @click="selectFile(file)"
        @mouseover="selectedIndex = index"
        :ref="(el) => { 
          if (el instanceof HTMLElement) {
            resultRefs.value[index] = el as HTMLButtonElement
          }
        }"
        :class="[
          'w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700',
          'flex items-start gap-2 group transition-colors duration-75',
          selectedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''
        ]">
        <svg class="w-4 h-4 mt-0.5 text-purple-500 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor"
          viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
            {{ file.title }}
          </div>
          <div class="text-xs text-blue-500 dark:text-blue-400 truncate mt-0.5 font-mono">
            {{ getFolderPath(file.path) }}
          </div>
          <div v-if="file.preview" class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {{ file.preview }}
          </div>
        </div>
        <kbd class="hidden group-hover:inline-block text-xs text-gray-400 dark:text-gray-500">
          ↵ to select
        </kbd>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { ObsidianFile } from '../composables/useObsidianFiles'
import { dirname } from 'path-browserify'

const props = defineProps<{
  show: boolean
  results: ObsidianFile[]
  isSearching: boolean
  hasVault: boolean
}>()

const emit = defineEmits<{
  'select': [file: ObsidianFile]
}>()

const selectedIndex = ref(0)
const popupContainer = ref<HTMLElement | null>(null)
const resultRefs = ref<(HTMLButtonElement | null)[]>([])

// Reset selection when results change
watch(() => props.results, () => {
  selectedIndex.value = 0
  resultRefs.value = [] // Clear refs
})

// Reset selection when popup visibility changes
watch(() => props.show, (newShow) => {
  if (newShow) {
    selectedIndex.value = 0
    resultRefs.value = [] // Clear refs
  }
})

const selectFile = (file: ObsidianFile) => emit('select', file)

function getFolderPath(filePath: string): string {
  const folder = dirname(filePath)
  return folder === '.' ? '/' : folder
}

// Handle keyboard navigation
function handleKeydown(e: KeyboardEvent) {
  if (!props.show || props.results.length === 0) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % props.results.length
      scrollSelectedIntoView()
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = selectedIndex.value <= 0 
        ? props.results.length - 1 
        : selectedIndex.value - 1
      scrollSelectedIntoView()
      break
    case 'Enter':
      e.preventDefault()
      if (props.results[selectedIndex.value]) {
        selectFile(props.results[selectedIndex.value])
      }
      break
  }
}

async function scrollSelectedIntoView() {
  await nextTick()
  const selectedElement = resultRefs.value[selectedIndex.value]
  if (selectedElement && popupContainer.value) {
    const container = popupContainer.value
    const elementTop = selectedElement.offsetTop
    const elementBottom = elementTop + selectedElement.offsetHeight
    const containerTop = container.scrollTop
    const containerBottom = containerTop + container.offsetHeight

    if (elementTop < containerTop) {
      // Scroll up to show element
      container.scrollTop = elementTop
    } else if (elementBottom > containerBottom) {
      // Scroll down to show element
      container.scrollTop = elementBottom - container.offsetHeight
    }
  }
}

// Add and remove event listeners
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>