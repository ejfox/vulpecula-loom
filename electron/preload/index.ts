import { contextBridge, ipcRenderer } from "electron";

console.log("Preload script running");

// Define safe channels that can be used from renderer
const validChannels = [
  "menu:open-settings",
  "menu:new-chat",
  "menu:export-chat",
  "menu:toggle-chat-sidebar",
  "menu:toggle-context-panel",
  "menu:print-chat",
  "menu:search-in-chat",
  "menu:search-across-chats",
  "menu:clear-chat",
  "menu:clear-chat-history",
  "menu:regenerate-response",
  "menu:change-model",
  "menu:show-keyboard-shortcuts",
  "print-window",
  "open-external",
  "store-get",
  "store-set",
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  console.log("Exposing electron API...");
  contextBridge.exposeInMainWorld("electron", {
    ipc: {
      invoke: (channel: string, ...args: any[]) => {
        if (validChannels.includes(channel)) {
          return ipcRenderer.invoke(channel, ...args);
        } else {
          console.warn(`Unauthorized IPC channel: ${channel}`);
          return Promise.reject(
            new Error(`Unauthorized IPC channel: ${channel}`)
          );
        }
      },
      on: (channel: string, func: (...args: any[]) => void) => {
        if (validChannels.includes(channel)) {
          ipcRenderer.on(channel, (_, ...args) => func(...args));
          return () => ipcRenderer.removeListener(channel, func);
        } else {
          console.warn(`Unauthorized IPC channel: ${channel}`);
          return () => {};
        }
      },
      once: (channel: string, func: (...args: any[]) => void) => {
        if (validChannels.includes(channel)) {
          ipcRenderer.once(channel, (_, ...args) => func(...args));
        } else {
          console.warn(`Unauthorized IPC channel: ${channel}`);
        }
      },
      removeListener: (channel: string, func: (...args: any[]) => void) => {
        if (validChannels.includes(channel)) {
          ipcRenderer.removeListener(channel, func);
        } else {
          console.warn(`Unauthorized IPC channel: ${channel}`);
        }
      },
    },
    store: {
      get: (key: string) => ipcRenderer.invoke("store-get", key),
      set: (key: string, value: any) =>
        ipcRenderer.invoke("store-set", key, value),
    },
    shell: {
      openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
    },
    // Menu event handlers
    onOpenSettings: (callback: () => void) => {
      ipcRenderer.on("menu:open-settings", () => callback());
      return () => ipcRenderer.removeListener("menu:open-settings", callback);
    },
    onNewChat: (callback: () => void) => {
      ipcRenderer.on("menu:new-chat", () => callback());
      return () => ipcRenderer.removeListener("menu:new-chat", callback);
    },
    onExportChat: (callback: () => void) => {
      ipcRenderer.on("menu:export-chat", () => callback());
      return () => ipcRenderer.removeListener("menu:export-chat", callback);
    },
    onToggleChatSidebar: (callback: () => void) => {
      ipcRenderer.on("menu:toggle-chat-sidebar", () => callback());
      return () =>
        ipcRenderer.removeListener("menu:toggle-chat-sidebar", callback);
    },
    onToggleContextPanel: (callback: () => void) => {
      ipcRenderer.on("menu:toggle-context-panel", () => callback());
      return () =>
        ipcRenderer.removeListener("menu:toggle-context-panel", callback);
    },
  });
  console.log("Electron API exposed successfully");
} catch (error) {
  console.error("Failed to expose electron API:", error);
}

console.log("Preload script completed");
