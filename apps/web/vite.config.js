import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const payloadProxy = {
  target: 'https://respond-io-fe-bucket.s3.ap-southeast-1.amazonaws.com',
  changeOrigin: true,
  rewrite: () => '/candidate-assessments/payload.json',
}

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { proxy: { '/api/payload': payloadProxy } },
  preview: { proxy: { '/api/payload': payloadProxy } },
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    environment: 'jsdom',
    pool: 'vmThreads',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html'],
      include: [
        'src/features/flow/lib/**/*.js',
        'src/features/nodes/api/**/*.js',
        'src/stores/**/*.js',
      ],
      thresholds: { statements: 85, lines: 85, functions: 85, branches: 80 },
    },
  },
})
