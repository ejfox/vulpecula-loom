<script setup>
const props = defineProps({
  modelName: {
    type: String,
    default: ''
  },
  isConnected: {
    type: Boolean,
    default: true
  }
})
</script>

<template>
  <footer class="flex-shrink-0 h-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 
           text-gray-600 dark:text-gray-400 text-xs flex items-center px-2 gap-3 
           group hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
    <!-- Left side status items -->
    <div class="flex items-center gap-3">
      <!-- Connection status -->
      <div class="flex items-center gap-1.5">
        <div class="w-2 h-2 rounded-full transition-colors"
          :class="isConnected ? 'bg-green-500 dark:bg-green-600' : 'bg-red-500 dark:bg-red-600'" />
        <span class="transition-opacity hover:text-gray-900 dark:hover:text-gray-300">
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>
      </div>

      <!-- Model name -->
      <div v-if="modelName" class="flex items-center gap-1">
        <span class="text-gray-400 dark:text-gray-500">Model:</span>
        <span class="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">
          {{ modelName.split('/').pop() }}
        </span>
      </div>
    </div>

    <!-- Right side status items -->
    <div class="flex-1 flex items-center justify-end gap-3">
      <!-- Placeholder for future metrics -->
    </div>
  </footer>
</template>