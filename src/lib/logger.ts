// Logging levels
export type LogLevel = "debug" | "info" | "warn" | "error";

// Emoji prefixes for different log types
const prefixes: Record<LogLevel, string> = {
  debug: "🔍",
  info: "📝",
  warn: "⚠️",
  error: "❌",
};

// Only show debug logs in development and if explicitly enabled
const isDev = process.env.NODE_ENV === "development";

// Whitelist of debug messages that should always be shown
const debugWhitelist = [
  "API key validated",
  "Models initialization complete",
  "OpenRouter initialization complete",
  "Chat loaded",
  "History synced",
];

const shouldLog = (level: LogLevel, message: string): boolean => {
  if (level === "debug") {
    // Always show whitelisted debug messages
    if (debugWhitelist.some((prefix) => message.startsWith(prefix))) {
      return true;
    }
    // Only show other debug messages in development
    return isDev;
  }
  return true;
};

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (shouldLog("debug", message)) {
      console.log(`${prefixes.debug} ${message}`, ...args);
    }
  },

  info: (message: string, ...args: any[]) => {
    if (shouldLog("info", message)) {
      console.log(`${prefixes.info} ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (shouldLog("warn", message)) {
      console.warn(`${prefixes.warn} ${message}`, ...args);
    }
  },

  error: (message: string, error?: any, ...args: any[]) => {
    if (shouldLog("error", message)) {
      console.error(`${prefixes.error} ${message}`, error, ...args);
    }
  },
};

export default logger;
