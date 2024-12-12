<script setup>
const props = defineProps({
  modelName: {
    type: String,
    default: ''
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isSending: {
    type: Boolean,
    default: false
  },
  isContextPanelOpen: {
    type: Boolean,
    default: false
  },
  isChatSidebarOpen: {
    type: Boolean,
    default: true
  },
  isMobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:isContextPanelOpen', 'update:isChatSidebarOpen'])
</script>

<template>
  <header class="h-10 drag-handle flex items-center justify-center relative
           border-b transition-all duration-1000
           bg-white dark:bg-gray-950 
           border-gray-200 dark:border-gray-800/50" :class="[
            isLoading
              ? 'animate-gradient-slow bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800/50 dark:via-gray-700/50 dark:to-gray-800/50 bg-200%'
              : isSending
                ? 'animate-gradient-slower bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 dark:from-blue-900/50 dark:via-blue-800/50 dark:to-blue-900/50 bg-200%'
                : 'backdrop-blur-sm'
          ]">
    <!-- Left side (with traffic light spacing) -->
    <div class="absolute left-[70px] flex items-center gap-2">
      <button @click="emit('update:isChatSidebarOpen', !isChatSidebarOpen)"
        class="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        :class="{ 'text-gray-700 dark:text-gray-300': isChatSidebarOpen }">
        <span class="sr-only">Toggle chat sidebar</span>
        <svg class="w-5 h-5 transition-transform duration-200" :class="{ 'rotate-180': !isChatSidebarOpen }" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>

    <!-- Center-aligned content -->
    <div class="flex items-center gap-2 text-xs">
      <span class="text-gray-600 dark:text-gray-400">{{ modelName }}</span>
    </div>

    <!-- Right-aligned content -->
    <div class="absolute right-3 flex items-center gap-2">
      <button @click="emit('update:isContextPanelOpen', !isContextPanelOpen)"
        class="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        :class="{ 'text-gray-700 dark:text-gray-300': isContextPanelOpen }">
        <span class="sr-only">Toggle context panel</span>
        <svg class="w-5 h-5 transition-transform duration-200" :class="{ 'rotate-180': isContextPanelOpen }" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </header>
</template>