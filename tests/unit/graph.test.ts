import { describe, expect, it } from 'vitest'

import {
  buildFlowEdges,
  buildFlowNodes,
  getDescendantIds,
  getNodeSummary,
  layoutGraph,
} from '@/features/flow/lib/graph'

const canonical = [
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
  {
    id: 'message',
    parentId: 'success',
    type: 'sendMessage',
    name: 'Hello',
    data: { payload: [{ type: 'text', text: 'Welcome' }] },
  },
]

describe('graph utilities', () => {
  it('normalizes IDs and creates canonical edges', () => {
    expect(buildFlowEdges(canonical).map(({ source, target }) => [source, target])).toEqual([
      ['1', 'hours'],
      ['hours', 'success'],
      ['success', 'message'],
    ])
  })

  it('treats invalid parents and cycles as roots without hanging', () => {
    const malformed = [
      ...canonical,
      { id: 'orphan', parentId: 'missing' },
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
    ]
    const positions = layoutGraph(malformed)
    expect(Object.keys(positions)).toHaveLength(malformed.length)
    expect(buildFlowEdges(malformed)).toHaveLength(5)
  })

  it('lays out descendants below parents and applies saved positions', () => {
    const positions = layoutGraph(canonical)
    expect(positions.hours.y).toBeGreaterThan(positions['1'].y)
    const nodes = buildFlowNodes(canonical, { message: { x: 9, y: 11 } })
    expect(nodes.find((node) => node.id === 'message').position).toEqual({ x: 9, y: 11 })
    expect(nodes.find((node) => node.id === '1').draggable).toBe(false)
    expect(nodes.find((node) => node.id === 'hours').type).toBe('businessHours')
  })

  it('collects every descendant once even with a cycle', () => {
    const cyclic = [
      ...canonical,
      { id: 'loop', parentId: 'message' },
      { id: 'message', parentId: 'loop' },
    ]
    expect(new Set(getDescendantIds(cyclic, 1))).toEqual(
      new Set(['hours', 'success', 'message', 'loop']),
    )
  })

  it('derives concise summaries for every domain type', () => {
    expect(getNodeSummary(canonical[0])).toBe('Conversation opened')
    expect(getNodeSummary(canonical[3])).toBe('Welcome')
    expect(getNodeSummary({ type: 'addComment', data: { comment: 'Note' } })).toBe('Note')
    expect(getNodeSummary(canonical[1])).toBe('Business hours - UTC')
    expect(getNodeSummary(canonical[2])).toBe('success path')
    expect(getNodeSummary({ name: 'Custom', data: { description: 'Explicit' } })).toBe('Explicit')
  })
})
