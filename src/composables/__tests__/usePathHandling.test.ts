import { describe, it, expect } from "vitest";

describe("Path Handling", () => {
  describe("normalizePath", () => {
    it("converts Windows paths to Unix style", () => {
      const winPath = "C:\\Users\\me\\Documents\\file.txt";
      expect(normalizePath(winPath)).toBe("C:/Users/me/Documents/file.txt");
    });

    it("handles paths with mixed separators", () => {
      const mixedPath = "path/to\\some/file\\here.txt";
      expect(normalizePath(mixedPath)).toBe("path/to/some/file/here.txt");
    });

    it("removes trailing slashes", () => {
      const pathWithTrailing = "/path/to/dir/";
      expect(normalizePath(pathWithTrailing)).toBe("/path/to/dir");
    });
  });

  describe("getRelativePath", () => {
    it("creates relative path from absolute paths", () => {
      const basePath = "/Users/me/project";
      const fullPath = "/Users/me/project/src/file.ts";
      expect(getRelativePath(fullPath, basePath)).toBe("src/file.ts");
    });

    it("handles same directory paths", () => {
      const basePath = "/Users/me/project";
      const fullPath = "/Users/me/project/file.ts";
      expect(getRelativePath(fullPath, basePath)).toBe("file.ts");
    });

    it("handles parent directory paths", () => {
      const basePath = "/Users/me/project/src";
      const fullPath = "/Users/me/project/test/file.ts";
      expect(getRelativePath(fullPath, basePath)).toBe("../test/file.ts");
    });
  });
});

// Helper functions for path handling
function normalizePath(path: string): string {
  // Convert Windows separators to Unix and remove trailing slashes
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}

function getRelativePath(fullPath: string, basePath: string): string {
  const normalizedFull = normalizePath(fullPath);
  const normalizedBase = normalizePath(basePath);

  if (normalizedFull.startsWith(normalizedBase)) {
    const relativePath = normalizedFull.slice(normalizedBase.length);
    return relativePath.replace(/^\//, "");
  }

  // Simple parent directory handling
  const fullParts = normalizedFull.split("/");
  const baseParts = normalizedBase.split("/");
  let commonParts = 0;

  while (
    commonParts < fullParts.length &&
    commonParts < baseParts.length &&
    fullParts[commonParts] === baseParts[commonParts]
  ) {
    commonParts++;
  }

  const upDirs = baseParts.length - commonParts;
  const downPath = fullParts.slice(commonParts).join("/");

  return "../".repeat(upDirs) + downPath;
}
