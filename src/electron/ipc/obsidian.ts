import { ipcMain, dialog } from "electron";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import matter from "gray-matter";
import type { ObsidianFile, ObsidianSearchOptions } from "../../types";

// Cache for file metadata to improve performance
const fileCache = new Map<string, ObsidianFile[]>();

// Register handlers immediately
console.log("🔄 Registering Obsidian handlers...");

// Handler for file search
ipcMain.handle(
  "search-obsidian-files",
  async (_, options: ObsidianSearchOptions) => {
    console.log("📥 Obsidian Handler: Searching files with options:", options);
    try {
      if (!options.path) {
        console.warn("⚠️ Obsidian Handler: No vault path provided");
        return [];
      }

      // Add debug to verify the path exists
      const fs = require("fs");
      const pathExists = fs.existsSync(options.path);
      console.log(
        `🔍 Obsidian Handler: Path exists: ${pathExists ? "YES" : "NO"} - ${
          options.path
        }`
      );

      if (!pathExists) {
        console.error(
          "❌ Obsidian Handler: Vault path does not exist:",
          options.path
        );
        return [];
      }

      console.log(
        `🔍 Obsidian Handler: Searching for term: "${options.searchTerm}"`
      );
      const results = await searchObsidianFiles(options);
      console.log("✅ Obsidian Handler: Found", results.length, "files");

      // Log the first few results for debugging
      if (results.length > 0) {
        console.log(
          "📄 Sample results:",
          results.slice(0, 3).map((r) => ({
            title: r.title,
            path: r.path,
            preview: r.preview?.slice(0, 30),
          }))
        );
      }

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
    const store = new (require("electron-store"))();
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

console.log("✅ Obsidian handlers registered");

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
