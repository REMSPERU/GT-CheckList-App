/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Colores personalizados que cambian automáticamente con el tema
        primary: {
          light: '#0a7ea4',
          dark: '#60a5fa',
          DEFAULT: '#0a7ea4',
        },
        secondary: {
          light: '#11181C',
          dark: '#ECEDEE',
          DEFAULT: '#11181C',
        },
        background: {
          light: '#fff',
          dark: '#151718',
          DEFAULT: '#fff',
        },
        text: {
          light: '#11181C',
          dark: '#fff',
          DEFAULT: '#11181C',
        },
        icon: {
          light: '#687076',
          dark: '#9BA1A6',
          DEFAULT: '#687076',
        },
        tabIcon: {
          default: {
            light: '#687076',
            dark: '#9BA1A6',
            DEFAULT: '#687076',
          },
          selected: {
            light: '#0a7ea4',
            dark: '#60a5fa',
            DEFAULT: '#0a7ea4',
          },
        },
      }
    },
  },
  plugins: [],
}