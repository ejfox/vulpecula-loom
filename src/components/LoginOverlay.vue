<template>
  <div v-if="!isAuthenticated"
    class="absolute inset-0 bg-oled-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div
      class="bg-white dark:bg-oled-black p-8 rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out">
      <!-- Logo/Branding -->
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Vulpecula</h2>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ isSignUp ? 'Create an account to get started' : isResetMode ? 'Reset your password' : 'Sign in to continue'
          }}
        </p>
      </div>

      <!-- Feedback Messages -->
      <TransitionGroup name="fade">
        <div v-if="error" key="error"
          class="mb-4 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-start">
          <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ error }}</span>
        </div>

        <div v-if="resetSent" key="success"
          class="mb-4 p-4 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-start">
          <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Check your email for password reset instructions!</span>
        </div>
      </TransitionGroup>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Email Field -->
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <div class="relative">
            <input v-model="email" type="email" required
              class="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
              :class="{ 'opacity-50 cursor-not-allowed': loading }" :disabled="loading" @keydown.enter="handleSubmit" />
            <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <TransitionGroup name="slide">
          <template v-if="!isResetMode">
            <!-- Password Field -->
            <div key="password" class="space-y-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div class="relative">
                <input v-model="password" :type="showPassword ? 'text' : 'password'" required
                  class="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                  :class="{ 'opacity-50 cursor-not-allowed': loading }" :disabled="loading"
                  @keydown.enter="handleSubmit" />
                <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none"
                  stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button type="button" @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="showPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path v-if="showPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Confirm Password Field (Sign Up) -->
            <div v-if="isSignUp" key="confirm-password" class="space-y-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
              <div class="relative">
                <input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" required
                  class="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                  :class="{ 'opacity-50 cursor-not-allowed': loading }" :disabled="loading"
                  @keydown.enter="handleSubmit" />
                <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none"
                  stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </template>
        </TransitionGroup>

        <!-- Password Requirements (Sign Up) -->
        <TransitionGroup name="slide">
          <div v-if="isSignUp && password" key="password-requirements" class="space-y-2">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Password Requirements:</p>
            <ul class="space-y-1 text-sm">
              <li class="flex items-center space-x-2"
                :class="{ 'text-green-600 dark:text-green-400': password.length >= 8, 'text-gray-500 dark:text-gray-400': password.length < 8 }">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="password.length >= 8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 13l4 4L19 7" />
                  <circle v-else cx="12" cy="12" r="10" stroke-width="2" />
                </svg>
                <span>At least 8 characters</span>
              </li>
              <li class="flex items-center space-x-2"
                :class="{ 'text-green-600 dark:text-green-400': /[A-Z]/.test(password), 'text-gray-500 dark:text-gray-400': !/[A-Z]/.test(password) }">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="/[A-Z]/.test(password)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 13l4 4L19 7" />
                  <circle v-else cx="12" cy="12" r="10" stroke-width="2" />
                </svg>
                <span>One uppercase letter</span>
              </li>
              <li class="flex items-center space-x-2"
                :class="{ 'text-green-600 dark:text-green-400': /[a-z]/.test(password), 'text-gray-500 dark:text-gray-400': !/[a-z]/.test(password) }">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="/[a-z]/.test(password)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 13l4 4L19 7" />
                  <circle v-else cx="12" cy="12" r="10" stroke-width="2" />
                </svg>
                <span>One lowercase letter</span>
              </li>
              <li class="flex items-center space-x-2"
                :class="{ 'text-green-600 dark:text-green-400': /[0-9]/.test(password), 'text-gray-500 dark:text-gray-400': !/[0-9]/.test(password) }">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="/[0-9]/.test(password)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 13l4 4L19 7" />
                  <circle v-else cx="12" cy="12" r="10" stroke-width="2" />
                </svg>
                <span>One number</span>
              </li>
            </ul>
          </div>
        </TransitionGroup>

        <!-- Submit Button -->
        <button type="submit"
          class="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          :disabled="loading || (isSignUp && password !== confirmPassword)">
          <svg v-if="loading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
          <span>{{ buttonText }}</span>
        </button>

        <!-- Action Links -->
        <div class="flex justify-between text-sm mt-6">
          <button type="button" @click="toggleMode"
            class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
            {{ modeToggleText }}
          </button>

          <button v-if="!isResetMode" type="button" @click="toggleAuthMode"
            class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
            {{ authToggleText }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useActiveUser } from '../composables/useActiveUser'

const { isAuthenticated, loading, error, signIn, signUp, resetPassword } = useActiveUser()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isResetMode = ref(false)
const resetSent = ref(false)
const isSignUp = ref(false)
const showPassword = ref(false)

const buttonText = computed(() => {
  if (loading.value) return 'Please wait...'
  if (isResetMode.value) return 'Send Reset Link'
  return isSignUp.value ? 'Create Account' : 'Sign In'
})

const modeToggleText = computed(() => {
  if (isResetMode.value) return '← Back to Sign In'
  return 'Forgot Password?'
})

const authToggleText = computed(() => {
  return isSignUp.value ? '← Back to Sign In' : 'Need an account? Sign Up →'
})

function toggleMode() {
  isResetMode.value = !isResetMode.value
  error.value = null
}

function toggleAuthMode() {
  isSignUp.value = !isSignUp.value
  error.value = null
  password.value = ''
  confirmPassword.value = ''
  showPassword.value = false
}

async function handleSubmit() {
  if (loading.value) return // Prevent multiple submissions

  error.value = null
  let success = false

  if (isResetMode.value) {
    success = await resetPassword(email.value)
    if (success) {
      resetSent.value = true
      setTimeout(() => {
        isResetMode.value = false
        resetSent.value = false
      }, 3000)
    }
    return
  }

  if (isSignUp.value) {
    if (password.value !== confirmPassword.value) {
      error.value = 'Passwords do not match'
      return
    }

    // Basic password validation
    if (password.value.length < 8) {
      error.value = 'Password must be at least 8 characters'
      return
    }
    if (!/[A-Z]/.test(password.value)) {
      error.value = 'Password must contain an uppercase letter'
      return
    }
    if (!/[a-z]/.test(password.value)) {
      error.value = 'Password must contain a lowercase letter'
      return
    }
    if (!/[0-9]/.test(password.value)) {
      error.value = 'Password must contain a number'
      return
    }

    success = await signUp(email.value, password.value)
    if (success) {
      isSignUp.value = false
      password.value = ''
      confirmPassword.value = ''
      showPassword.value = false
    }
  } else {
    success = await signIn(email.value, password.value)
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  max-height: 200px;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}
</style>