import { ipcMain, dialog } from "electron";
import { promises as fs } from "fs";
import path from "path";

export function setupObsidianHandlers() {
  // Handler for file search
  ipcMain.handle(
    "search-obsidian-files",
    async (_event, options: { vaultPath: string; query: string }) => {
      try {
        const { vaultPath, query } = options;
        console.log("Searching Obsidian files:", { vaultPath, query });

        // Verify vault path exists
        const vaultStats = await fs.stat(vaultPath);
        if (!vaultStats.isDirectory()) {
          throw new Error("Invalid vault path");
        }

        // Recursive function to search files
        async function searchDirectory(dirPath: string): Promise<any[]> {
          const files = await fs.readdir(dirPath);
          const results = [];

          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
              // Skip .git and other hidden directories
              if (!file.startsWith(".")) {
                results.push(...(await searchDirectory(filePath)));
              }
            } else if (file.endsWith(".md")) {
              const content = await fs.readFile(filePath, "utf-8");
              if (content.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                  title: path.basename(file, ".md"),
                  path: filePath,
                  slug: file,
                  preview: content.slice(0, 200), // First 200 chars as preview
                });
              }
            }
          }

          return results;
        }

        const searchResults = await searchDirectory(vaultPath);
        console.log(`Found ${searchResults.length} matching files`);
        return searchResults;
      } catch (error) {
        console.error("Error searching Obsidian files:", error);
        throw error;
      }
    }
  );

  // Handler for folder selection
  ipcMain.handle("select-folder", async () => {
    return dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Obsidian Vault",
      buttonLabel: "Select Vault Folder",
    });
  });
}
