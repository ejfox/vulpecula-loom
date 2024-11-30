<script setup>
import { useBreakpoints } from '@vueuse/core'

const props = defineProps({
  isContextPanelOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:isContextPanelOpen'])

const breakpoints = useBreakpoints({
  sm: 640,
  md: 768,
  lg: 1024,
})
const isMobile = breakpoints.smaller('lg')
</script>

<template>
  <Transition enter-active-class="transition-all duration-300 ease-out"
    leave-active-class="transition-all duration-200 ease-in" enter-from-class="translate-x-full"
    enter-to-class="translate-x-0" leave-from-class="translate-x-0" leave-to-class="translate-x-full">
    <div v-if="isContextPanelOpen"
      class="fixed top-[38px] right-0 bottom-0 w-[400px] bg-gray-900 border-l border-white/5 shadow-xl">
      <div class="h-full flex flex-col">
        <!-- Panel Header -->
        <div class="flex-shrink-0 h-10 flex items-center justify-between px-4 border-b border-white/5">
          <h2 class="text-sm text-white/80">Context Alchemy</h2>
          <button @click="emit('update:isContextPanelOpen', false)"
            class="p-1 text-white/40 hover:text-white/60 transition-colors">
            <span class="sr-only">Close panel</span>
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Panel Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="space-y-4">
            <p class="text-white/60 text-sm">Context Alchemy content will go here...</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>