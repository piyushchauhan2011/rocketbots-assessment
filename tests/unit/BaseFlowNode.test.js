import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'

import BaseFlowNode from '@/features/flow/components/BaseFlowNode.vue'
import { flowCanvasKey } from '@/features/flow/lib/canvasContext'

function render(nodeType, options = {}) {
  const addNode = vi.fn()
  const moveNode = vi.fn()
  const openNode = vi.fn()
  const registerNode = vi.fn()
  const record = {
    id: 'node-1',
    parentId: 'root',
    type: nodeType === 'businessHours' ? 'dateTime' : nodeType,
    name: 'Customer greeting',
    data: nodeType === 'dateTimeConnector' ? { connectorType: 'success' } : {},
  }
  const wrapper = mount(BaseFlowNode, {
    props: {
      id: 'node-1',
      nodeType,
      selected: false,
      data: { record, summary: 'Welcome the contact', hasChildren: false },
      ...options,
    },
    global: {
      plugins: [createPinia()],
      stubs: { Handle: true },
      provide: {
        [flowCanvasKey]: { addNode, moveNode, openNode, registerNode },
      },
    },
  })
  return { addNode, moveNode, openNode, wrapper }
}

describe('BaseFlowNode', () => {
  it('opens editable nodes, requests insertion, and forwards arrow navigation', async () => {
    const { addNode, moveNode, openNode, wrapper } = render('sendMessage')
    const node = wrapper.get('.flow-node')

    await node.trigger('click')
    await node.trigger('keydown', { key: 'ArrowRight' })
    await wrapper.get('[aria-label="Add node"]').trigger('click')

    expect(openNode).toHaveBeenCalledWith('node-1')
    expect(moveNode).toHaveBeenCalledWith('node-1', 'right')
    expect(addNode).toHaveBeenCalledWith('node-1')
  })

  it('keeps trigger and connector nodes display-only while retaining navigation', async () => {
    const trigger = render('trigger')
    await trigger.wrapper.get('.flow-node').trigger('click')
    expect(trigger.openNode).not.toHaveBeenCalled()

    const connector = render('dateTimeConnector')
    const connectorButton = connector.wrapper.get('[aria-label="Customer greeting connector"]')
    await connectorButton.trigger('keydown', { key: 'ArrowDown' })

    expect(connector.moveNode).toHaveBeenCalledWith('node-1', 'down')
    expect(connector.openNode).not.toHaveBeenCalled()
    expect(connector.wrapper.find('[aria-label="Add node"]').exists()).toBe(true)
  })

  it('hides insertion on Business Hours and exposes selection state', () => {
    const { wrapper } = render('businessHours', { selected: true })

    expect(wrapper.find('[aria-label="Add node"]').exists()).toBe(false)
    expect(wrapper.get('.flow-node').attributes('aria-current')).toBe('true')
    expect(wrapper.get('.flow-node').attributes('aria-label')).toContain('Business Hours')
  })
})
