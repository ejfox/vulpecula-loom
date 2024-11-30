// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
        sm: ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
        base: ["0.875rem", { lineHeight: "1.5rem" }], // 14px
        lg: ["1rem", { lineHeight: "1.75rem" }], // 16px
        xl: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
        "2xl": ["1.25rem", { lineHeight: "2rem" }], // 20px
        "3xl": ["1.5rem", { lineHeight: "2.25rem" }], // 24px
        "4xl": ["1.875rem", { lineHeight: "2.5rem" }], // 30px
        "5xl": ["2.25rem", { lineHeight: "2.75rem" }], // 36px
        "6xl": ["3rem", { lineHeight: "3rem" }], // 48px
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": {
            "background-position": "200% 50%",
          },
          "50%": {
            "background-position": "0% 50%",
          },
        },
      },
      animation: {
        "gradient-slow": "gradient-x 15s ease infinite",
        "gradient-slower": "gradient-x 20s ease infinite",
      },
      backgroundSize: {
        "200%": "200% 100%",
      },
    },
  },
  plugins: [require("tailwind-phi")],
};
