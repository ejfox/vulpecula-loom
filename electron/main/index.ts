import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { getStoreWrapper, type StoreSchema } from './store'
import { setupObsidianHandlers } from '../ipc/obsidian'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
const APP_ROOT = path.join(__dirname, '../..')
const MAIN_DIST = path.join(APP_ROOT, 'dist-electron')
const RENDERER_DIST = path.join(APP_ROOT, 'dist')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.js')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

// Initialize store wrapper
let storeWrapper: Awaited<ReturnType<typeof getStoreWrapper>>

async function createWindow() {
  win = new BrowserWindow({
    title: 'Vulpecula Loom',
    titleBarStyle: 'hiddenInset',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    minWidth: 420,
    minHeight: 300,
    width: 900,
    height: 600,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: !app.isPackaged
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  win.webContents.on('did-finish-load', () => {
    console.log('Window loaded, testing IPC...')
    win?.webContents.send('test-channel', 'Test from main process')
  })
}

app.whenReady().then(async () => {
  // Initialize store and set up handlers before creating window
  storeWrapper = await getStoreWrapper()
  setupObsidianHandlers()
  await createWindow()
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', (event, commandLine) => {
  const url = commandLine.find((arg) => arg.startsWith('vulpecula://'))
  if (url && win) {
    win.webContents.send('auth-callback', url)
  }
  
  // Focus on the main window
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// Add export dialog handler
ipcMain.handle('export-markdown', async (_, content: string) => {
  const result = await dialog.showSaveDialog({
    title: 'Export Chat',
    defaultPath: `vulpecula-chat-${new Date().toISOString().split('T')[0]}.md`,
    filters: [
      { name: 'Markdown', extensions: ['md'] }
    ],
    properties: ['createDirectory', 'showOverwriteConfirmation']
  })

  if (!result.canceled && result.filePath) {
    await fs.writeFile(result.filePath, content, 'utf-8')
    return { success: true, path: result.filePath }
  }
  return { success: false }
})

ipcMain.handle('show-confirm-dialog', async (_, options) => {
  const result = await dialog.showMessageBox({
    type: 'warning',
    ...options,
  })
  return result
})

// Store operations
ipcMain.handle('store-get', async (_, key: keyof StoreSchema) => {
  return storeWrapper.get(key)
})

ipcMain.handle('store-set', async (_, key: keyof StoreSchema, value: StoreSchema[keyof StoreSchema]) => {
  storeWrapper.set(key, value)
  return true
})

ipcMain.handle('store-clear', async () => {
  storeWrapper.clear()
  return true
})
