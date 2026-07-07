/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B1F3B",
          50: "#EEF1F6",
          100: "#D6DDE9",
          400: "#4A5D7E",
          600: "#1C2B48",
          900: "#0B1F3B",
        },
        gold: {
          DEFAULT: "#C9A227",
          100: "#F3E9C9",
          300: "#DDBB55",
          600: "#A9820F",
        },
        parchment: "#FAF7F1",
        hairline: "#E4DFD3",
        slate: {
          500: "#6B7280",
        },
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        body: ["'Public Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};
