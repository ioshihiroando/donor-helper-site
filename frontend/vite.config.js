import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' — чтобы сборка открывалась на GitHub Pages из любой подпапки
export default defineConfig({
  plugins: [react()],
  base: './',
})
