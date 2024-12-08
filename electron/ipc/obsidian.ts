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
  content?: string;
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
  console.group("Obsidian Search");
  console.log("Search options:", options);

  try {
    const { path: vaultPath, searchTerm } = options;

    // Validate inputs
    if (
      !vaultPath ||
      typeof vaultPath !== "string" ||
      !searchTerm ||
      typeof searchTerm !== "string"
    ) {
      console.log("Invalid inputs:", { vaultPath, searchTerm });
      console.groupEnd();
      return [];
    }

    // Get or update cache
    if (!fileCache.has(vaultPath)) {
      console.log("Cache miss, scanning vault:", vaultPath);
      const files = await scanVaultFiles(vaultPath);
      console.log("Found files:", files.length);
      fileCache.set(vaultPath, files);
    } else {
      console.log("Using cached files for vault:", vaultPath);
    }

    const files = fileCache.get(vaultPath) || [];
    const searchTerms = searchTerm.toLowerCase().split(" ");

    const results = files
      .filter((file) => {
        const searchText = `${file.title} ${file.preview || ""}`.toLowerCase();
        return searchTerms.every((term) => searchText.includes(term));
      })
      .sort((a, b) => {
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
      .slice(0, 10);

    console.log("Search results:", results);
    console.groupEnd();
    return results;
  } catch (err) {
    console.error("Error searching Obsidian files:", err);
    console.groupEnd();
    return [];
  }
}

async function getFileContent(
  vaultPath: string,
  filePath: string
): Promise<string> {
  try {
    const fullPath = path.join(vaultPath, filePath);
    const content = await fs.readFile(fullPath, "utf-8");
    const { content: fileContent } = matter(content);
    return fileContent;
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    return "";
  }
}

export function setupObsidianHandlers() {
  // Handler for file search
  ipcMain.handle("search-obsidian-files", async (_, options: SearchOptions) => {
    console.log("Received search request:", options);
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

  // Add handler for getting file content
  ipcMain.handle(
    "get-obsidian-file-content",
    async (
      _,
      { vaultPath, filePath }: { vaultPath: string; filePath: string }
    ) => {
      try {
        console.log("Getting content for file:", { vaultPath, filePath });
        return await getFileContent(vaultPath, filePath);
      } catch (err) {
        console.error("Error in get-obsidian-file-content handler:", err);
        return null;
      }
    }
  );
}
