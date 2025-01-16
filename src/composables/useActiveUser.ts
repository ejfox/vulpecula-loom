// src/composables/useActiveUser.ts
import { ref, computed, onMounted } from "vue";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export function useActiveUser() {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);
  const userId = computed(() => user.value?.id);

  async function initialize() {
    try {
      loading.value = true;
      console.log("Initializing user session...");

      // Get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      // Set initial user state
      user.value = session?.user ?? null;
      console.log("Initial session state:", {
        hasUser: !!user.value,
        userId: user.value?.id,
      });

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log("Auth state changed:", {
          event: _event,
          hasUser: !!session?.user,
        });
        user.value = session?.user ?? null;
      });

      // Return the subscription for cleanup
      return subscription;
    } catch (err) {
      console.error("Auth init error:", err);
      error.value = "Failed to initialize auth";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function signInWithDiscord() {
    try {
      loading.value = true;
      error.value = null;

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;
      return true;
    } catch (err: any) {
      console.error("Discord sign in error:", err);
      error.value = err?.message || "Failed to sign in with Discord";
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
      user.value = null; // Explicitly clear user state
    } catch (err: any) {
      console.error("Sign out error:", err);
      error.value = err?.message || "Failed to sign out";
    } finally {
      loading.value = false;
    }
  }

  // Initialize on mount
  onMounted(() => {
    console.log("useActiveUser mounted, initializing...");
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
    signInWithDiscord,
    signOut,
  };
}
