import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { router } from './router'

// oxlint-disable-next-line import/no-unassigned-import
import './assets/main.css'
// oxlint-disable-next-line import/no-unassigned-import
import 'vue-sonner/style.css'
// oxlint-disable-next-line import/no-unassigned-import
import '@vue-flow/core/dist/style.css'
// oxlint-disable-next-line import/no-unassigned-import
import '@vue-flow/core/dist/theme-default.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        networkMode: 'always',
        staleTime: Infinity,
        gcTime: 60 * 60 * 1000,
      },
    },
  },
})
app.mount('#app')
