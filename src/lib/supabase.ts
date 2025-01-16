import { createClient } from "@supabase/supabase-js";

console.log("Supabase config:", {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_KEY,
});

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      storageKey: "vulpecula-auth",
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
