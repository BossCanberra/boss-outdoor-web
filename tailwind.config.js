/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/HomeScreen.jsx",            // 👈 Explicitly point to the file you are editing
    "./src/**/*.{js,ts,jsx,tsx}",      // Scans everything inside src
    "./*.{js,ts,jsx,tsx}"              // Scans everything in root
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}