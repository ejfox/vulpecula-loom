import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { setupIpcHandlers } from "../ipc";

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js
// │ └─┬ preload
// │   └── index.js
// ├─┬ dist
// │ └── index.html

process.env.DIST = path.join(__dirname, "../..");
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, "../preload/index.js");

async function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload,
      sandbox: true,
    },
  });

  // Set up all IPC handlers in one place
  setupIpcHandlers();

  // Add CSP headers for development
  if (process.env.VITE_DEV_SERVER_URL) {
    win.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "connect-src 'self' https://openrouter.ai https://*.supabase.co ws: wss:; " +
                "img-src 'self' data: https:; " +
                "font-src 'self' data:;",
            ],
          },
        });
      }
    );
  }

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    // Make sure DIST is defined
    const distPath = process.env.DIST;
    if (!distPath) {
      throw new Error("DIST path is not defined");
    }
    // In production, load from the dist directory
    await win.loadFile(path.join(distPath, "dist", "index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (win === null) createWindow();
});

// Add window control handlers
ipcMain.handle("window-minimize", () => {
  win?.minimize();
});

ipcMain.handle("window-maximize", () => {
  if (win?.isMaximized()) {
    win?.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.handle("window-close", () => {
  win?.close();
});
