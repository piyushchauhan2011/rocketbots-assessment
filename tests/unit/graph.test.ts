import { describe, expect, it } from 'vitest'

import {
  buildFlowEdges,
  buildFlowNodes,
  getDescendantIds,
  getNodeSummary,
  layoutGraph,
  missingLayoutPositions,
  nextNodeId,
  positionsForAddedNodes,
  removeNode,
  spliceNodes,
  X_GAP,
  Y_GAP,
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
    expect(nodes.find((node) => node.id === '1').draggable).toBe(true)
    expect(nodes.find((node) => node.id === 'success').draggable).toBe(true)
    expect(nodes.find((node) => node.id === 'success').selectable).toBe(false)
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

describe('nextNodeId', () => {
  const branched = [
    ...canonical,
    {
      id: 'failure',
      parentId: 'hours',
      type: 'dateTimeConnector',
      data: { connectorType: 'failure' },
    },
  ]

  it('walks parent, child, and sibling relationships', () => {
    expect(nextNodeId(branched, null, 'down')).toBe('1')
    expect(nextNodeId(branched, '1', 'down')).toBe('hours')
    expect(nextNodeId(branched, 'hours', 'down')).toBe('success')
    expect(nextNodeId(branched, 'success', 'right')).toBe('failure')
    expect(nextNodeId(branched, 'failure', 'left')).toBe('success')
    expect(nextNodeId(branched, 'message', 'up')).toBe('success')
    expect(nextNodeId(branched, '1', 'up')).toBeNull()
  })
})

describe('removeNode', () => {
  it('reconnects the child to the deleted step parent', () => {
    const withMid = spliceNodes(canonical, 'success', [
      { id: 'mid', parentId: 'success', type: 'sendMessage', name: 'good good', data: {} },
    ])
    const next = removeNode(withMid, 'mid')
    expect(next.removedIds).toEqual(['mid'])
    expect(next.records.find((node) => node.id === 'message')?.parentId).toBe('success')
    expect(next.records.some((node) => node.id === 'mid')).toBe(false)
  })

  it('drops business hours connectors and lifts both branches', () => {
    const next = removeNode(canonical, 'hours')
    expect(next.removedIds).toEqual(['hours', 'success'])
    expect(next.records.map((node) => node.id)).toEqual([1, 'message'])
    expect(next.records.find((node) => node.id === 'message')?.parentId).toBe(1)
  })
})

describe('positionsForAddedNodes', () => {
  it('fills only missing layout positions', () => {
    const layout = layoutGraph(canonical)
    const missing = missingLayoutPositions(canonical, { message: { x: 9, y: 11 } })
    expect(missing.message).toBeUndefined()
    expect(missing['1']).toEqual(layout['1'])
  })

  it('places a new node from its parent and leaves saved nodes alone', () => {
    const saved = layoutGraph(canonical)
    const records = [
      ...canonical,
      { id: 'note', parentId: 'success', type: 'addComment', name: 'Note', data: {} },
    ]
    const added = positionsForAddedNodes(records, saved)
    expect(Object.keys(added)).toEqual(['note'])
    expect(added.note.y).toBe(saved.message.y)
    expect(added.note.x).not.toBe(saved.message.x)
  })

  it('shifts a new node aside when its slot is already taken', () => {
    const records = [
      { id: '1', parentId: -1, type: 'trigger', data: {} },
      { id: 'inserted', parentId: '1', type: 'addComment', data: {} },
      { id: 'child', parentId: 'inserted', type: 'sendMessage', data: {} },
    ]
    const added = positionsForAddedNodes(records, {
      1: { x: 0, y: 0 },
      child: { x: 0, y: Y_GAP },
    })
    expect(added.inserted).toEqual({ x: X_GAP, y: Y_GAP })
    expect(added.child).toBeUndefined()
  })
})

describe('spliceNodes', () => {
  it('splices a step between a parent and its current child', () => {
    const created = [{ id: 'mid', parentId: 1, type: 'sendMessage', name: 'Mid', data: {} }]
    const next = spliceNodes(canonical, '1', created)
    expect(next.find((node) => node.id === 'hours').parentId).toBe('mid')
    expect(next.find((node) => node.id === 'mid').parentId).toBe(1)
  })

  it('keeps the previous branch on the success path of inserted hours', () => {
    const created = [
      { id: 'hours2', parentId: 1, type: 'dateTime', data: {} },
      { id: 'ok', parentId: 'hours2', type: 'dateTimeConnector', data: {} },
      { id: 'no', parentId: 'hours2', type: 'dateTimeConnector', data: {} },
    ]
    const next = spliceNodes(canonical, '1', created)
    expect(next.find((node) => node.id === 'hours').parentId).toBe('ok')
    expect(next.find((node) => node.id === 'success').parentId).toBe('hours')
  })
})
