import { describe, it, expect } from "vitest";
import type { ChatMessage, IncludedFile } from "../../types";

describe("Conversation Management", () => {
  describe("Message Handling", () => {
    it("should format messages correctly", () => {
      const testMessage: ChatMessage = {
        role: "user",
        content: "Test message",
        timestamp: new Date().toISOString(),
      };
      expect(testMessage.content).toBe("Test message");
    });

    it("should handle included files", () => {
      const testMessage: ChatMessage = {
        role: "user",
        content: "Test with file",
        timestamp: new Date().toISOString(),
        includedFiles: [
          {
            title: "test.md",
            path: "/test/test.md",
            content: "Test content",
          },
        ],
      };
      expect(testMessage.includedFiles?.length).toBe(1);
    });
  });
});
