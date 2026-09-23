import { setup } from '@storybook/vue3-vite'
import { createPinia } from 'pinia'

// oxlint-disable-next-line import/no-unassigned-import
import '../src/assets/main.css'
// oxlint-disable-next-line import/no-unassigned-import
import '@vue-flow/core/dist/style.css'
// oxlint-disable-next-line import/no-unassigned-import
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
