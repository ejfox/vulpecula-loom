<template>
  <div v-if="!isAuthenticated"
    class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
      <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Welcome to Vulpecula</h2>

      <div v-if="error" class="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
        {{ error }}
      </div>

      <div v-if="resetSent" class="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
        Check your email for password reset instructions!
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <input v-model="email" type="email" required placeholder="Email"
          class="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" :disabled="loading"
          @keydown.enter="handleSubmit" />

        <template v-if="!isResetMode">
          <input v-model="password" type="password" required placeholder="Password"
            class="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" :disabled="loading"
            @keydown.enter="handleSubmit" />

          <input v-if="isSignUp" v-model="confirmPassword" type="password" required placeholder="Confirm Password"
            class="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" :disabled="loading"
            @keydown.enter="handleSubmit" />
        </template>

        <button type="submit"
          class="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          :disabled="loading || (isSignUp && password !== confirmPassword)">
          {{ buttonText }}
        </button>

        <div class="flex justify-between text-sm">
          <button type="button" @click="toggleMode" class="text-blue-600 hover:text-blue-800">
            {{ modeToggleText }}
          </button>

          <button v-if="!isResetMode" type="button" @click="toggleAuthMode" class="text-blue-600 hover:text-blue-800">
            {{ authToggleText }}
          </button>
        </div>

        <div v-if="isSignUp && password" class="text-sm space-y-1">
          <p class="font-medium text-gray-700">Password must have:</p>
          <ul class="space-y-1 text-gray-600">
            <li :class="{ 'text-green-600': password.length >= 8 }">• At least 8 characters</li>
            <li :class="{ 'text-green-600': /[A-Z]/.test(password) }">• One uppercase letter</li>
            <li :class="{ 'text-green-600': /[a-z]/.test(password) }">• One lowercase letter</li>
            <li :class="{ 'text-green-600': /[0-9]/.test(password) }">• One number</li>
          </ul>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '../composables/useAuth'

const { isAuthenticated, loading, error, signIn, signUp, resetPassword } = useAuth()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isResetMode = ref(false)
const resetSent = ref(false)
const isSignUp = ref(false)

const buttonText = computed(() => {
  if (loading) return 'Please wait...'
  if (isResetMode.value) return 'Send Reset Link'
  return isSignUp.value ? 'Create Account' : 'Sign In'
})

const modeToggleText = computed(() => {
  if (isResetMode.value) return 'Back to Sign In'
  return 'Forgot Password?'
})

const authToggleText = computed(() => {
  return isSignUp.value ? 'Have an account? Sign In' : 'Need an account? Sign Up'
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
}

async function handleSubmit() {
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
    }
  } else {
    success = await signIn(email.value, password.value)
  }
}
</script>