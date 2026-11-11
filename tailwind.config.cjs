/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#172554",
        secondary: "#2563EB",
        success: "#16A34A",
        danger: "#DC2626",
        background: "#F8FAFC",
        card: "#FFFFFF",
      },
    },
  },
  darkMode: "class",
  plugins: [],
};