import { contextBridge, ipcRenderer } from "electron";

// Create the electron API object
const electronAPI = {
  ipc: {
    invoke: (channel: string, ...args: any[]) =>
      ipcRenderer.invoke(channel, ...args),
    on: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.on(channel, func);
      return () => ipcRenderer.removeListener(channel, func);
    },
    once: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.once(channel, func);
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

// Export for TypeScript
export type ElectronAPI = typeof electronAPI;
