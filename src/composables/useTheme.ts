import { useDark, useToggle, usePreferredDark } from "@vueuse/core";
import { useStore } from "../lib/store";
import { watch } from "vue";

export function useTheme() {
  const store = useStore();
  const systemPrefersDark = usePreferredDark();

  // Initialize with system preference, but allow override from stored preference
  const isDark = useDark({
    selector: "html",
    attribute: "class",
    valueDark: "dark",
    valueLight: "light",
    storageKey: null, // Don't use VueUse's storage, we'll handle it ourselves
    onChanged: (dark: boolean) => {
      // Save preference to store
      store.set("theme", dark ? "dark" : "light");
    },
  });

  // Watch system preference changes
  watch(
    systemPrefersDark,
    (prefersDark) => {
      // Only update if we're in "system" mode (no stored preference)
      const storedTheme = store.get("theme");
      if (!storedTheme) {
        isDark.value = prefersDark;
      }
    },
    { immediate: true }
  );

  // Initialize from store or system preference
  const initTheme = async () => {
    const storedTheme = await store.get("theme");
    if (storedTheme) {
      isDark.value = storedTheme === "dark";
    } else {
      isDark.value = systemPrefersDark.value;
    }
  };

  // Call initialization
  initTheme();

  const toggleDark = useToggle(isDark);

  return {
    isDark,
    toggleDark,
    systemPrefersDark,
  };
}
