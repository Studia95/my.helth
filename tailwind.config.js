/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#F6FAF8",
          green: "#23B26D",
          text: "#10231C",
          muted: "#6B7A73",
          danger: "#E5484D",
          warning: "#F59E0B",
          blue: "#2A7B9B"
        }
      },
      boxShadow: {
        soft: "0 14px 40px rgba(16, 35, 28, 0.08)",
        card: "0 10px 28px rgba(16, 35, 28, 0.06)"
      }
    }
  },
  plugins: []
};
