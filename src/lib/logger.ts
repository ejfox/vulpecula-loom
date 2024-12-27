// Logging levels
export type LogLevel = "debug" | "info" | "warn" | "error";

// Emoji prefixes for different log types
const prefixes: Record<LogLevel, string> = {
  debug: "🔍",
  info: "📝",
  warn: "⚠️",
  error: "❌",
};

// Only show debug logs in development
const isDev = process.env.NODE_ENV === "development";

const shouldLog = (level: LogLevel): boolean => {
  if (level === "debug" && !isDev) return false;
  return true;
};

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (shouldLog("debug")) {
      console.log(`${prefixes.debug} ${message}`, ...args);
    }
  },

  info: (message: string, ...args: any[]) => {
    if (shouldLog("info")) {
      console.log(`${prefixes.info} ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (shouldLog("warn")) {
      console.warn(`${prefixes.warn} ${message}`, ...args);
    }
  },

  error: (message: string, error?: any, ...args: any[]) => {
    if (shouldLog("error")) {
      console.error(`${prefixes.error} ${message}`, error, ...args);
    }
  },
};

export default logger;
