
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./haleel_design/**/*.html",
    "./haleel_design/**/*.js",
    "./haleel_design/**/*.py",
    "./templates/**/*.html",
    "./www/**/*.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        haleel: {
          50: "#EFFCFB",
          100: "#D2F7F3",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          900: "#134E4A",
        },
      },
    },
  },
  plugins: [],
};
