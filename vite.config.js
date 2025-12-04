import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // CRITICAL FIX: Sets the base path for assets to relative (./) instead of absolute (/).
  // This resolves 404 errors on static hosting platforms like Vercel and Netlify.
  base: './', 

  plugins: [
    // React plugin handles JSX/Babel
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler'],
        ],
      },
    }),
    // Tailwind is a separate Vite plugin, so it goes here
    tailwindcss(),
  ],

  // CONFIGURATION for Network Access (Mobile Testing):
  // Ensures the development server binds to 0.0.0.0, allowing access via local IP.
  server: {
    host: true, 
  }
})