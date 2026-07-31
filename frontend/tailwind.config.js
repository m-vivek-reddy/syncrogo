/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        syncro: {
          blue: '#2563EB',    
          green: '#22C55E',   
          dark: '#111827',    
          white: '#FFFFFF',  
           
        }
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
}