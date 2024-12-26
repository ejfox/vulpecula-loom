import { contextBridge, ipcRenderer } from "electron";

// List of valid IPC channels
const validChannels = [
  "search-obsidian-files",
  "select-folder",
  "get-app-path",
  "get-obsidian-file-content",
  "get-vault-path",
  "show-save-dialog",
  "write-file",
  "open-external",
  "store-get",
  "store-set",
  "store-clear",
];

// List of valid event channels
const validEventChannels = ["obsidian-file-change"];

// Create the IPC store
const ipcStore = {
  invoke: async (channel: string, ...args: any[]): Promise<any> => {
    console.log("🔄 IPC Store: Invoking channel:", channel, "Args:", args);
    if (validChannels.includes(channel)) {
      try {
        console.log("✅ IPC Store: Channel authorized:", channel);
        const result = await ipcRenderer.invoke(channel, ...args);
        console.log(
          "✅ IPC Store: Channel invoked successfully:",
          channel,
          "Result:",
          result
        );
        return result;
      } catch (err) {
        console.error(
          "❌ IPC Store: Error invoking channel:",
          channel,
          "Error:",
          err
        );
        throw err;
      }
    }
    console.error("❌ IPC Store: Unauthorized channel:", channel);
    throw new Error(`Unauthorized IPC channel: ${channel}`);
  },
  on: (channel: string, func: (...args: any[]) => void): void => {
    if (validEventChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => func(...args));
    }
  },
  removeListener: (channel: string, func: (...args: any[]) => void): void => {
    if (validEventChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, func);
    }
  },
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  // Window management
  onToggleChatSidebar: (callback: () => void) =>
    ipcRenderer.on("toggle-chat-sidebar", callback),
  onToggleContextPanel: (callback: () => void) =>
    ipcRenderer.on("toggle-context-panel", callback),
  removeToggleChatSidebar: (callback: () => void) =>
    ipcRenderer.removeListener("toggle-chat-sidebar", callback),
  removeToggleContextPanel: (callback: () => void) =>
    ipcRenderer.removeListener("toggle-context-panel", callback),
  showWindow: () => ipcRenderer.invoke("show-window"),
  setBadge: (count: number) => ipcRenderer.invoke("set-badge", count),
  onNewChat: (callback: () => void) => ipcRenderer.on("new-chat", callback),
  removeNewChat: (callback: () => void) =>
    ipcRenderer.removeListener("new-chat", callback),
  onOpenSettings: (callback: () => void) =>
    ipcRenderer.on("open-settings", callback),
  removeOpenSettings: (callback: () => void) =>
    ipcRenderer.removeListener("open-settings", callback),

  // IPC store for file operations
  ipc: ipcStore,

  // Shell operations
  shell: {
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke("open-external", url),
  },
});
