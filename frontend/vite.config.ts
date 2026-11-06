import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { copyFileSync, mkdirSync, existsSync, readFileSync } from 'fs'

function copyArchiveData() {
  return {
    name: 'copy-archive-data',
    configureServer(server: { middlewares: { use: (callback: (req: { url?: string; method?: string }, res: { setHeader: (key: string, value: string) => void; end: (body: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0]
        if (req.method !== 'GET' || (pathname !== '/exams.json' && pathname !== '/resources.json')) return next()
        const src = path.resolve(__dirname, '../src/data', pathname.slice(1))
        if (!existsSync(src)) return next()
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(readFileSync(src, 'utf8'))
      })
    },
    closeBundle() {
      for (const file of ['exams.json', 'resources.json']) {
        const src = path.resolve(__dirname, '../src/data', file)
        const dest = path.resolve(__dirname, 'dist', file)
        if (!existsSync(src)) {
          throw new Error(`Required archive data is missing: ${src}`)
        }
        if (file === 'resources.json') {
          const records = JSON.parse(readFileSync(src, 'utf8')) as unknown
          if (!Array.isArray(records) || !records.length) {
            throw new Error('resources.json must be a non-empty array before publishing')
          }
        }
        mkdirSync(path.dirname(dest), { recursive: true })
        copyFileSync(src, dest)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), copyArchiveData()],
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
