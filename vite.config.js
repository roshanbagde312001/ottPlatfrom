import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: "/ottPlatfrom/", // ✅ IMPORTANT FIX

  plugins: [react()],
  
  resolve: {
    alias: {
      '@': '/src',
    },
  },

  server: {
    port: 3000,
    open: true
  }
})
