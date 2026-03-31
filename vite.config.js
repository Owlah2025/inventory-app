import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  base: '/inventory-app/', // Vital for GitHub Pages domain paths
  plugins: [
    react(),
    basicSsl()
  ],
})
