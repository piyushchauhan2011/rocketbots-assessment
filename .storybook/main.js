import path from 'node:path'

/** @type {import('@storybook/vue3-vite').StorybookConfig} */
const config = {
  stories: ['../src/**/*.stories.js'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/vue3-vite',
    options: { docgen: 'vue-component-meta' },
  },
  viteFinal(viteConfig) {
    viteConfig.resolve ||= {}
    viteConfig.build ||= {}
    viteConfig.build.chunkSizeWarningLimit = 1200
    viteConfig.resolve.alias = {
      ...viteConfig.resolve.alias,
      '@': path.resolve(import.meta.dirname, '../src'),
    }
    return viteConfig
  },
}

export default config
