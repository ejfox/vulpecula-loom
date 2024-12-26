import { describe, it, expect } from "vitest";

describe("File Mention Detection", () => {
  describe("extractMentions", () => {
    it("ignores @ symbols without filenames", () => {
      const text = "This @ has no filename and @@ is not valid";
      const mentions = extractMentions(text);
      expect(mentions).toEqual([]);
    });
  });
});

// Helper function to extract file mentions from text
function extractMentions(text: string): string[] {
  const mentions: string[] = [];
  // Match @filename or @'filename with spaces', must have at least one character after @
  const mentionRegex = /@(?:'([^']+)'|([a-zA-Z0-9_\-\.][^\s']*?))\b/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // match[1] is for quoted filenames, match[2] is for unquoted
    const filename = match[1] || match[2];
    if (filename) {
      mentions.push(filename);
    }
  }

  return mentions;
}
