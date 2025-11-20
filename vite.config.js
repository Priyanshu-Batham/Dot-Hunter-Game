import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
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
})