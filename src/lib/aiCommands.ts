/**
 * AI XML Commands System
 *
 * This module provides utilities for working with the XML command system
 * that allows AI models to trigger app actions through structured XML tags.
 */

import logger from "./logger";

// Define all supported command tags
export const COMMAND_TAGS = {
  RENAME_CHAT: "rename-chat",
  SET_TOPIC: "set-topic",
  HIGHLIGHT: "highlight",
  SEARCH: "search",
  CREATE_THREAD: "create-thread",
} as const;

/**
 * Type for parsed XML commands
 */
export interface ParsedCommand {
  type: string;
  attributes: Record<string, string>;
}

/**
 * Result of parsing AI message content for commands
 */
export interface ParsedCommands {
  commands: ParsedCommand[];
  rename: string | null;
  originalContent: string;
}

/**
 * Parse AI responses for XML commands using DOMParser
 *
 * @param content - The AI response content to parse
 * @returns An object containing commands and the original content with commands removed
 */
export const parseModelCommands = (content: string): ParsedCommands => {
  // Initialize result object
  const result: ParsedCommands = {
    commands: [],
    rename: null,
    originalContent: content,
  };

  // Check if content contains any XML-like tags
  if (!content.includes("<") || !content.includes(">")) {
    return result;
  }

  try {
    // Wrap the content in a root element to make it valid XML
    const wrappedContent = `<commands>${content}</commands>`;

    // Use DOMParser to parse the XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(wrappedContent, "text/xml");

    // Check for parse errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      logger.debug("XML parse error in AI response", {
        error: parseError.textContent,
      });
      return result;
    }

    // Find all known command elements in the document
    let commandFound = false;
    let modifiedContent = content;

    // Process each type of command we support
    Object.values(COMMAND_TAGS).forEach((tagName) => {
      const elements = xmlDoc.getElementsByTagName(tagName);

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        commandFound = true;

        // Extract all attributes
        const attributes: Record<string, string> = {};
        for (let j = 0; j < element.attributes.length; j++) {
          const attribute = element.attributes[j];
          attributes[attribute.name] = attribute.value;
        }

        // Add to commands array
        result.commands.push({
          type: tagName,
          attributes,
        });

        // Handle specific commands
        if (tagName === COMMAND_TAGS.RENAME_CHAT && attributes.newname) {
          result.rename = attributes.newname;
        }

        // Create XML string of the command to remove from original content
        const serializer = new XMLSerializer();
        const commandString = serializer.serializeToString(element);

        // Remove the command from the content
        modifiedContent = modifiedContent.replace(commandString, "");
      }
    });

    // Only update originalContent if we found commands
    if (commandFound) {
      result.originalContent = modifiedContent.trim();
    }
  } catch (error) {
    logger.error("Error parsing XML commands", error);
  }

  return result;
};

/**
 * Generates a prompt explaining the XML command system to AI models
 * This can be added to system messages when initiating conversations
 */
export const getCommandsPrompt = (): string => {
  return `
## XML Command System

You can use XML commands in your responses to trigger actions in the application. These commands will be parsed and removed from your response before showing it to the user.

Available commands:

1. <rename-chat newname="Suggested Title" /> - Suggest a better name for the current chat
2. <set-topic topic="Topic Name" /> - Set a topic for the current chat
3. <highlight text="Important text" /> - Highlight important text for the user
4. <search query="Search query" /> - Suggest a search query
5. <create-thread name="Thread Name" /> - Suggest creating a new thread

Example usage:
<rename-chat newname="TypeScript Project Setup" />

Here's my response to your question about TypeScript configuration...

Notes:
- Commands should be used sparingly and only when they add value
- All suggested actions require user approval
- Focus on providing helpful responses first, commands second
- Invalid XML will be ignored and shown to the user as-is
`;
};

/**
 * Adds the commands prompt to a system message
 *
 * @param systemMessage - The original system message
 * @returns The system message with commands prompt appended
 */
export const addCommandsToSystemMessage = (systemMessage: string): string => {
  return `${systemMessage}\n\n${getCommandsPrompt()}`;
};

/**
 * Processes parsed commands and handles them appropriately
 *
 * @param parsedCommands - The parsed commands from an AI response
 * @param chatId - The current chat ID
 * @param eventBus - Event bus to emit events on
 */
export const processCommands = (
  parsedCommands: ParsedCommands,
  chatId: string | null,
  eventBus: any
): void => {
  // Process all identified commands
  if (parsedCommands.commands.length > 0) {
    logger.debug("AI model sent commands", {
      commands: parsedCommands.commands,
    });

    // Handle each command type
    parsedCommands.commands.forEach((command) => {
      switch (command.type) {
        case COMMAND_TAGS.RENAME_CHAT:
          if (command.attributes.newname && chatId) {
            eventBus.emit("model-rename-chat", {
              chatId,
              newName: command.attributes.newname,
            });

            eventBus.emit("notification", {
              type: "info",
              message: `The AI suggested renaming this chat to: "${command.attributes.newname}"`,
              action: "rename-chat",
              data: { chatId, newName: command.attributes.newname },
            });
          }
          break;

        case COMMAND_TAGS.SET_TOPIC:
          if (command.attributes.topic && chatId) {
            eventBus.emit("set-chat-topic", {
              chatId,
              topic: command.attributes.topic,
            });
          }
          break;

        case COMMAND_TAGS.SEARCH:
          if (command.attributes.query) {
            eventBus.emit("model-search", {
              query: command.attributes.query,
            });
          }
          break;

        case COMMAND_TAGS.CREATE_THREAD:
          if (command.attributes.name && chatId) {
            eventBus.emit("create-thread", {
              chatId,
              name: command.attributes.name,
            });
          }
          break;

        case COMMAND_TAGS.HIGHLIGHT:
          if (command.attributes.text) {
            eventBus.emit("highlight-text", {
              text: command.attributes.text,
            });
          }
          break;
      }
    });
  }

  // Fall back to the rename property for backward compatibility
  if (
    parsedCommands.rename &&
    chatId &&
    !parsedCommands.commands.some(
      (cmd) => cmd.type === COMMAND_TAGS.RENAME_CHAT
    )
  ) {
    eventBus.emit("model-rename-chat", {
      chatId,
      newName: parsedCommands.rename,
    });

    eventBus.emit("notification", {
      type: "info",
      message: `The AI suggested renaming this chat to: "${parsedCommands.rename}"`,
      action: "rename-chat",
      data: { chatId, newName: parsedCommands.rename },
    });
  }
};
