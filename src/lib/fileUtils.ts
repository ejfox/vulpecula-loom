/**
 * Maps language IDs to file extensions
 */
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  python: "py",
  ruby: "rb",
  java: "java",
  cpp: "cpp",
  "c++": "cpp",
  csharp: "cs",
  php: "php",
  swift: "swift",
  go: "go",
  rust: "rs",
  html: "html",
  css: "css",
  json: "json",
  yaml: "yml",
  markdown: "md",
  sql: "sql",
  shell: "sh",
  bash: "sh",
  // Add more as needed
};

/**
 * Generates a suggested filename for a code block
 * @param language The language ID from the code block
 * @param prefix Optional prefix for the filename
 * @param timestamp Optional timestamp to make filename unique
 */
export function getSuggestedFilename(
  language: string | undefined,
  prefix = "ChatExport",
  timestamp = new Date().getTime()
): string {
  // Default to txt if language is undefined or not mapped
  const extension = language
    ? LANGUAGE_EXTENSIONS[language.toLowerCase()] || "txt"
    : "txt";

  // Clean the prefix to be filesystem-friendly
  const cleanPrefix = prefix.replace(/[^a-z0-9]/gi, "-");

  return `${cleanPrefix}-${timestamp}.${extension}`;
}
