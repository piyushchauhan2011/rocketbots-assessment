import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html'],
      include: ['src/nodes/**/*.js', 'src/flow/**/*.js'],
      thresholds: { statements: 85, lines: 85, functions: 85, branches: 80 },
    },
  },
})
