<script setup lang="ts">
defineProps<{
  label?: string
  progress?: number
  state?: 'loading' | 'success' | 'error'
}>()
</script>

<template>
  <div class="loading-state" :class="state">
    <div class="flex items-center gap-3">
      <!-- Loading spinner or success/error icon -->
      <div class="icon-container">
        <svg v-if="state === 'loading'" class="animate-spin w-4 h-4" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <svg v-else-if="state === 'success'" class="w-4 h-4" viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else-if="state === 'error'" class="w-4 h-4" viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <!-- Label -->
      <div class="flex-1 min-w-0">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          {{ label }}
        </div>
        <!-- Progress bar -->
        <div v-if="typeof progress === 'number'"
          class="mt-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div class="h-full bg-gray-300 dark:bg-gray-600 rounded-full transition-all duration-300 ease-out"
            :style="{ width: `${progress}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state {
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: rgb(249 250 251);
  border: 1px solid rgb(229 231 235);
}

:root.dark .loading-state {
  background: rgb(17 24 39);
  border-color: rgb(55 65 81);
}

.icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: rgb(243 244 246);
  color: rgb(107 114 128);
}

:root.dark .icon-container {
  background: rgb(31 41 55);
  color: rgb(156 163 175);
}

/* Success state */
.loading-state.success .icon-container {
  color: rgb(34 197 94);
}

/* Error state */
.loading-state.error .icon-container {
  color: rgb(239 68 68);
}

/* Fade and slide animation */
.loading-state {
  animation: fade-in-up 0.5s ease-out;
  animation-fill-mode: both;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>