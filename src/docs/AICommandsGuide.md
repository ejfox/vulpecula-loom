# AI XML Commands Guide

This guide describes the XML command system for AI models integrated with Vulpecula. When responding to user queries, you can include special XML commands that will be parsed by the application and used to trigger actions without displaying the commands to the user.

## Command Format

Commands use XML syntax and should be included directly in your response. The application will parse these commands and remove them from the displayed text.

## Available Commands

### `<rename-chat>`

Suggests a new name for the current chat.

**Attributes:**
- `newname` (required): The suggested new name for the chat

**Example:**
```
<rename-chat newname="TypeScript Project Setup Discussion" />

Based on our conversation, I think we should focus first on setting up the tsconfig.json file...
```

### `<set-topic>`

Sets a topic for the current chat.

**Attributes:**
- `topic` (required): The topic to set for the chat

**Example:**
```
<set-topic topic="Web Development" />

Let's continue our discussion about React components...
```

### `<highlight>`

Highlights specific text in the chat that's important.

**Attributes:**
- `text` (required): The text to highlight

**Example:**
```
<highlight text="npm install @types/react" />

Make sure you install the type definitions for React by running the command I highlighted above.
```

### `<search>`

Suggests a search query for the user.

**Attributes:**
- `query` (required): The search query

**Example:**
```
<search query="TypeScript interface vs type" />

You might want to learn more about the differences between interfaces and types in TypeScript.
```

### `<create-thread>`

Suggests creating a new thread based on the current conversation.

**Attributes:**
- `name` (required): The name for the new thread

**Example:**
```
<create-thread name="React Performance Optimization" />

I think this topic on React performance deserves its own thread for better organization.
```

## Best Practices

1. **Be Subtle**: Use commands to enhance the user experience, not to control it
2. **Natural Context**: Commands should fit naturally in the conversation context
3. **User Approval**: Remember that suggested actions (like renaming) require user approval
4. **Minimize Usage**: Use commands sparingly and only when they add value
5. **Content First**: Focus on providing great content first, commands second

## Implementation Notes

- Commands are parsed using a DOMParser and removed from the displayed response
- Multiple commands can be included in a single response
- Invalid XML will be ignored and displayed as-is
- Commands should be used to enhance UX, not to replace normal interaction

---

*This document is for AI models integrated with Vulpecula. Users won't see these commands in the interface.* 