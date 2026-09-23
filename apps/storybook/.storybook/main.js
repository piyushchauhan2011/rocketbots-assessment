import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default {
  stories: ['../stories/**/*.stories.js'],
  framework: { name: '@storybook/vue3-vite', options: {} },
  async viteFinal(config) {
    config.plugins.push(vue(), tailwindcss())
    return config
  },
}
