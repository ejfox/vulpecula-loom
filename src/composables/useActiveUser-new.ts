import { ref, computed, onMounted } from "vue";
import { authClient } from "../lib/auth-client";
import type { User, Session } from "../lib/auth-client";

// Create a single instance of auth state
const user = ref<User | null>(null);
const session = ref<Session | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

export function useActiveUser() {
  const isAuthenticated = computed(() => !!user.value);
  const userId = computed(() => user.value?.id);

  async function initialize() {
    try {
      loading.value = true;
      error.value = null;

      // Get current session
      const currentSession = await authClient.getSession();
      
      if (currentSession) {
        user.value = currentSession.user;
        session.value = currentSession;
      }

      // Listen for auth state changes
      authClient.onAuthStateChange((data) => {
        if (data.user && data.session) {
          user.value = data.user;
          session.value = data;
        } else {
          user.value = null;
          session.value = null;
        }
      });

    } catch (err: any) {
      console.error("Auth init error:", err);
      error.value = "Failed to initialize auth";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function signIn(email: string, password: string) {
    try {
      loading.value = true;
      error.value = null;

      const result = await authClient.signIn.email({
        email,
        password
      });

      if (result.error) {
        throw new Error(result.error.message || 'Sign in failed');
      }

      if (result.data?.user) {
        user.value = result.data.user;
        session.value = result.data;
      }

      return true;
    } catch (err: any) {
      console.error("Sign in error:", err);
      error.value = err?.message || "Failed to sign in";
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function signUp(email: string, password: string, name?: string) {
    try {
      loading.value = true;
      error.value = null;

      const result = await authClient.signUp.email({
        email,
        password,
        name
      });

      if (result.error) {
        throw new Error(result.error.message || 'Sign up failed');
      }

      // Check if email verification is required
      if (!result.data?.user) {
        error.value = "Check your email to confirm your account!";
        return true; // Success but needs verification
      }

      user.value = result.data.user;
      session.value = result.data;
      return true;
    } catch (err: any) {
      console.error("Sign up error:", err);
      error.value = err?.message || "Failed to sign up";
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function resetPassword(email: string) {
    try {
      loading.value = true;
      error.value = null;

      const result = await authClient.forgetPassword({
        email,
        redirectTo: "vulpecula://auth/reset-password"
      });

      if (result.error) {
        throw new Error(result.error.message || 'Password reset failed');
      }

      error.value = "Check your email for password reset instructions!";
      return true;
    } catch (err: any) {
      console.error("Reset password error:", err);
      error.value = err?.message || "Failed to send reset email";
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function signOut() {
    try {
      loading.value = true;
      error.value = null;

      await authClient.signOut();
      
      user.value = null;
      session.value = null;
    } catch (err: any) {
      console.error("Sign out error:", err);
      error.value = err?.message || "Failed to sign out";
    } finally {
      loading.value = false;
    }
  }

  // Auto-initialize on mount
  onMounted(() => {
    initialize().catch((err) => {
      console.error("Failed to initialize auth on mount:", err);
    });
  });

  return {
    user: computed(() => user.value),
    session: computed(() => session.value),
    userId,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    isAuthenticated,
    initialize,
    signIn,
    signUp,
    signOut,
    resetPassword
  };
}