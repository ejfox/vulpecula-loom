import { ref, computed } from 'vue'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  async function initialize() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      user.value = session?.user ?? null

      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null
      })

      // Listen for auth callbacks
      if (window.electron?.ipcRenderer) {
        const localError = error // Capture the ref in local scope
        window.electron.ipcRenderer.on('auth-callback', async (data: any) => {
          if (data.type === 'reset-password') {
            try {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: data.accessToken,
                refresh_token: data.refreshToken
              })
              if (sessionError) throw sessionError
              
              // Show success message using local reference
              localError.value = 'Password reset successful! You can now sign in.'
            } catch (err) {
              console.error('Error setting session:', err)
              localError.value = 'Failed to complete password reset'
            }
          }
        })
      }
    } catch (err) {
      console.error('Auth init error:', err)
      error.value = 'Failed to initialize auth'
    }
  }

  async function signIn(email: string, password: string) {
    try {
      loading.value = true
      error.value = null

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError
      user.value = data.user
      return true

    } catch (err: any) {
      console.error('Sign in error:', err)
      error.value = err?.message || 'Failed to sign in'
      return false
    } finally {
      loading.value = false
    }
  }

  async function signUp(email: string, password: string) {
    try {
      loading.value = true
      error.value = null

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password
      })

      if (authError) throw authError

      if (data?.user?.identities?.length === 0) {
        error.value = 'Email already registered. Try signing in instead.'
        return false
      }

      // Show confirmation message
      error.value = 'Check your email to confirm your account!'
      return true
      
    } catch (err: any) {
      console.error('Sign up error:', err)
      error.value = err?.message || 'Failed to sign up'
      return false
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(email: string) {
    try {
      loading.value = true
      error.value = null

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'vulpecula://auth/reset-password'
      })

      if (resetError) throw resetError
      
      // Show success message
      error.value = 'Check your email for password reset instructions!'
      return true

    } catch (err: any) {
      console.error('Reset password error:', err)
      error.value = err?.message || 'Failed to send reset email'
      return false
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    try {
      loading.value = true
      error.value = null
      await supabase.auth.signOut()
    } catch (err: any) {
      console.error('Sign out error:', err)
      error.value = err?.message || 'Failed to sign out'
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    initialize,
    signIn,
    signUp,
    signOut,
    resetPassword
  }
} 