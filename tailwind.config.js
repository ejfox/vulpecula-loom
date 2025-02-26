/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Ayu dark colors
        "ayu-dark": {
          // UI colors
          bg: "#0B0E14",
          fg: "#565B66",
          line: "#11151C",
          panel: "#0F131A",
          // Editor colors
          "editor-bg": "#0D1017",
          "editor-fg": "#BFBDB6",
          "editor-line": "#131721",
          // Syntax colors
          tag: "#39BAE6",
          func: "#FFB454",
          entity: "#59C2FF",
          string: "#AAD94C",
          regexp: "#95E6CB",
          markup: "#F07178",
          keyword: "#FF8F40",
          special: "#E6B673",
          comment: "#ACB6BF",
          constant: "#D2A6FF",
          operator: "#F29668",
          // Common colors
          accent: "#E6B450",
          error: "#D95757",
          // VCS colors
          added: "#7FD962",
          modified: "#73B8FF",
          removed: "#F26D78",
        },
        // Ayu light colors
        "ayu-light": {
          // UI colors
          bg: "#F8F9FA",
          fg: "#8A9199",
          line: "#6B7D8F",
          panel: "#F3F4F5",
          // Editor colors
          "editor-bg": "#FCFCFC",
          "editor-fg": "#5C6166",
          "editor-line": "#8A9199",
          // Syntax colors
          tag: "#55B4D4",
          func: "#F2AE49",
          entity: "#399EE6",
          string: "#86B300",
          regexp: "#4CBF99",
          markup: "#F07171",
          keyword: "#FA8D3E",
          special: "#E6BA7E",
          comment: "#787B80",
          constant: "#A37ACC",
          operator: "#ED9366",
          // Common colors
          accent: "#FFAA33",
          error: "#E65050",
          // VCS colors
          added: "#6CBF43",
          modified: "#478ACC",
          removed: "#FF7383",
        },
        // Standard colors for UI elements
        blue: {
          600: "#0051DB",
        },
        // We keep the macOS-inspired colors for native UI elements
        "macos-blue": "#0062FF",
        "macos-gray": {
          50: "#F5F5F7",
          100: "#E5E5EA",
          200: "#D1D1D6",
          300: "#C7C7CC",
          400: "#AEAEB2",
          500: "#8E8E93",
          600: "#636366",
          700: "#48484A",
          800: "#3A3A3C",
          900: "#1C1C1E",
        },
        // OLED optimization colors
        oled: {
          black: "#000000", // True black for OLED displays
          gray: {
            50: "#080808", // Almost black but with slight visibility
            100: "#121212", // Very dark gray used by many dark modes
          },
        },
        // Some standard Tailwind colors we still need for compatibility
        gray: {
          900: "#111827",
        },
      },
      // Simple native-friendly spacing
      spacing: {
        2: "0.5rem",
        3: "0.75rem",
        4: "1rem",
        5: "1.25rem",
        6: "1.5rem",
        8: "2rem",
        12: "3rem",
      },
      fontFamily: {
        // System font stack
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "San Francisco",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      // Tigher line heights like macOS
      lineHeight: {
        tight: 1.2,
        normal: 1.4,
        relaxed: 1.6,
      },
      // Rounded corners based on macOS UI
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
