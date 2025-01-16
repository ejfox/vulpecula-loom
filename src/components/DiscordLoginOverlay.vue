<template>
  <div class="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
      <!-- Title -->
      <h2 class="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
        Welcome to Vulpecula
      </h2>

      <!-- Description -->
      <div class="space-y-4 mb-8">
        <p class="text-gray-600 dark:text-gray-300 text-center">
          Sign in with Discord to start chatting with AI models and save your conversations.
        </p>

        <!-- Login Process Steps -->
        <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <h3 class="font-medium text-gray-900 dark:text-white mb-2">What to expect:</h3>
          <ol class="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-decimal list-inside">
            <li>Click the Discord button below</li>
            <li>You'll be redirected to Discord to authorize</li>
            <li>Choose which Discord account to use</li>
            <li>Return here automatically after approval</li>
          </ol>
        </div>

        <!-- Privacy Note -->
        <div class="text-sm text-gray-500 dark:text-gray-400">
          <p class="font-medium mb-1">🔒 Your privacy:</p>
          <ul class="list-disc list-inside space-y-1">
            <li>We only access your basic Discord profile</li>
            <li>Your chats are private to your account</li>
            <li>You can log out at any time</li>
          </ul>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error"
        class="mb-4 p-4 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-md text-sm text-center">
        {{ error }}
      </div>

      <!-- Discord Sign In Button -->
      <button @click="signInWithDiscord" :disabled="loading"
        class="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#4752C4]/50 text-white px-4 py-3 rounded-md font-medium transition-colors">
        <!-- Loading Spinner -->
        <svg v-if="loading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>

        <!-- Discord Logo -->
        <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" fill="currentColor">
          <path
            d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
        </svg>

        <span>{{ loading ? 'Signing in...' : 'Continue with Discord' }}</span>
      </button>

      <!-- Help Text -->
      <div class="mt-4 text-sm text-center space-y-2">
        <p class="text-gray-500 dark:text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
        <p class="text-gray-600 dark:text-gray-300">
          Need help? <a href="#" class="text-blue-600 dark:text-blue-400 hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useActiveUser } from '../composables/useActiveUser'

const { isAuthenticated, loading, error, signInWithDiscord } = useActiveUser()
</script>