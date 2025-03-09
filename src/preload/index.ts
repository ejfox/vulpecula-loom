import { contextBridge, ipcRenderer } from "electron";

console.log("Preload script starting...");

// List of valid IPC channels for security
const validChannels = [
  "store-get",
  "store-set",
  "get-vault-path",
  "search-obsidian-files",
  "select-folder",
  "check-path-exists",
  "shell:open-external",
  "get-obsidian-file-content",
];

// Create the electron API object
const electronAPI = {
  ipc: {
    invoke: async (channel: string, ...args: any[]) => {
      // Validate channel for security
      if (!validChannels.includes(channel)) {
        console.error(`Unauthorized IPC channel: ${channel}`);
        throw new Error(`Unauthorized IPC channel: ${channel}`);
      }

      try {
        // Invoke channel and return result
        const result = await ipcRenderer.invoke(channel, ...args);
        return result;
      } catch (error) {
        console.error(`Error invoking ${channel}:`, error);
        throw error;
      }
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (_, ...args) => func(...args));
      return () => ipcRenderer.removeListener(channel, func);
    },
    once: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.once(channel, (_, ...args) => func(...args));
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, func);
    },
  },
  store: {
    get: (key: string) => ipcRenderer.invoke("store-get", key),
    set: (key: string, value: any) =>
      ipcRenderer.invoke("store-set", key, value),
  },
  shell: {
    openExternal: (url: string) =>
      ipcRenderer.invoke("shell:open-external", url),
  },
  handleMenuAction: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
    return () => ipcRenderer.removeListener(channel, callback);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("electron", electronAPI);

console.log("Preload script completed, API exposed");

// Export for TypeScript
export type ElectronAPI = typeof electronAPI;
