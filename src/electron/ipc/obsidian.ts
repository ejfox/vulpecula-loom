import { ipcMain, dialog } from "electron";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

interface SearchOptions {
  path: string;
  searchTerm: string;
}

interface ObsidianFile {
  title: string;
  path: string;
  slug: string;
  preview?: string;
}

// Cache for file metadata to improve performance
const fileCache = new Map<string, ObsidianFile[]>();

async function scanVaultFiles(vaultPath: string): Promise<ObsidianFile[]> {
  const files: ObsidianFile[] = [];

  async function scanDir(dirPath: string) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Skip hidden files and directories
        if (entry.name.startsWith(".")) continue;

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith(".md")) {
          try {
            const content = await fs.readFile(fullPath, "utf-8");
            const { data, content: fileContent } = matter(content);

            // Get first non-empty line for preview
            const preview =
              fileContent
                .split("\n")
                .map((line) => line.trim())
                .find((line) => line.length > 0) || "";

            // Ensure all values are strings
            files.push({
              title: String(data.title || entry.name.replace(".md", "")),
              path: String(path.relative(vaultPath, fullPath)),
              slug: String(entry.name.replace(".md", "")),
              preview: preview ? String(preview.slice(0, 100)) : undefined,
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
  options: SearchOptions
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
      .slice(0, 10) // Limit results
      .map((file) => ({
        // Ensure all values are serializable
        title: String(file.title),
        path: String(file.path),
        slug: String(file.slug),
        preview: file.preview ? String(file.preview) : undefined,
      }));
  } catch (err) {
    console.error("Error searching Obsidian files:", err);
    return [];
  }
}

export function setupObsidianHandlers() {
  // Handler for file search
  ipcMain.handle("search-obsidian-files", async (_, options: SearchOptions) => {
    try {
      return await searchObsidianFiles(options);
    } catch (err) {
      console.error("Error in search-obsidian-files handler:", err);
      return [];
    }
  });

  // Handler for folder selection
  ipcMain.handle("select-folder", async () => {
    return dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Obsidian Vault",
      buttonLabel: "Select Vault Folder",
    });
  });
}
