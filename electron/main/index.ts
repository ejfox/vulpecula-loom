import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  dialog,
  Menu,
  Tray,
  nativeImage,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { getStoreWrapper, type StoreSchema } from "./store";
import { setupObsidianHandlers } from "../ipc/obsidian";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const APP_ROOT = path.join(__dirname, "../..");
const MAIN_DIST = path.join(APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(APP_ROOT, "dist");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(APP_ROOT, "public")
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Window state management
interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

async function getStoredWindowState(): Promise<WindowState | null> {
  try {
    const data = await fs.readFile(
      path.join(app.getPath("userData"), "window-state.json"),
      "utf8"
    );
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveWindowState(win: BrowserWindow) {
  const bounds = win.getBounds();
  const state: WindowState = {
    ...bounds,
    isMaximized: win.isMaximized(),
  };
  await fs.writeFile(
    path.join(app.getPath("userData"), "window-state.json"),
    JSON.stringify(state),
    "utf8"
  );
}

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, "../preload/index.js");
const indexHtml = path.join(RENDERER_DIST, "index.html");

// Initialize store wrapper
let storeWrapper: Awaited<ReturnType<typeof getStoreWrapper>>;

// System tray instance
let tray: Tray | null = null;

// App preferences
interface AppPreferences {
  rememberWindowState: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
  playSounds: boolean;
  showBadgeCount: boolean;
  showProgressBar: boolean;
}

let preferences: AppPreferences = {
  rememberWindowState: true,
  minimizeToTray: false,
  showNotifications: true,
  playSounds: true,
  showBadgeCount: true,
  showProgressBar: true,
};

async function loadPreferences() {
  try {
    const data = await fs.readFile(
      path.join(app.getPath("userData"), "preferences.json"),
      "utf8"
    );
    preferences = { ...preferences, ...JSON.parse(data) };
  } catch {
    // Use defaults if no saved preferences
  }
}

async function savePreferences() {
  await fs.writeFile(
    path.join(app.getPath("userData"), "preferences.json"),
    JSON.stringify(preferences),
    "utf8"
  );
}

// Add isQuitting to app
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean;
    }
  }
}

function createMenu(mainWindow: BrowserWindow) {
  const isMac = process.platform === "darwin";
  const template = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              {
                label: "Settings...",
                accelerator: "CmdOrCtrl+,",
                click: () => {
                  mainWindow.webContents.send("open-settings");
                },
              },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),

    // Edit menu (for Windows/Linux settings access)
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac
          ? []
          : [
              { type: "separator" },
              {
                label: "Settings",
                accelerator: "CmdOrCtrl+,",
                click: () => {
                  mainWindow.webContents.send("open-settings");
                },
              },
            ]),
      ],
    },

    // View menu
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Chat Sidebar",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => {
            mainWindow.webContents.send("toggle-chat-sidebar");
          },
        },
        {
          label: "Toggle Context Panel",
          accelerator: "CmdOrCtrl+Shift+C",
          click: () => {
            mainWindow.webContents.send("toggle-context-panel");
          },
        },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "toggleDevTools" },
      ],
    },

    // Window menu
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [
              { type: "separator" },
              { role: "front" },
              { type: "separator" },
              { role: "window" },
            ]
          : [{ role: "close" }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
}

async function createWindow() {
  // Load preferences first
  await loadPreferences();

  // Load stored window state if enabled
  const storedState = preferences.rememberWindowState
    ? await getStoredWindowState()
    : null;

  win = new BrowserWindow({
    title: "Vulpecula Loom",
    titleBarStyle: "hiddenInset",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    minWidth: 420,
    minHeight: 300,
    ...(storedState
      ? {
          x: storedState.x,
          y: storedState.y,
          width: storedState.width,
          height: storedState.height,
        }
      : {
          width: 900,
          height: 600,
        }),
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: !app.isPackaged,
    },
  });

  // Restore maximized state if needed
  if (storedState?.isMaximized) {
    win.maximize();
  }

  // Set up system tray if enabled
  if (preferences.minimizeToTray) {
    setupTray(win);
  }

  // Set up dock menu
  setupDockMenu(win);

  // Create menu
  createMenu(win);

  // Save window state on close
  win.on("close", (event) => {
    if (preferences.minimizeToTray && !app.isQuitting) {
      event.preventDefault();
      win?.hide();
      return;
    }

    if (preferences.rememberWindowState && !win?.isDestroyed()) {
      saveWindowState(win);
    }
  });

  if (VITE_DEV_SERVER_URL) {
    try {
      await win.loadURL(VITE_DEV_SERVER_URL);
    } catch (err) {
      console.error("Failed to load dev server:", err);
    }
    // Always open dev tools in development
    win.webContents.openDevTools();
  } else {
    try {
      await win.loadFile(indexHtml);
    } catch (err) {
      console.error("Failed to load index.html:", err);
    }
  }

  // Add error handler for webContents
  win.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error("Failed to load:", errorCode, errorDescription);
  });

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Set up IPC handlers
  setupIPCHandlers(win);
}

function setupIPCHandlers(win: BrowserWindow) {
  // Handle badge updates
  ipcMain.handle("set-badge", (_, count: number) => {
    if (process.platform === "darwin") {
      app.dock.setBadge(count ? count.toString() : "");
    }
  });

  // Handle window visibility
  ipcMain.handle("show-window", () => {
    if (win) {
      win.show();
      win.focus();
    }
  });

  // Handle preferences
  ipcMain.handle(
    "set-preference",
    async (_, key: keyof AppPreferences, value: boolean) => {
      preferences[key] = value;

      // Handle special cases
      switch (key) {
        case "minimizeToTray":
          if (value && !tray) {
            setupTray(win);
          } else if (!value && tray) {
            tray.destroy();
            tray = null;
          }
          break;

        case "rememberWindowState":
          if (!value) {
            // Clear saved window state
            try {
              await fs.unlink(
                path.join(app.getPath("userData"), "window-state.json")
              );
            } catch {}
          }
          break;
      }

      await savePreferences();
    }
  );

  // Handle quit
  ipcMain.handle("quit-app", () => {
    app.isQuitting = true;
    app.quit();
  });
}

app.whenReady().then(async () => {
  // Initialize store and set up handlers before creating window
  storeWrapper = await getStoreWrapper();
  setupObsidianHandlers();
  await createWindow();
});

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", (event, commandLine) => {
  const url = commandLine.find((arg) => arg.startsWith("vulpecula://"));
  if (url && win) {
    win.webContents.send("auth-callback", url);
  }

  // Focus on the main window
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});

// Add export dialog handler
ipcMain.handle("export-markdown", async (_, content: string) => {
  const result = await dialog.showSaveDialog({
    title: "Export Chat",
    defaultPath: `vulpecula-chat-${new Date().toISOString().split("T")[0]}.md`,
    filters: [{ name: "Markdown", extensions: ["md"] }],
    properties: ["createDirectory", "showOverwriteConfirmation"],
  });

  if (!result.canceled && result.filePath) {
    await fs.writeFile(result.filePath, content, "utf-8");
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

ipcMain.handle("show-confirm-dialog", async (_, options) => {
  const result = await dialog.showMessageBox({
    type: "warning",
    ...options,
  });
  return result;
});

// Store operations
ipcMain.handle("store-get", async (_, key: keyof StoreSchema) => {
  return storeWrapper.get(key);
});

ipcMain.handle(
  "store-set",
  async (_, key: keyof StoreSchema, value: StoreSchema[keyof StoreSchema]) => {
    storeWrapper.set(key, value);
    return true;
  }
);

ipcMain.handle("store-clear", async () => {
  storeWrapper.clear();
  return true;
});

// Setup system tray
function setupTray(win: BrowserWindow) {
  if (tray) return;

  const icon = nativeImage.createFromPath(
    path.join(process.env.VITE_PUBLIC || "", "favicon.ico")
  );

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Window",
      click: () => {
        win.show();
        win.focus();
      },
    },
    {
      label: "New Chat",
      click: () => {
        win.show();
        win.webContents.send("new-chat");
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Vulpecula Loom");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    win.show();
    win.focus();
  });
}

// Setup dock menu
function setupDockMenu(win: BrowserWindow) {
  if (process.platform === "darwin") {
    app.dock.setMenu(
      Menu.buildFromTemplate([
        {
          label: "New Chat",
          click: () => {
            win.show();
            win.webContents.send("new-chat");
          },
        },
        {
          label: "Show Window",
          click: () => {
            win.show();
            win.focus();
          },
        },
      ])
    );
  }
}

// Ensure proper cleanup
app.on("before-quit", () => {
  app.isQuitting = true;
});
