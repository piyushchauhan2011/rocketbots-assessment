import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

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
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'jsdom',
    pool: 'vmThreads',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html'],
      include: [
        'src/features/flow/lib/**/*.ts',
        'src/features/nodes/api/**/*.ts',
        'src/features/nodes/lib/**/*.ts',
        'src/stores/**/*.ts',
      ],
      thresholds: { statements: 85, lines: 85, functions: 85, branches: 80 },
    },
  },
})
