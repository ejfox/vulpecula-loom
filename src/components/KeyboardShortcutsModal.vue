<template>
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        class="relative bg-white dark:bg-oled-black rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        @click.stop>
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white">Keyboard Shortcuts</h2>
          <button @click="close"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6">
          <div v-for="(category, index) in shortcutCategories" :key="index" class="mb-6">
            <h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">{{ category.title }}</h3>
            <div class="space-y-2">
              <div v-for="(shortcut, idx) in category.shortcuts" :key="idx"
                class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span class="text-gray-800 dark:text-gray-200">{{ shortcut.description }}</span>
                <kbd
                  class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                  {{ shortcut.keys }}
                </kbd>
              </div>
            </div>
          </div>
          <div class="mb-4">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Debug & Development</h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm text-gray-700 dark:text-gray-300">Toggle Debug Console</div>
                <kbd
                  class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-oled-black rounded border border-gray-300 dark:border-gray-700">Alt+L</kbd>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button @click="close"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
            Close
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, computed } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};

// Detect platform for showing appropriate key commands
const isMac = computed(() => {
  return navigator.platform.includes('Mac');
});

const modifierKey = computed(() => {
  return isMac.value ? '⌘' : 'Ctrl';
});

const shiftKey = computed(() => {
  return isMac.value ? '⇧' : 'Shift';
});

// Keyboard shortcuts organized by category with platform detection
const shortcutCategories = computed(() => [
  {
    title: 'General',
    shortcuts: [
      { description: 'New Chat', keys: `${modifierKey.value}N` },
      { description: 'Save Chat', keys: `${modifierKey.value}S` },
      { description: 'Export Chat', keys: `${modifierKey.value}E` },
      { description: 'Print Chat', keys: `${modifierKey.value}P` },
      { description: 'Preferences', keys: isMac.value ? '⌘,' : `${modifierKey.value}+,` },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { description: 'Toggle Chat Sidebar', keys: `${modifierKey.value}K` },
      { description: 'Toggle Context Panel', keys: `${modifierKey.value}/` },
    ],
  },
  {
    title: 'Search',
    shortcuts: [
      { description: 'Search in Chat', keys: `${modifierKey.value}F` },
      { description: 'Search Across Chats', keys: `${modifierKey.value}+${shiftKey.value}+F` },
    ],
  },
  {
    title: 'Chat',
    shortcuts: [
      { description: 'Regenerate Response', keys: `${modifierKey.value}R` },
      { description: 'Show Keyboard Shortcuts', keys: `${modifierKey.value}+${shiftKey.value}+/` },
    ],
  },
]);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>