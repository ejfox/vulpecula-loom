const { contextBridge, ipcRenderer, shell } = require('electron')

console.log('Preload script running')

const electronAPI = {
  shell: {
    openExternal(url: string) {
      console.log('Shell openExternal called with:', url)
      return shell.openExternal(url)
    }
  },
  ipcRenderer: {
    invoke(channel: string, ...args: any[]) {
      return ipcRenderer.invoke(channel, ...args)
    }
  }
}

try {
  console.log('Exposing electron API...')
  contextBridge.exposeInMainWorld('electron', electronAPI)
  console.log('Electron API exposed successfully')
} catch (error) {
  console.error('Failed to expose electron API:', error)
}

console.log('Preload script completed')
