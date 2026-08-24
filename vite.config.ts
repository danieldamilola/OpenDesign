import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 1420,
    watch: {
      ignored: ['**/src-tauri/target/**', '**/node_modules/**'],
    },
  },
})