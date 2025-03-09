import { contextBridge, ipcRenderer } from "electron";

console.log("CRITICAL: Preload script starting...");

/**
 * Channel validation to ensure security
 */
const validChannels = [
  "store-get",
  "store-set",
  "get-vault-path",
  "search-obsidian-files",
  "select-folder",
  "check-path-exists",
  "shell:open-external",
  "test-direct-path-access",
  "fix-path-permissions",
  "list-directory-contents",
];

/**
 * Event channels that can be subscribed to
 */
const validEventChannels = [
  "search-progress",
  "set-badge",
  "show-window",
  "blur-window",
];

/**
 * IPC interface for communicating with the main process
 */
const ipcStore = {
  invoke: async (channel: string, ...args: any[]) => {
    // Validate channel for security
    if (!validChannels.includes(channel)) {
      console.error(`CRITICAL: Unauthorized IPC channel: ${channel}`);
      throw new Error(`Unauthorized IPC channel: ${channel}`);
    }

    try {
      // Special handling for critical operations
      if (channel === "store-set") {
        const [key, value] = args;
        console.log(`CRITICAL: Invoking store-set for key: ${key}`);

        // Special logging for obsidian-vault-path
        if (key === "obsidian-vault-path") {
          console.log(`CRITICAL: Setting vault path to: ${value}`);
        }
      }

      if (channel === "get-vault-path") {
        console.log("CRITICAL: Invoking get-vault-path");
      }

      // Invoke channel and return result
      const result = await ipcRenderer.invoke(channel, ...args);
      console.log(`CRITICAL: Successfully invoked ${channel}`);
      return result;
    } catch (error) {
      console.error(`CRITICAL: Error invoking ${channel}:`, error);
      throw error;
    }
  },

  on: (channel: string, func: (...args: any[]) => void) => {
    if (!validEventChannels.includes(channel)) {
      console.error(`CRITICAL: Unauthorized event channel: ${channel}`);
      throw new Error(`Unauthorized event channel: ${channel}`);
    }

    console.log(`CRITICAL: Subscribing to event channel: ${channel}`);
    const subscription = (_event: any, ...args: any[]) => func(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      console.log(`CRITICAL: Unsubscribing from event channel: ${channel}`);
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  removeListener: (channel: string, func: (...args: any[]) => void) => {
    if (!validEventChannels.includes(channel)) {
      console.error(
        `CRITICAL: Unauthorized event channel for removal: ${channel}`
      );
      throw new Error(`Unauthorized event channel for removal: ${channel}`);
    }

    console.log(`CRITICAL: Removing listener from channel: ${channel}`);
    ipcRenderer.removeListener(channel, func);
  },
};

// Expose the IPC API to the renderer process
contextBridge.exposeInMainWorld("electron", {
  ipc: ipcStore,
  platform: process.platform,
});

console.log("CRITICAL: Preload script completed, API exposed");
