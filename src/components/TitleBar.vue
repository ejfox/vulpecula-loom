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
           border-b border-white/5 transition-all duration-1000
           dark:bg-black/20" :class="[
            isLoading ? 'animate-gradient-slow bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-200%'
              : isSending ? 'animate-gradient-slower bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-blue-500/5 bg-200%'
                : 'bg-white/5 backdrop-blur-sm'
          ]">
    <!-- Left side (with traffic light spacing) -->
    <div class="absolute left-[70px] flex items-center gap-2">
      <button @click="emit('update:isChatSidebarOpen', !isChatSidebarOpen)"
        class="p-1 text-white/40 hover:text-white/60 transition-colors" :class="{ 'text-white/80': isChatSidebarOpen }">
        <span class="sr-only">Toggle chat sidebar</span>
        <svg class="w-5 h-5 transition-transform duration-200" :class="{ 'rotate-180': !isChatSidebarOpen }" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>

    <!-- Center-aligned content -->
    <div class="flex items-center gap-2 text-xs">
      <span class="text-white/80">狐狸座</span>
      <span class="text-white/40">•</span>
      <span class="text-white/60">{{ modelName }}</span>
    </div>

    <!-- Right-aligned content -->
    <div class="absolute right-3 flex items-center gap-2">
      <button @click="emit('update:isContextPanelOpen', !isContextPanelOpen)"
        class="p-1 text-white/40 hover:text-white/60 transition-colors"
        :class="{ 'text-white/80': isContextPanelOpen }">
        <span class="sr-only">Toggle context panel</span>
        <svg class="w-5 h-5 transition-transform duration-200" :class="{ 'rotate-180': isContextPanelOpen }" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </header>
</template>