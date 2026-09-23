import { describe, expect, it } from 'vitest'

import { buildFlowEdges, buildFlowNodes } from '@/features/flow/lib/vueFlowGraph'

/** @typedef {import('@rocketbots/core/types').NodeRecord} NodeRecord */

/** @type {NodeRecord[]} */
const records = [
  { id: 1, parentId: -1, type: 'trigger', data: {} },
  {
    id: 'hours',
    parentId: 1,
    type: 'dateTime',
    data: { action: 'businessHours', timezone: 'UTC' },
  },
  {
    id: 'success',
    parentId: 'hours',
    type: 'dateTimeConnector',
    data: { connectorType: 'success' },
  },
]

describe('Vue Flow graph adapter', () => {
  it('creates canonical presentation nodes and edges', () => {
    expect(buildFlowEdges(records).map(({ source, target }) => [source, target])).toEqual([
      ['1', 'hours'],
      ['hours', 'success'],
    ])
    const nodes = buildFlowNodes(records, { hours: { x: 9, y: 11 } })
    expect(nodes.find((node) => node.id === 'hours')?.position).toEqual({ x: 9, y: 11 })
    expect(nodes.find((node) => node.id === 'hours')?.type).toBe('businessHours')
    expect(nodes.find((node) => node.id === 'success')?.selectable).toBe(false)
    expect(nodes.every((node) => node.draggable)).toBe(true)
  })
})
