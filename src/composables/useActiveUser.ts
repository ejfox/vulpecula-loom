import { ref, computed, onMounted } from "vue";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// Create a single instance of auth state
const user = ref<User | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

export function useActiveUser() {
  const isAuthenticated = computed(() => !!user.value);
  const userId = computed(() => user.value?.id);

  async function initialize() {
    try {
      loading.value = true;

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      user.value = session?.user ?? null;

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null;
      });

      return subscription;
    } catch (err) {
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

      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

      if (authError) throw authError;
      user.value = data.user;
      return true;
    } catch (err: any) {
      console.error("Sign in error:", err);
      error.value = err?.message || "Failed to sign in";
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function signUp(email: string, password: string) {
    try {
      loading.value = true;
      error.value = null;

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (data?.user?.identities?.length === 0) {
        error.value = "Email already registered. Try signing in instead.";
        return false;
      }

      error.value = "Check your email to confirm your account!";
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

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: "vulpecula://auth/reset-password",
        }
      );

      if (resetError) throw resetError;
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
      await supabase.auth.signOut();
      user.value = null;
    } catch (err: any) {
      console.error("Sign out error:", err);
      error.value = err?.message || "Failed to sign out";
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    initialize().catch((err) => {
      console.error("Failed to initialize on mount:", err);
    });
  });

  return {
    user,
    userId,
    loading,
    error,
    isAuthenticated,
    initialize,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}
