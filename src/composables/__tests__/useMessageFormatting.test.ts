import { describe, it, expect } from "vitest";

describe("Message Formatting", () => {
  describe("formatCodeBlocks", () => {
    it("wraps code in proper markdown blocks", () => {
      const code = "function test() { return true; }";
      const formatted = formatCodeBlock(code, "typescript");
      expect(formatted).toBe(
        "```typescript\nfunction test() { return true; }\n```"
      );
    });

    it("handles multi-line code", () => {
      const code = `const x = 1;
const y = 2;
console.log(x + y);`;
      const formatted = formatCodeBlock(code);
      expect(formatted).toBe(
        "```\nconst x = 1;\nconst y = 2;\nconsole.log(x + y);\n```"
      );
    });
  });

  describe("truncateMessage", () => {
    it("preserves messages shorter than limit", () => {
      const shortMessage = "Short message";
      const truncated = truncateMessage(shortMessage, 20);
      expect(truncated).toBe("Short message");
    });
  });
});

// Helper functions for message formatting
function formatCodeBlock(code: string, language?: string): string {
  return `\`\`\`${language || ""}\n${code}\n\`\`\``;
}

function truncateMessage(message: string, limit: number): string {
  if (message.length <= limit) return message;

  // Find the last space before the limit
  const truncated = message.slice(0, limit - 3);
  const lastSpace = truncated.lastIndexOf(" ");

  // Check if we're in the middle of a code block
  const codeBlockCount = (truncated.match(/```/g) || []).length;
  const isInCodeBlock = codeBlockCount > 0 && codeBlockCount % 2 !== 0;

  if (isInCodeBlock) {
    return truncated + "...";
  }

  // If we found a space, break at word boundary
  if (lastSpace > 0 && lastSpace > limit - 20) {
    return message.slice(0, lastSpace) + "...";
  }

  return truncated + "...";
}
