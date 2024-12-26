import { contextBridge, ipcRenderer } from "electron";

console.log("Preload script running");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  console.log("Exposing electron API...");
  contextBridge.exposeInMainWorld("electron", {
    ipc: {
      invoke: (channel: string, ...args: any[]) => {
        return ipcRenderer.invoke(channel, ...args);
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
  });
  console.log("Electron API exposed successfully");
} catch (error) {
  console.error("Failed to expose electron API:", error);
}

console.log("Preload script completed");
