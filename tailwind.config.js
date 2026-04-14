/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#C85131',
          light: '#df6645',
          dark: '#a84124',
        }
      }
    },
  },
  plugins: [],
}
