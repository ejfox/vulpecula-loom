import { contextBridge, ipcRenderer, shell } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  onToggleChatSidebar: (callback: () => void) =>
    ipcRenderer.on("toggle-chat-sidebar", callback),
  onToggleContextPanel: (callback: () => void) =>
    ipcRenderer.on("toggle-context-panel", callback),
  removeToggleChatSidebar: (callback: () => void) =>
    ipcRenderer.removeListener("toggle-chat-sidebar", callback),
  removeToggleContextPanel: (callback: () => void) =>
    ipcRenderer.removeListener("toggle-context-panel", callback),
  // Window management
  showWindow: () => ipcRenderer.invoke("show-window"),
  // Dock/Badge management
  setBadge: (count: number) => ipcRenderer.invoke("set-badge", count),
  // New chat handler
  onNewChat: (callback: () => void) => ipcRenderer.on("new-chat", callback),
  removeNewChat: (callback: () => void) =>
    ipcRenderer.removeListener("new-chat", callback),
  // Shell utilities
  openExternal: (url: string) => shell.openExternal(url),
  // Settings handler
  onOpenSettings: (callback: () => void) =>
    ipcRenderer.on("open-settings", callback),
  removeOpenSettings: (callback: () => void) =>
    ipcRenderer.removeListener("open-settings", callback),
});

console.log("Preload script running");

const electronAPI = {
  shell: {
    openExternal(url: string) {
      console.log("Shell openExternal called with:", url);
      return shell.openExternal(url);
    },
  },
  ipcRenderer: {
    invoke(channel: string, ...args: any[]) {
      return ipcRenderer.invoke(channel, ...args);
    },
  },
};

try {
  console.log("Exposing electron API...");
  contextBridge.exposeInMainWorld("electron", electronAPI);
  console.log("Electron API exposed successfully");
} catch (error) {
  console.error("Failed to expose electron API:", error);
}

console.log("Preload script completed");
