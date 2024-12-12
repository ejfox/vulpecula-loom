import { contextBridge, ipcRenderer } from "electron";
import type { StoreSchema } from "../types/store";

console.log("Preload script running");

const electronAPI = {
  store: {
    get: <K extends keyof StoreSchema>(key: K) =>
      ipcRenderer.invoke("store-get", key),
    set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]) =>
      ipcRenderer.invoke("store-set", key, value),
    clear: () => ipcRenderer.invoke("store-clear"),
  },
  shell: {
    openExternal(url: string) {
      return ipcRenderer.invoke("shell-open-external", url);
    },
  },
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
};

try {
  console.log("Exposing electron API...");
  contextBridge.exposeInMainWorld("electron", electronAPI);
  contextBridge.exposeInMainWorld("electronAPI", electronAPI);
  console.log("Electron API exposed successfully");
} catch (error) {
  console.error("Failed to expose electron API:", error);
}

console.log("Preload script completed");
