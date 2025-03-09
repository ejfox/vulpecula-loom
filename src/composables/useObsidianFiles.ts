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
  console.error("Electron IPC not available in useObsidianFiles");
}

export function useObsidianFiles() {
  const store = useStore();
  const searchQuery = ref("");
  const debouncedQuery = useDebounce(searchQuery, 150);
  const isSearching = ref(false);
  const searchResults = ref<ObsidianFile[]>([]);
  const vaultPath = ref<string>("");
  const error = ref<string | null>(null);
  const pathExists = ref<boolean>(false);

  // Create a flag to track if we've shown the iCloud warning
  const hasShownICloudWarning = ref(false);

  // Calculated properties
  const hasVault = computed(() => {
    // More lenient check - if we have a path and it's non-empty, consider it valid
    return Boolean(vaultPath.value && vaultPath.value.trim().length > 0);
  });

  /**
   * Direct store access as a fallback when IPC fails
   */
  const getDirectStoreValue = (key: string): any => {
    console.log("⚠️ Attempting direct store access for:", key);
    try {
      // Try to access ElectronStore directly as a fallback
      if ((window as any).ElectronStore) {
        const directStore = new (window as any).ElectronStore();
        const value = directStore.get(key);
        console.log("✅ Direct store access succeeded:", value);
        return value;
      } else {
        console.warn("❌ ElectronStore not available for direct access");
        return null;
      }
    } catch (err) {
      console.error("❌ Direct store access failed:", err);
      return null;
    }
  };

  /**
   * Load the vault path from storage with multiple fallback options
   */
  const loadVaultPath = async () => {
    error.value = null;
    try {
      console.log("Loading vault path from store");

      // First, try to get vault path via IPC
      if (electron?.ipc) {
        try {
          console.log("Attempting to get vault path via IPC");
          const path = await electron.ipc.invoke("get-vault-path");
          console.log("Raw vault path from IPC:", path);

          if (path) {
            vaultPath.value = path;
            console.log(
              "Successfully loaded vault path via IPC:",
              vaultPath.value
            );
          } else {
            console.log("IPC returned empty path, trying direct store access");
            // Try direct store access if IPC returns empty
            const directPath = getDirectStoreValue("obsidian-vault-path");
            if (directPath) {
              vaultPath.value = directPath;
              console.log(
                "Got vault path via direct store access:",
                vaultPath.value
              );
            } else {
              vaultPath.value = "";
              console.log("No vault path found in any storage method");
            }
          }
        } catch (err) {
          console.error("Error invoking get-vault-path via IPC:", err);

          // Try direct store access as fallback
          const directPath = getDirectStoreValue("obsidian-vault-path");
          if (directPath) {
            vaultPath.value = directPath;
            console.log(
              "Got vault path via direct store fallback:",
              vaultPath.value
            );
          }
        }
      } else {
        console.log("Electron IPC not available, trying direct store access");
        const directPath = getDirectStoreValue("obsidian-vault-path");
        if (directPath) {
          vaultPath.value = directPath;
          console.log(
            "Got vault path via direct store (no IPC):",
            vaultPath.value
          );
        }
      }

      // Check if path contains iCloud
      if (vaultPath.value && vaultPath.value.includes("iCloud")) {
        // Only log this warning once
        if (!hasShownICloudWarning.value) {
          console.warn("⚠️ iCloud path detected:", vaultPath.value);
          console.warn(
            "This may cause access issues. Consider moving your vault outside iCloud."
          );
          hasShownICloudWarning.value = true;
        }
      }

      // After loading, check if the path exists
      if (vaultPath.value) {
        await checkPathExists();
      } else {
        pathExists.value = false;
      }

      return vaultPath.value;
    } catch (err: any) {
      console.error("Error loading vault path:", err);
      error.value = err.message || "Failed to load vault path";
      return vaultPath.value;
    }
  };

  /**
   * Check if the vault path exists with multiple fallbacks
   */
  const checkPathExists = async () => {
    error.value = null;
    try {
      if (!vaultPath.value) {
        console.log("No vault path to check existence for");
        pathExists.value = false;
        return false;
      }

      console.log("Checking if path exists:", vaultPath.value);

      if (electron?.ipc) {
        try {
          // Use robust path checking from main process
          console.log("Checking via IPC check-path-exists");
          const exists = await electron.ipc.invoke(
            "check-path-exists",
            vaultPath.value
          );
          console.log("Path exists check result:", exists);
          pathExists.value = exists;

          // For iCloud paths, be more lenient
          if (!exists && vaultPath.value.includes("iCloud")) {
            console.log(
              "iCloud path detected, being more lenient with existence check"
            );
            pathExists.value = true;
            return true;
          }

          return exists;
        } catch (err) {
          console.error("Error invoking check-path-exists:", err);
          // For UI resilience, if there's an error checking the path,
          // but we have a vault path, still allow the UI to work
          console.log("Error checking path, defaulting to true for resilience");
          pathExists.value = true;
          return true;
        }
      } else {
        // In non-electron environments, we assume path exists if set
        console.log("Electron IPC not available, assuming path exists");
        pathExists.value = true;
        return true;
      }
    } catch (err: any) {
      console.error("Error checking if path exists:", err);
      error.value = err.message || "Failed to check if path exists";
      // For resilience, if there's an error but we have a path, still consider it valid
      pathExists.value = Boolean(vaultPath.value);
      return pathExists.value;
    }
  };

  /**
   * Select an Obsidian vault folder
   */
  const selectVaultFolder = async () => {
    error.value = null;
    try {
      if (electron?.ipc) {
        console.log("Opening folder selection dialog");
        const result = await electron.ipc.invoke("select-folder");

        if (result.canceled) {
          console.log("Folder selection canceled");
          return null;
        }

        const selectedPath = result.filePaths[0];
        console.log("Selected vault path:", selectedPath);

        // Save the selected path
        await saveVaultPath(selectedPath);
        return selectedPath;
      }
    } catch (err: any) {
      console.error("Error selecting vault folder:", err);
      error.value = err.message || "Failed to select vault folder";
    }
    return null;
  };

  /**
   * Save the vault path to storage with multiple backup methods
   */
  const saveVaultPath = async (path: string) => {
    error.value = null;
    try {
      console.log("Saving vault path:", path);

      let saveSucceeded = false;

      if (electron?.ipc) {
        try {
          // First try using the store-set IPC channel
          console.log("Saving via IPC store-set");
          await electron.ipc.invoke("store-set", "obsidian-vault-path", path);
          saveSucceeded = true;
          console.log("Successfully saved vault path via IPC");
        } catch (storeErr) {
          console.error("Error with store-set via IPC:", storeErr);

          // Try direct electron-store as fallback
          try {
            console.log("Trying direct ElectronStore access");
            if ((window as any).ElectronStore) {
              const store = new (window as any).ElectronStore();
              store.set("obsidian-vault-path", path);
              saveSucceeded = true;
              console.log(
                "Successfully saved vault path via direct store access"
              );
            } else {
              console.error("ElectronStore not available for direct access");
            }
          } catch (directErr) {
            console.error("Error saving via direct store access:", directErr);
          }
        }
      } else {
        // Try direct store access if IPC is not available
        try {
          console.log("No IPC available, trying direct ElectronStore access");
          if ((window as any).ElectronStore) {
            const store = new (window as any).ElectronStore();
            store.set("obsidian-vault-path", path);
            saveSucceeded = true;
            console.log(
              "Successfully saved vault path via direct store (no IPC)"
            );
          }
        } catch (err) {
          console.error("Error saving via direct store (no IPC):", err);
        }
      }

      if (saveSucceeded) {
        // Update local state
        vaultPath.value = path;
        // After saving path, check if it exists
        await checkPathExists();
        return true;
      } else {
        error.value = "Failed to save vault path through any method";
        return false;
      }
    } catch (err: any) {
      console.error("Error saving vault path:", err);
      error.value = err.message || "Failed to save vault path";
      return false;
    }
  };

  /**
   * Search for files in the Obsidian vault with better error handling
   */
  const searchFiles = async (searchTerm: string) => {
    error.value = null;
    try {
      if (!hasVault.value) {
        console.warn("No vault configured for search");
        searchResults.value = [];
        return [];
      }

      console.log("Searching for:", searchTerm, "in vault:", vaultPath.value);

      if (electron?.ipc) {
        try {
          // For Electron, we use IPC to communicate with main process
          console.log("Searching via IPC");
          const results = await electron.ipc.invoke("search-obsidian-files", {
            path: vaultPath.value,
            searchTerm: searchTerm,
          });

          console.log("Search results count:", results?.length || 0);
          searchResults.value = results || [];
          return results;
        } catch (err) {
          console.error("Error searching files via IPC:", err);
          searchResults.value = [];
          return [];
        }
      } else {
        // For non-Electron environments, we return no results
        console.log("No IPC available for search");
        searchResults.value = [];
        return [];
      }
    } catch (err: any) {
      console.error("Error searching files:", err);
      error.value = err.message || "Failed to search files";
      searchResults.value = [];
      return [];
    }
  };

  // Load the vault path when the module is initialized
  onMounted(async () => {
    console.log("useObsidianFiles mounted, loading vault path");
    await loadVaultPath();
  });

  return {
    searchQuery,
    searchResults,
    isSearching,
    hasVault,
    vaultPath,
    pathExists,
    searchFiles,
    loadVaultPath,
    checkPathExists,
    error,
    selectVaultFolder,
    saveVaultPath,
  };
}
