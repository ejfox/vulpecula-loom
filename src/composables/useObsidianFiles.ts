import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "../lib/store";
import { useDebounce } from "@vueuse/core";
import type {
  ObsidianFile,
  ObsidianSearchOptions,
  ElectronAPI,
} from "../types";

// Ensure window.electron exists with proper type checking
const electron = window.electron as ElectronAPI;
if (!electron?.ipc) {
  throw new Error("Electron IPC not available - this app must run in Electron");
}

export function useObsidianFiles() {
  const store = useStore();
  const searchQuery = ref("");
  const debouncedQuery = useDebounce(searchQuery, 150);
  const isSearching = ref(false);
  const searchResults = ref<ObsidianFile[]>([]);
  const vaultPath = ref<string>("");
  const error = ref<string | null>(null);

  // Load vault path on initialization
  const loadVaultPath = async () => {
    try {
      error.value = null;
      const path = await store.get("obsidian-vault-path");
      vaultPath.value = path || "";
    } catch (err) {
      console.error("Failed to load Obsidian vault path:", err);
      error.value =
        err instanceof Error
          ? err.message
          : "Failed to load Obsidian vault path";
      vaultPath.value = "";
    }
  };

  // Computed property to check if we have a valid vault
  const hasVault = computed(() => Boolean(vaultPath.value));

  // Watch for vault path changes
  watch(vaultPath, (newPath) => {
    console.log("Vault path updated:", newPath);
  });

  // Initialize
  onMounted(() => {
    loadVaultPath();
  });

  // Search function
  const searchFiles = async (query: string) => {
    console.log("🔎 useObsidianFiles: Search Files Called");
    console.log("🔎 Query:", query);
    console.log("🔎 Has vault:", hasVault.value);
    console.log("🔎 Vault path:", vaultPath.value);

    if (!hasVault.value || !query.trim()) {
      console.log(
        "⚠️ useObsidianFiles: Returning early - no vault or empty query"
      );
      searchResults.value = [];
      return;
    }

    try {
      isSearching.value = true;
      const searchOptions: ObsidianSearchOptions = {
        path: vaultPath.value,
        searchTerm: query.trim(),
      };

      console.log(
        "🔎 useObsidianFiles: Invoking IPC with options:",
        searchOptions
      );
      const results = await electron.ipc.invoke(
        "search-obsidian-files",
        searchOptions
      );
      console.log("🔎 useObsidianFiles: Received results:", results);

      if (Array.isArray(results)) {
        console.log(`✅ useObsidianFiles: Got ${results.length} results`);
        searchResults.value = results;
      } else {
        console.error(
          "❌ useObsidianFiles: Unexpected search results format:",
          results
        );
        searchResults.value = [];
      }
    } catch (err) {
      console.error("❌ useObsidianFiles: Failed to search files:", err);
      error.value =
        err instanceof Error ? err.message : "Failed to search files";
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  };

  // Watch search query changes with debounce
  watch(debouncedQuery, async (query) => {
    if (query) {
      await searchFiles(query);
    } else {
      searchResults.value = [];
    }
  });

  return {
    searchQuery,
    searchResults,
    isSearching,
    hasVault,
    vaultPath,
    searchFiles,
    error,
  };
}
