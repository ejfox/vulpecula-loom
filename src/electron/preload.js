const { contextBridge, ipcRenderer } = require("electron");
const Store = require("electron-store");

// Initialize store
const store = new Store();

contextBridge.exposeInMainWorld("electron", {
  store: {
    get: (key, defaultValue) => store.get(key, defaultValue),
    set: (key, value) => store.set(key, value),
    delete: (key) => store.delete(key),
    clear: () => store.clear(),
  },
  ipcRenderer: {
    on: (channel, func) => ipcRenderer.on(channel, func),
    once: (channel, func) => ipcRenderer.once(channel, func),
    removeListener: (channel, func) =>
      ipcRenderer.removeListener(channel, func),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  },
});
