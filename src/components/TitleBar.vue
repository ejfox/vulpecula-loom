<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useActiveUser } from '../composables/useActiveUser'

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

const { user, signOut } = useActiveUser()
const showUserMenu = ref(false)

const emit = defineEmits(['update:isContextPanelOpen', 'update:isChatSidebarOpen'])

// Handle sign out
const handleSignOut = async () => {
  try {
    await signOut()
    showUserMenu.value = false
  } catch (error) {
    console.error('Failed to sign out:', error)
  }
}

// Close menu when clicking outside
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (showUserMenu.value && !e.defaultPrevented) {
      showUserMenu.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
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
      <!-- Context Panel Toggle -->
      <button @click="emit('update:isContextPanelOpen', !isContextPanelOpen)"
        class="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        :class="{ 'text-gray-700 dark:text-gray-300': isContextPanelOpen }">
        <span class="sr-only">Toggle context panel</span>
        <svg class="w-5 h-5 transition-transform duration-200" :class="{ 'rotate-180': isContextPanelOpen }" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- User Menu Button -->
      <div class="relative ml-2">
        <button @click.stop="showUserMenu = !showUserMenu"
          class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <!-- User Avatar -->
          <img v-if="user?.user_metadata?.avatar_url" :src="user.user_metadata.avatar_url"
            :alt="user.user_metadata.full_name" class="w-6 h-6 rounded-full" />
          <span class="text-sm text-gray-700 dark:text-gray-300">
            {{ user?.user_metadata?.full_name || 'User' }}
          </span>
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- User Menu Dropdown -->
        <div v-if="showUserMenu"
          class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div class="py-1">
            <!-- User Info -->
            <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ user?.user_metadata?.full_name }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ user?.email }}
              </div>
            </div>

            <!-- Account Actions -->
            <div class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
              Signed in with Discord
            </div>

            <!-- Logout Button -->
            <button @click="handleSignOut"
              class="w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>