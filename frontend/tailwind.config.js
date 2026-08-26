/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        command: {
          bg: "#0b1120",      // deep navy background
          panel: "#111a2e",   // card/panel background
          border: "#1e2a45",
        },
      },
    },
  },
  plugins: [],
};
