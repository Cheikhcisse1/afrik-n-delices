/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette tirée du camion : mur vermillon, panneau bordeaux, lettrage crème, braise dorée
        piment: { DEFAULT: "#d8401f", dark: "#b3261e", light: "#f06a3f" },
        bordeaux: { DEFAULT: "#7c1d16", dark: "#5a130f" },
        safran: { DEFAULT: "#f4a93c", light: "#ffd08a" },
        creme: { DEFAULT: "#fbf3e6", dark: "#f1e4cd" },
        charbon: { DEFAULT: "#1d1311", soft: "#2c201c", muted: "#6b5a52" },
        feuille: "#2f6b3a",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        board: ["Oswald", "Arial Narrow", "sans-serif"],
        sans: ["Work Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        ticket: "0 1px 0 rgba(29,19,17,.06), 0 12px 30px -12px rgba(29,19,17,.25)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "none" } },
        slidein: { from: { opacity: "0", transform: "translateX(24px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        rise: "rise .6s cubic-bezier(.2,.7,.2,1) both",
        slidein: "slidein .3s ease-out both",
      },
    },
  },
  plugins: [],
};
