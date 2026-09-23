import { flushPromises, mount } from '@vue/test-utils'
import { err, ok } from 'neverthrow'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import NodeDetailsSheet from '@/features/node-details/components/NodeDetailsSheet.vue'
import { useFlowUiStore } from '@/stores/flowUi'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/features/nodes/composables/useNodes', () => ({
  useReplaceNodesMutation: () => ({ isPending: { value: false }, mutateResult: mocks.replace }),
  useUpdateNodeMutation: () => ({ isPending: { value: false }, mutateResult: mocks.update }),
}))
vi.mock('vue-sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}))

/** @typedef {import('@/features/nodes/lib/types.js').NodeRecord} NodeRecord */

/** @type {NodeRecord[]} */
const messageRecords = [
  { id: 'root', parentId: -1, type: 'trigger', name: 'Trigger', data: {} },
  {
    id: 'message',
    parentId: 'root',
    type: 'sendMessage',
    name: 'Welcome',
    data: {
      description: 'Initial greeting',
      payload: [{ type: 'text', text: 'Hello' }],
    },
  },
]
/** @type {import('@vue/test-utils').VueWrapper | undefined} */
let mountedWrapper

beforeEach(() => {
  mocks.replace.mockReset().mockResolvedValue(ok([]))
  mocks.update.mockReset().mockResolvedValue(ok([]))
  mocks.toastError.mockReset()
  mocks.toastSuccess.mockReset()
})
afterEach(() => mountedWrapper?.unmount())

/** @param {NodeRecord[]} records @param {string} nodeId */
async function render(records, nodeId) {
  const Host = {
    components: { NodeDetailsSheet },
    setup: () => ({ records }),
    template: '<NodeDetailsSheet :records="records" />',
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'flow', component: Host },
      { path: '/nodes/:nodeId', name: 'node-details', component: Host },
    ],
  })
  await router.push(`/nodes/${nodeId}`)
  await router.isReady()
  const pinia = createPinia()
  const wrapper = mount(
    { template: '<RouterView />' },
    {
      attachTo: document.body,
      global: { plugins: [pinia, router] },
    },
  )
  mountedWrapper = wrapper
  await flushPromises()
  return { router, store: useFlowUiStore(pinia), wrapper }
}

/** @param {import('@vue/test-utils').VueWrapper} wrapper @param {string} label */
function button(wrapper, label) {
  const match = wrapper.findAll('button').find((item) => item.text().trim() === label)
  if (!match) throw new Error(`Missing ${label} button`)
  return match
}

describe('NodeDetailsSheet', () => {
  it('trims and saves a valid draft while recording undo history', async () => {
    const { store, wrapper } = await render(messageRecords, 'message')

    await wrapper.get('#node-title').setValue('  Updated welcome  ')
    await wrapper.get('#node-description').setValue('  Updated greeting  ')
    await button(wrapper, 'Save changes').trigger('click')
    await flushPromises()

    expect(mocks.update).toHaveBeenCalledWith({
      ...messageRecords[1],
      name: 'Updated welcome',
      data: {
        description: 'Updated greeting',
        payload: [{ type: 'text', text: 'Hello' }],
      },
    })
    expect(store.undoStack).toEqual([
      {
        kind: 'update',
        nodeId: 'message',
        beforeRecord: messageRecords[1],
        afterRecord: expect.objectContaining({ name: 'Updated welcome' }),
      },
    ])
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Node saved')
  })

  it('keeps failed saves out of history and reports the repository error', async () => {
    mocks.update.mockResolvedValue(err({ type: 'storage', message: 'Storage is full' }))
    const { store, wrapper } = await render(messageRecords, 'message')
    await wrapper.get('#node-title').setValue('Changed title')

    await button(wrapper, 'Save changes').trigger('click')
    await flushPromises()

    expect(store.undoStack).toEqual([])
    expect(mocks.toastError).toHaveBeenCalledWith('Storage is full')
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it('blocks invalid drafts and exposes field errors', async () => {
    const { wrapper } = await render(messageRecords, 'message')

    await wrapper.get('#node-title').setValue('   ')
    expect(wrapper.get('#node-title-error').text()).toBe('Title is required')
    expect(button(wrapper, 'Save changes').attributes('disabled')).toBeDefined()
    await button(wrapper, 'Save changes').trigger('click')
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('NodeDetailsSheet navigation', () => {
  it('requires confirmation before abandoning dirty edits', async () => {
    const { router, wrapper } = await render(messageRecords, 'message')

    await wrapper.get('#node-title').setValue('Changed')
    await wrapper.get('[aria-label="Close details"]').trigger('click')
    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Discard unsaved changes?')

    await button(wrapper, 'Keep editing').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(router.currentRoute.value.fullPath).toBe('/nodes/message')

    await wrapper.get('[aria-label="Close details"]').trigger('click')
    await button(wrapper, 'Discard changes').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })
})

describe('NodeDetailsSheet deletion', () => {
  it('deletes Business Hours connectors and reconnects their children', async () => {
    /** @type {NodeRecord[]} */
    const records = [
      { id: 'root', parentId: -1, type: 'trigger', name: 'Trigger', data: {} },
      {
        id: 'hours',
        parentId: 'root',
        type: 'dateTime',
        name: 'Office hours',
        data: { description: 'Route by schedule', timezone: 'UTC', times: [] },
      },
      {
        id: 'success',
        parentId: 'hours',
        type: 'dateTimeConnector',
        name: 'Success',
        data: { connectorType: 'success' },
      },
      {
        id: 'failure',
        parentId: 'hours',
        type: 'dateTimeConnector',
        name: 'Failure',
        data: { connectorType: 'failure' },
      },
      {
        id: 'child',
        parentId: 'success',
        type: 'addComment',
        name: 'Notify team',
        data: { comment: 'Notify', description: 'Notify' },
      },
    ]
    const { router, wrapper } = await render(records, 'hours')

    await button(wrapper, 'Delete').trigger('click')
    expect(wrapper.get('[role="alertdialog"]').text()).toContain(
      'Success and Failure are removed with this step',
    )
    await wrapper.get('[role="alertdialog"] button:last-child').trigger('click')
    await flushPromises()

    expect(mocks.replace).toHaveBeenCalledWith([records[0], { ...records[4], parentId: 'root' }])
    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Office hours deleted')
  })
})
