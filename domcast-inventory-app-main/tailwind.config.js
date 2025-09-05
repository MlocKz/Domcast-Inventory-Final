/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',  // <--- add this line
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
       fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
