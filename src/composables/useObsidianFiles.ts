import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "../lib/store";
import { useDebounce } from "@vueuse/core";

export interface ObsidianFile {
  title: string;
  path: string;
  slug: string;
  preview?: string;
}

export function useObsidianFiles() {
  const store = useStore();
  const searchQuery = ref("");
  const debouncedQuery = useDebounce(searchQuery, 150);
  const isSearching = ref(false);
  const searchResults = ref<ObsidianFile[]>([]);
  const resolvedVaultPath = ref<string>("");
  const error = ref<string | null>(null);

  // Get and resolve the vault path
  const updateVaultPath = async () => {
    try {
      error.value = null;
      const path = await store.get("obsidian-vault-path");
      resolvedVaultPath.value = path || "";
    } catch (err) {
      console.error("Failed to get vault path:", err);
      error.value =
        err instanceof Error ? err.message : "Failed to get vault path";
      resolvedVaultPath.value = "";
    }
  };

  // Initial vault path resolution - wait for electron to be ready
  onMounted(() => {
    if (window.electron?.store) {
      updateVaultPath();
    } else {
      const checkInterval = setInterval(() => {
        if (window.electron?.store) {
          clearInterval(checkInterval);
          updateVaultPath();
        }
      }, 100);

      // Clear interval after 5 seconds if electron is still not available
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.electron?.store) {
          error.value = "Electron store not available after timeout";
        }
      }, 5000);
    }
  });

  const hasVault = computed(() => Boolean(resolvedVaultPath.value));

  async function searchFiles(query: string): Promise<ObsidianFile[]> {
    console.group("Obsidian File Search");
    console.log("Query:", query);
    console.log("Has vault:", hasVault.value);
    console.log("Vault path:", resolvedVaultPath.value);

    if (!hasVault.value || !query.trim()) {
      console.log("Returning early - no vault or empty query");
      console.groupEnd();
      return [];
    }

    try {
      isSearching.value = true;

      // Only send the minimal required data
      const searchRequest = {
        path: resolvedVaultPath.value,
        searchTerm: query.trim(),
      };
      console.log("Search request:", searchRequest);

      // Ensure we're sending a plain object
      const results = await window.electron.ipcRenderer.invoke(
        "search-obsidian-files",
        JSON.parse(JSON.stringify(searchRequest))
      );
      console.log("Search results:", results);

      // Ensure we're getting back valid data
      if (Array.isArray(results)) {
        const mappedResults = results.map((result) => ({
          title: String(result.title || ""),
          path: String(result.path || ""),
          slug: String(result.slug || ""),
          preview: result.preview ? String(result.preview) : undefined,
        }));
        console.log("Mapped results:", mappedResults);
        console.groupEnd();
        return mappedResults;
      }

      console.log("Invalid results format");
      console.groupEnd();
      return [];
    } catch (err) {
      console.error("Failed to search Obsidian files:", err);
      console.groupEnd();
      return [];
    } finally {
      isSearching.value = false;
    }
  }

  // Watch for query changes
  watch(debouncedQuery, async (newQuery: string) => {
    if (newQuery) {
      searchResults.value = await searchFiles(newQuery);
    } else {
      searchResults.value = [];
    }
  });

  // Watch for vault path changes
  watch(
    () => store.get("obsidian-vault-path"),
    () => {
      updateVaultPath();
    }
  );

  return {
    searchQuery,
    searchResults,
    isSearching,
    hasVault,
    searchFiles,
    error,
  };
}
