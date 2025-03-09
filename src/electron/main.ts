import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path, { join } from "path";
import { readdir, readFile, stat } from "fs/promises";
import { writeFile } from "fs/promises";
import ElectronStore from "electron-store";
import matter from "gray-matter";
import type {
  StoreSchema,
  ObsidianFile,
  ObsidianSearchOptions,
} from "../types";
import { createApplicationMenu } from "./menu";
import { registerObsidianHandlers } from "./ipc/obsidian";

// Set the app name
app.name = "Vulpecula";

// Create the store instance
const store = new ElectronStore<StoreSchema>({
  defaults: {
    "api-key": "",
    theme: "dark",
    "show-progress-bar": true,
    "show-only-pinned-models": false,
    "pinned-models": [],
    "enabled-model-ids": [],
    "recent-model-ids": [],
    "remember-window-state": true,
    "minimize-to-tray": false,
    "show-notifications": true,
    "play-sounds": true,
    "show-badge-count": true,
    "obsidian-vault-path": "",
    enabledModelIds: [],
    recentModelIds: [],
  },
});

// Cache for file metadata to improve performance
const fileCache = new Map<string, ObsidianFile[]>();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

// Set up IPC handlers
const setupIpcHandlers = () => {
  // Store handlers
  ipcMain.handle("store-get", (_event, key: keyof StoreSchema) => {
    console.log("Store Handler: Getting value for key:", key);
    try {
      const value = store.get(key);
      console.log("Store Handler: Got value for key:", key);
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      console.error(
        "Store Handler: Failed to get value for key:",
        key,
        "Error:",
        err
      );
      throw err;
    }
  });

  ipcMain.handle(
    "store-set",
    (_event, key: keyof StoreSchema, value: StoreSchema[keyof StoreSchema]) => {
      try {
        const cloneableValue = JSON.parse(JSON.stringify(value));
        store.set(key, cloneableValue);
        console.log("Store Handler: Successfully set value for key:", key);
      } catch (err) {
        console.error(
          "Store Handler: Failed to set value for key:",
          key,
          "Error:",
          err
        );
        throw err;
      }
    }
  );

  // Shell handlers
  ipcMain.handle("shell:open-external", async (_event, url: string) => {
    console.log("Shell Handler: Opening external URL:", url);
    try {
      await shell.openExternal(url);
      console.log("Shell Handler: Successfully opened URL");
    } catch (err) {
      console.error("Shell Handler: Failed to open URL:", err);
      throw err;
    }
  });

  // Obsidian handlers
  console.log("Setting up Obsidian handlers...");

  // Register all Obsidian-specific handlers from the dedicated module
  registerObsidianHandlers();

  console.log("Obsidian handlers setup complete");
};

// Obsidian file scanning and searching functions
async function scanVaultFiles(vaultPath: string): Promise<ObsidianFile[]> {
  const files: ObsidianFile[] = [];

  async function scanDir(dirPath: string) {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        // Skip hidden files and directories
        if (entry.name.startsWith(".")) continue;

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith(".md")) {
          try {
            const content = await readFile(fullPath, "utf-8");
            const { data, content: fileContent } = matter(content);
            const stats = await stat(fullPath);

            // Get first non-empty line for preview
            const preview =
              fileContent
                .split("\n")
                .map((line) => line.trim())
                .find((line) => line.length > 0) || "";

            // Ensure all values are strings
            files.push({
              title: String(data.title || entry.name.replace(".md", "")),
              path: String(join(dirPath, entry.name)),
              content: fileContent,
              lastModified: stats.mtimeMs,
              preview: preview ? String(preview.slice(0, 100)) : undefined,
              slug: String(entry.name.replace(".md", "")),
            });
          } catch (err) {
            console.error(`Error processing ${fullPath}:`, err);
          }
        }
      }
    } catch (err) {
      console.error(`Error scanning directory ${dirPath}:`, err);
    }
  }

  await scanDir(vaultPath);
  return files;
}

async function searchObsidianFiles(
  options: ObsidianSearchOptions
): Promise<ObsidianFile[]> {
  try {
    const { path: vaultPath, searchTerm } = options;

    // Validate inputs
    if (
      !vaultPath ||
      typeof vaultPath !== "string" ||
      !searchTerm ||
      typeof searchTerm !== "string"
    ) {
      return [];
    }

    // Get or update cache
    if (!fileCache.has(vaultPath)) {
      const files = await scanVaultFiles(vaultPath);
      fileCache.set(vaultPath, files);

      // Set up file watcher to invalidate cache when files change
      const watcher = require("chokidar").watch(vaultPath, {
        ignored: /(^|[\/\\])\../, // Ignore hidden files
        persistent: true,
      });

      watcher.on("change", () => fileCache.delete(vaultPath));
    }

    const files = fileCache.get(vaultPath) || [];
    const searchTerms = searchTerm.toLowerCase().split(" ");

    return files
      .filter((file) => {
        const searchText = `${file.title} ${file.preview || ""}`.toLowerCase();
        return searchTerms.every((term) => searchText.includes(term));
      })
      .sort((a, b) => {
        // Prioritize matches in title
        const aInTitle = a.title
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const bInTitle = b.title
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        if (aInTitle && !bInTitle) return -1;
        if (!aInTitle && bInTitle) return 1;
        return 0;
      })
      .slice(0, 10); // Limit results
  } catch (err) {
    console.error("Error searching Obsidian files:", err);
    return [];
  }
}

const createWindow = async (): Promise<void> => {
  console.log("🔄 Creating main window...");
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hidden",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/index.js"),
    },
  });

  console.log("✅ Main window created");

  // Load the app
  if (process.env.NODE_ENV === "development") {
    await mainWindow.loadURL("http://localhost:3000");
    // Open the DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Set up window event handlers
  mainWindow.on("focus", () => {
    mainWindow?.webContents.send("window-focus");
  });

  mainWindow.on("blur", () => {
    mainWindow?.webContents.send("window-blur");
  });
};

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  console.log("Electron app ready");

  // Set up IPC handlers first
  console.log("Setting up IPC handlers...");
  setupIpcHandlers();
  console.log("IPC handlers setup complete");

  // Then create the window
  console.log("Creating main window...");
  await createWindow();
  console.log("Main window created");

  // Create the menu after window is created
  console.log("Creating application menu...");
  createApplicationMenu(mainWindow!);
  console.log("Application menu created");
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Export mainWindow for use in other files
export { mainWindow };
