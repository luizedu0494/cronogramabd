/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cesmac: {
          blue: '#1E7EC8',
          blueDark: '#155B93',
          blueLight: '#4FA3E3',
          green: '#00C853',
          greenDark: '#009624',
          yellow: '#F5C518',
          red: '#E53935',
        },
      },
    },
  },
  plugins: [],
}
