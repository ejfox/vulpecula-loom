import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    ipcRenderer: {
      invoke: async (channel: string, ...args: any[]) => {
        const validChannels = [
          'search-obsidian-files',
          'select-folder',
          'get-app-path'
        ]
        if (validChannels.includes(channel)) {
          try {
            return await ipcRenderer.invoke(channel, ...args)
          } catch (err) {
            console.error(`Error invoking ${channel}:`, err)
            throw err
          }
        }
        throw new Error(`Unauthorized IPC channel: ${channel}`)
      },
      on: (channel: string, func: (...args: any[]) => void) => {
        const validChannels = ['obsidian-file-change']
        if (validChannels.includes(channel)) {
          ipcRenderer.on(channel, (event, ...args) => func(...args))
        }
      },
      removeListener: (channel: string, func: (...args: any[]) => void) => {
        const validChannels = ['obsidian-file-change']
        if (validChannels.includes(channel)) {
          ipcRenderer.removeListener(channel, func)
        }
      }
    }
  }
) 