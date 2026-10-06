import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import FlowView from '@/views/FlowView.vue'

import payload from '../fixtures/payload.json'

async function render(path = '/') {
  localStorage.setItem('rocketbots-flow:v1', JSON.stringify(payload))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'flow', component: FlowView },
      { path: '/nodes/:nodeId', name: 'node-details', component: FlowView },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(
    { template: '<RouterView />' },
    {
      attachTo: document.body,
      global: {
        plugins: [
          createPinia(),
          [
            VueQueryPlugin,
            { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
          ],
          router,
        ],
        stubs: {
          FlowCanvas: {
            props: ['records'],
            emits: ['open-node'],
            template:
              '<button data-test="canvas" @click="$emit(\'open-node\', \'b0653a\')">{{ records.length }}</button>',
          },
        },
      },
    },
  )
  await flushPromises()
  return { wrapper, router }
}

describe('FlowView integration', () => {
  it('opens the create dialog from the Create New Node button', async () => {
    const { wrapper } = await render()
    const create = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Create New Node')

    expect(create).toBeTruthy()
    await create?.trigger('click')
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Adds after Welcome Message')
      expect(document.body.textContent).toContain('Adds this step after Welcome Message.')
    })

    await wrapper.get('#create-title').setValue('Page step')
    await wrapper.get('#create-description').setValue('Added from the page')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.get('[data-test="canvas"]').text()).toBe('8'))

    await wrapper.get('[aria-label="Undo"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.get('[data-test="canvas"]').text()).toBe('7')
      expect(document.body.textContent).not.toContain('Page step')
    })
  })

  it('restores a deleted node from the Undo button', async () => {
    const { wrapper } = await render()

    await wrapper.get('[data-test="canvas"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Delete'))
    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Delete')
      ?.trigger('click')
    const confirm = wrapper
      .get('[role="alertdialog"]')
      .findAll('button')
      .find((button) => button.text().trim() === 'Delete')
    await confirm?.trigger('click')
    await vi.waitFor(() => expect(wrapper.get('[data-test="canvas"]').text()).toBe('6'))

    await wrapper.get('[aria-label="Undo"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('[data-test="canvas"]').text()).toBe('7'))
  })

  it('renders the seven records and opens editable nodes through the route', async () => {
    const { wrapper, router } = await render()
    expect(wrapper.get('[data-test="canvas"]').text()).toBe('7')
    await wrapper.get('[data-test="canvas"]').trigger('click')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/nodes/b0653a')
      expect(document.body.textContent).toContain('Welcome Message')
    })
  })

  it('renders a direct missing route with a closable not-found state', async () => {
    await render('/nodes/missing')
    await vi.waitFor(() => expect(document.body.textContent).toContain('Node not found'))
    ;/** @type {HTMLElement} */ (document.querySelector('[aria-label="Close details"]')).click()
    await flushPromises()
    expect(document.querySelector('.sheet')).toBeNull()
  })

  it('redirects display-only connector routes', async () => {
    const { router } = await render('/nodes/161f52')
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/'))
  })
})
