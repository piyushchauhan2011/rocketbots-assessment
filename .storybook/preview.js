import { setup } from '@storybook/vue3-vite'
import { createPinia } from 'pinia'

import '../src/assets/main.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

setup((app) => {
  app.use(createPinia())
})

/** @type {import('@storybook/vue3-vite').Preview} */
const preview = {
  tags: ['autodocs'],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
    },
  },
}

export default preview
