import { describe, it, expect } from "vitest";
import type { IncludedFile } from "../../types";

describe("File Content Embedding", () => {
  describe("formatMessageWithFileContents", () => {
    it("correctly formats a single file mention", () => {
      const mockFile: IncludedFile = {
        title: "test.ts",
        path: "/test.ts",
        content: "function test() { return true; }",
      };

      const userMessage = "Can you explain what @test.ts does?";
      const expectedContent =
        "Can you explain what @test.ts\n\nContent of test.ts:\n```\nfunction test() { return true; }\n```\n\n does?";

      const formattedMessage = formatMessageWithFileContents(userMessage, [
        mockFile,
      ]);
      expect(formattedMessage).toBe(expectedContent);
    });

    it("correctly formats multiple file mentions in order", () => {
      const mockFiles: IncludedFile[] = [
        {
          title: "config.ts",
          path: "/config.ts",
          content: "export const config = { port: 3000 }",
        },
        {
          title: "server.ts",
          path: "/server.ts",
          content: 'import express from "express"',
        },
      ];

      const userMessage =
        "Look at @config.ts and @server.ts - how are they related?";
      const expectedContent = userMessage
        .replace(
          "@config.ts",
          "@config.ts\n\nContent of config.ts:\n```\nexport const config = { port: 3000 }\n```\n\n"
        )
        .replace(
          "@server.ts",
          '@server.ts\n\nContent of server.ts:\n```\nimport express from "express"\n```\n\n'
        );

      const formattedMessage = formatMessageWithFileContents(
        userMessage,
        mockFiles
      );
      expect(formattedMessage).toBe(expectedContent);
    });
  });
});

// Helper function to test file content embedding logic
function formatMessageWithFileContents(
  message: string,
  files: IncludedFile[]
): string {
  let formattedMessage = message;

  for (const file of files) {
    const mentionPattern = new RegExp(`@${file.title}\\b`);
    formattedMessage = formattedMessage.replace(
      mentionPattern,
      `@${file.title}\n\nContent of ${file.title}:\n\`\`\`\n${file.content}\n\`\`\`\n\n`
    );
  }

  return formattedMessage;
}
