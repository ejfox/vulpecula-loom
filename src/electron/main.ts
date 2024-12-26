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
    console.log("📥 Store Handler: Getting value for key:", key);
    try {
      const value = store.get(key);
      console.log("✅ Store Handler: Got value for key:", key, "Value:", value);
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      console.error(
        "❌ Store Handler: Failed to get value for key:",
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
      console.log(
        "📤 Store Handler: Setting value for key:",
        key,
        "Value:",
        value
      );
      try {
        const cloneableValue = JSON.parse(JSON.stringify(value));
        store.set(key, cloneableValue);
        console.log("✅ Store Handler: Successfully set value for key:", key);
      } catch (err) {
        console.error(
          "❌ Store Handler: Failed to set value for key:",
          key,
          "Error:",
          err
        );
        throw err;
      }
    }
  );

  // Obsidian handlers
  console.log("🔄 Setting up Obsidian handlers...");

  // Handler for file search
  ipcMain.handle(
    "search-obsidian-files",
    async (_, options: ObsidianSearchOptions) => {
      console.log(
        "��� Obsidian Handler: Searching files with options:",
        options
      );
      try {
        if (!options.path) {
          console.warn("⚠️ Obsidian Handler: No vault path provided");
          return [];
        }
        const results = await searchObsidianFiles(options);
        console.log("✅ Obsidian Handler: Found", results.length, "files");
        return results;
      } catch (err) {
        console.error(
          "❌ Obsidian Handler: Error in search-obsidian-files:",
          err
        );
        return [];
      }
    }
  );

  // Handler for getting vault path
  ipcMain.handle("get-vault-path", async () => {
    console.log("📂 Obsidian Handler: Getting vault path");
    try {
      const vaultPath = store.get("obsidian-vault-path");
      console.log("✅ Obsidian Handler: Got vault path:", vaultPath);
      return vaultPath;
    } catch (err) {
      console.error("❌ Obsidian Handler: Error getting vault path:", err);
      throw err;
    }
  });

  // Handler for folder selection
  ipcMain.handle("select-folder", async () => {
    console.log("📂 Obsidian Handler: Opening folder selection dialog");
    return dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Obsidian Vault",
      buttonLabel: "Select Vault Folder",
    });
  });

  // Handler for getting file content
  ipcMain.handle(
    "get-obsidian-file-content",
    async (
      _,
      { vaultPath, filePath }: { vaultPath: string; filePath: string }
    ) => {
      console.log("📄 Obsidian Handler: Getting file content:", {
        vaultPath,
        filePath,
      });
      try {
        const content = await readFile(filePath, "utf-8");
        console.log("✅ Obsidian Handler: Got file content");
        return { content };
      } catch (err) {
        console.error("❌ Obsidian Handler: Error getting file content:", err);
        throw err;
      }
    }
  );

  console.log("✅ Obsidian handlers setup complete");
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

const createWindow = (): void => {
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
      sandbox: false,
      preload: path.join(__dirname, "../preload/index.js"),
    },
  });

  console.log("✅ Main window created");

  // Load the app
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    // Open the DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../index.html"));
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
  console.log("🚀 Electron app ready");

  // Set up IPC handlers first
  console.log("🔄 Setting up IPC handlers...");
  setupIpcHandlers();
  console.log("✅ IPC handlers setup complete");

  // Verify handlers are registered
  console.log("🔍 Verifying IPC handlers...");
  const channels = ipcMain.eventNames();
  console.log("📝 Registered IPC channels:", channels);

  // Then create the window
  console.log("🔄 Creating main window...");
  createWindow();
  console.log("✅ Main window created");
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
