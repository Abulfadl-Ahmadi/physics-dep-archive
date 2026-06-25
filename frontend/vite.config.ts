import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

function copyExamsJson() {
  return {
    name: 'copy-exams-json',
    closeBundle() {
      const src = path.resolve(__dirname, '../src/data/exams.json')
      const dest = path.resolve(__dirname, 'dist/exams.json')
      if (existsSync(src)) {
        mkdirSync(path.dirname(dest), { recursive: true })
        copyFileSync(src, dest)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), copyExamsJson()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
