import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import FlowCanvas from '@/features/flow/components/FlowCanvas.vue'
import { useFlowUiStore } from '@/stores/flowUi'

const vueFlowMocks = vi.hoisted(() => ({
  findNode: vi.fn(),
  getViewport: vi.fn(() => ({ zoom: 1 })),
  setCenter: vi.fn(),
  updateNode: vi.fn(),
}))

vi.mock('@vue-flow/core', async () => {
  const { defineComponent } = await import('vue')
  return {
    Handle: defineComponent({ name: 'Handle', template: '<span />' }),
    Position: { Bottom: 'bottom', Top: 'top' },
    VueFlow: defineComponent({
      name: 'VueFlowMock',
      props: { nodes: Array, edges: Array },
      emits: ['node-click', 'node-drag-start', 'node-drag-stop'],
      template: '<div><slot /></div>',
    }),
    useVueFlow: () => vueFlowMocks,
  }
})

/** @typedef {import('@/features/nodes/lib/types.js').NodeRecord} NodeRecord */
/** @type {NodeRecord[]} */
const records = [
  { id: 'root', parentId: -1, type: 'trigger', name: 'Trigger', data: {} },
  {
    id: 'message',
    parentId: 'root',
    type: 'sendMessage',
    name: 'Message',
    data: { payload: [{ type: 'text', text: 'Hello' }] },
  },
  {
    id: 'comment',
    parentId: 'message',
    type: 'addComment',
    name: 'Comment',
    data: { comment: 'Notify' },
  },
]

beforeAll(() => {
  vi.stubGlobal('CSS', { escape: (value) => value })
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.stubGlobal('requestAnimationFrame', (callback) => callback(0))
})
beforeEach(() => {
  vueFlowMocks.findNode.mockReset()
  vueFlowMocks.setCenter.mockReset()
  vueFlowMocks.updateNode.mockReset()
})

function render() {
  const pinia = createPinia()
  const wrapper = mount(FlowCanvas, {
    props: { records },
    global: {
      plugins: [pinia],
      stubs: { Background: true, Controls: true },
    },
  })
  return {
    flow: wrapper.findComponent({ name: 'VueFlowMock' }),
    store: useFlowUiStore(pinia),
    wrapper,
  }
}

describe('FlowCanvas', () => {
  it('exposes sorted graph data and forwards node actions', async () => {
    const { flow, store, wrapper } = render()
    const nodes = /** @type {Array<{ id: string, data: Record<string, Function> }>} */ (
      flow.props('nodes')
    )

    expect(nodes.map((node) => node.id)).toEqual(['root', 'message', 'comment'])
    expect(flow.props('edges')).toHaveLength(2)

    nodes[1].data.onOpen('message')
    nodes[1].data.onAdd('message')
    nodes[1].data.onMove('message', 'down')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('open-node')).toEqual([['message']])
    expect(wrapper.emitted('add-node')).toEqual([['message']])
    expect(store.focusedNodeId).toBe('comment')
  })

  it('opens selectable clicks but keeps connectors display-only', async () => {
    const { flow, store, wrapper } = render()

    flow.vm.$emit('node-click', {
      node: { id: 'message', selectable: true, position: { x: 0, y: 0 } },
    })
    flow.vm.$emit('node-click', {
      node: { id: 'connector', selectable: false, position: { x: 0, y: 0 } },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('open-node')).toEqual([['message']])
    expect(store.focusedNodeId).toBe('connector')
  })
})

describe('FlowCanvas movement and viewport', () => {
  it('records only completed position changes', async () => {
    const { flow, store, wrapper } = render()
    flow.vm.$emit('node-drag-start', {
      node: { id: 'message', position: { x: 10, y: 20 } },
    })
    flow.vm.$emit('node-drag-stop', {
      node: { id: 'message', position: { x: 42, y: 58 } },
    })
    await wrapper.vm.$nextTick()

    expect(store.positions.message).toEqual({ x: 42, y: 58 })
    expect(store.undoStack).toEqual([
      {
        kind: 'move',
        nodeId: 'message',
        before: { x: 10, y: 20 },
        after: { x: 42, y: 58 },
      },
    ])

    flow.vm.$emit('node-drag-start', {
      node: { id: 'comment', position: { x: 1, y: 2 } },
    })
    flow.vm.$emit('node-drag-stop', {
      node: { id: 'comment', position: { x: 1, y: 2 } },
    })
    await wrapper.vm.$nextTick()
    expect(store.undoStack).toHaveLength(1)
  })

  it('synchronizes stored positions and exposes viewport focus controls', async () => {
    const graphNode = {
      position: { x: 4, y: 8 },
      dimensions: { width: 260, height: 140 },
    }
    vueFlowMocks.findNode.mockReturnValue(graphNode)
    const { store, wrapper } = render()
    const surface =
      /** @type {{ revealNode: (id: string) => Promise<void>, focusNode: (id: string) => Promise<void> }} */ (
        /** @type {unknown} */ (wrapper.vm)
      )

    store.setPosition('message', { x: 32, y: 48 })
    await wrapper.vm.$nextTick()
    expect(vueFlowMocks.updateNode).toHaveBeenCalledWith('message', {
      position: { x: 32, y: 48 },
    })

    await surface.revealNode('message')
    expect(vueFlowMocks.setCenter).toHaveBeenCalledWith(134, 78, {
      zoom: 1,
      duration: 280,
    })

    const shell = document.createElement('div')
    shell.dataset.id = 'message'
    const target = document.createElement('button')
    target.className = 'flow-node'
    shell.append(target)
    document.body.append(shell)
    await surface.focusNode('message')
    expect(document.activeElement).toBe(target)
  })
})
