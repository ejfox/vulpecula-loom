import { ipcMain, dialog } from "electron";
import * as fs from "fs";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import matter from "gray-matter";
import type { ObsidianFile, ObsidianSearchOptions } from "../../types";
import ElectronStore from "electron-store";

// Create store instance once and reuse
const store = new ElectronStore();

// Cache for file metadata to improve performance
const fileCache = new Map<string, ObsidianFile[]>();

// Register handlers immediately
console.log("🔄 Registering Obsidian handlers...");

// Handler for file search
ipcMain.handle(
  "search-obsidian-files",
  async (_, options: ObsidianSearchOptions) => {
    console.log("Obsidian Handler: Searching files with options:", options);
    try {
      if (!options.path) {
        console.warn("Obsidian Handler: No vault path provided");
        return [];
      }

      // Check if path exists
      if (!fs.existsSync(options.path)) {
        console.error(
          "Obsidian Handler: Vault path does not exist:",
          options.path
        );
        return [];
      }

      console.log(
        `Obsidian Handler: Searching for term: "${options.searchTerm}"`
      );
      const results = await searchObsidianFiles(options);
      console.log("Obsidian Handler: Found", results.length, "files");

      return results;
    } catch (err) {
      console.error("Obsidian Handler: Error in search-obsidian-files:", err);
      return [];
    }
  }
);

/**
 * Handler to get the Obsidian vault path from the store
 * Ensures proper error handling and logging
 */
const getVaultPathHandler = async () => {
  const pathKey = "obsidian-vault-path";

  try {
    console.log("Getting vault path from store");
    const path = store.get(pathKey);
    console.log("Retrieved vault path:", path);

    // Return the path, or empty string if not set
    return path || "";
  } catch (err) {
    console.error("Error getting vault path from store:", err);
    // Return empty string on error to avoid null/undefined issues
    return "";
  }
};

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

console.log("✅ Obsidian handlers registered");

// New diagnostic handlers
// Handler to check if a path exists
ipcMain.handle("check-path-exists", async (_, path: string) => {
  console.log("Checking if path exists:", path);
  try {
    if (!path) {
      console.log("Empty path provided, returning false");
      return false;
    }

    return fs.existsSync(path);
  } catch (err) {
    console.error("Error checking path:", err);
    return false;
  }
});

// Handler to count markdown files in a directory
ipcMain.handle("count-markdown-files", async (_, dirPath: string) => {
  console.log("🔍 Obsidian Diagnostics: Counting markdown files in:", dirPath);
  try {
    if (!dirPath) return 0;

    let count = 0;

    async function scanDirForCount(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden files and directories
        if (entry.name.startsWith(".")) continue;

        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDirForCount(fullPath);
        } else if (entry.name.endsWith(".md")) {
          count++;
        }
      }
    }

    await scanDirForCount(dirPath);
    console.log(`🔍 Obsidian Diagnostics: Found ${count} markdown files`);
    return count;
  } catch (err) {
    console.error("❌ Obsidian Diagnostics: Error counting files:", err);
    return 0;
  }
});

// Handler to refresh the Obsidian cache
ipcMain.handle("refresh-obsidian-cache", async (_, vaultPath: string) => {
  console.log("🔄 Obsidian Diagnostics: Refreshing cache for:", vaultPath);
  try {
    if (!vaultPath) {
      throw new Error("No vault path provided");
    }

    // Clear existing cache
    fileCache.delete(vaultPath);

    // Rescan files
    const files = await scanVaultFiles(vaultPath);
    fileCache.set(vaultPath, files);

    console.log(
      `✅ Obsidian Diagnostics: Cache refreshed with ${files.length} files`
    );
    return { success: true, fileCount: files.length };
  } catch (err) {
    console.error("❌ Obsidian Diagnostics: Error refreshing cache:", err);
    throw err;
  }
});

async function scanVaultFiles(vaultPath: string): Promise<ObsidianFile[]> {
  console.log(`Scanning vault files at path: ${vaultPath}`);

  // Check if path exists
  if (!fs.existsSync(vaultPath)) {
    console.error(`Cannot scan nonexistent vault path: ${vaultPath}`);
    return [];
  }

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
            } as ObsidianFile);
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
  console.log(`Scan complete. Found ${files.length} markdown files in vault.`);
  return files;
}

async function searchObsidianFiles(
  options: ObsidianSearchOptions
): Promise<ObsidianFile[]> {
  try {
    const { path: vaultPath, searchTerm } = options;
    console.log("Searching Obsidian files:", { vaultPath, searchTerm });

    // Validate inputs
    if (
      !vaultPath ||
      typeof vaultPath !== "string" ||
      !searchTerm ||
      typeof searchTerm !== "string"
    ) {
      console.log("Invalid input parameters");
      return [];
    }

    // Get or update cache
    if (!fileCache.has(vaultPath)) {
      console.log("Cache not found, scanning vault files...");
      const files = await scanVaultFiles(vaultPath);
      console.log(`Found ${files.length} files in vault`);
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

    // Filter and sort files
    const matchedFiles = files.filter((file) => {
      const searchText = `${file.title} ${file.preview || ""}`.toLowerCase();
      const matches = searchTerms.every((term) => searchText.includes(term));
      return matches;
    });

    // Sort matches
    const sortedResults = matchedFiles
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

    console.log(`Returning ${sortedResults.length} results`);
    return sortedResults;
  } catch (err) {
    console.error("Error searching Obsidian files:", err);
    return [];
  }
}

// Register all handlers
export function registerObsidianHandlers() {
  console.log("Registering Obsidian IPC handlers");

  // Register get-vault-path handler
  ipcMain.handle("get-vault-path", getVaultPathHandler);

  // Register search handler
  ipcMain.handle(
    "search-obsidian-files",
    (event, options: ObsidianSearchOptions) => {
      return searchObsidianFiles(options);
    }
  );

  // Register path check handler
  ipcMain.handle("check-path-exists", (event, path: string) => {
    return fs.existsSync(path);
  });

  // Register folder selection handler
  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result;
  });

  console.log("All Obsidian IPC handlers registered");
}

// Self-executing function to register handlers immediately
// This ensures handlers are registered even if the module is just imported
(function () {
  console.log("Auto-registering Obsidian IPC handlers");
  registerObsidianHandlers();
})();
