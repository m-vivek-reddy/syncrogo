/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        syncro: {
          blue: "#2563EB",
          green: "#22C55E",
          dark: "#111827",
          white: "#FFFFFF",
          light: "#F8FAFC",
          gray: "#64748B",
          red: "#EF4444",
          yellow: "#F59E0B",
          purple: "#8B5CF6",
        },
      },

      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },

      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },

      boxShadow: {
        card: "0 10px 25px rgba(0,0,0,0.08)",
        hover: "0 20px 40px rgba(0,0,0,0.12)",
      },

      animation: {
        fade: "fadeIn 0.4s ease-in-out",
        float: "float 3s ease-in-out infinite",
      },

      keyframes: {
        fadeIn: {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        float: {
          "0%,100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-6px)",
          },
        },
      },
    },
  },

  plugins: [],
};