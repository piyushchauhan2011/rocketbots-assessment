import { describe, expect, it } from 'vitest'

import {
  buildFlowEdges,
  buildFlowNodes,
  getDescendantIds,
  getNodeSummary,
  layoutGraph,
  defaultCreateParentId,
  missingLayoutPositions,
  nextNodeId,
  positionsAfterRemoval,
  positionsForSplice,
  removeNode,
  spliceNodes,
  X_GAP,
  Y_GAP,
} from '@/features/flow/lib/graph'
/** @typedef {import('@/features/nodes/lib/types.js').NodeRecord} NodeRecord */

/** @type {NodeRecord[]} */

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
    /** @type {NodeRecord[]} */
    const malformed = [
      ...canonical,
      { id: 'orphan', parentId: 'missing', type: 'addComment', data: {} },
      { id: 'a', parentId: 'b', type: 'addComment', data: {} },
      { id: 'b', parentId: 'a', type: 'addComment', data: {} },
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
    /** @type {NodeRecord[]} */
    const cyclic = [
      ...canonical,
      { id: 'loop', parentId: 'message', type: 'addComment', data: {} },
      { id: 'message', parentId: 'loop', type: 'sendMessage', data: {} },
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
    expect(
      getNodeSummary({
        type: 'sendMessage',
        data: { description: 'Old card', payload: [{ type: 'text', text: 'Edited message' }] },
      }),
    ).toBe('Old card')
    expect(
      getNodeSummary({
        type: 'addComment',
        data: { description: 'Old card', comment: 'Edited note' },
      }),
    ).toBe('Old card')
  })
})

describe('nextNodeId', () => {
  /** @type {NodeRecord[]} */
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
    /** @type {NodeRecord[]} */
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

describe('positionsForSplice', () => {
  it('fills only missing layout positions', () => {
    const layout = layoutGraph(canonical)
    const missing = missingLayoutPositions(canonical, { message: { x: 9, y: 11 } })
    expect(missing.message).toBeUndefined()
    expect(missing['1']).toEqual(layout['1'])
  })

  it('puts the inserted step on the child slot and slides that subtree down', () => {
    const updates = positionsForSplice(
      [
        { id: '1', parentId: -1, type: 'trigger', data: {} },
        { id: 'child', parentId: '1', type: 'sendMessage', data: {} },
      ],
      '1',
      [{ id: 'inserted', parentId: '1', type: 'addComment', data: {} }],
      { 1: { x: 0, y: 0 }, child: { x: 0, y: Y_GAP } },
    )
    expect(updates.inserted).toEqual({ x: 0, y: Y_GAP })
    expect(updates.child).toEqual({ x: 0, y: Y_GAP * 2 })
    expect(updates['1']).toBeUndefined()
  })

  it('leaves an unaffected branch where it is', () => {
    /** @type {NodeRecord[]} */
    const records = [
      { id: 'root', parentId: -1, type: 'trigger', data: {} },
      { id: 'left', parentId: 'root', type: 'sendMessage', data: {} },
      { id: 'right', parentId: 'root', type: 'addComment', data: {} },
      { id: 'leaf', parentId: 'left', type: 'sendMessage', data: {} },
    ]
    const updates = positionsForSplice(
      records,
      'left',
      [{ id: 'mid', parentId: 'left', type: 'addComment', data: {} }],
      {
        root: { x: 0, y: 0 },
        left: { x: 0, y: Y_GAP },
        right: { x: X_GAP, y: Y_GAP },
        leaf: { x: 0, y: Y_GAP * 2 },
      },
    )
    expect(updates.mid).toEqual({ x: 0, y: Y_GAP * 2 })
    expect(updates.leaf).toEqual({ x: 0, y: Y_GAP * 3 })
    expect(updates.right).toBeUndefined()
    expect(updates.root).toBeUndefined()
    expect(updates.left).toBeUndefined()
  })
})

describe('positionsForSplice placement', () => {
  it('opens two rows when business hours are inserted above a child', () => {
    const updates = positionsForSplice(
      [
        { id: '1', parentId: -1, type: 'trigger', data: {} },
        { id: 'child', parentId: '1', type: 'sendMessage', data: {} },
      ],
      '1',
      [
        { id: 'hours', parentId: '1', type: 'dateTime', data: {} },
        { id: 'ok', parentId: 'hours', type: 'dateTimeConnector', data: {} },
        { id: 'no', parentId: 'hours', type: 'dateTimeConnector', data: {} },
      ],
      { 1: { x: 0, y: 0 }, child: { x: 40, y: Y_GAP } },
    )
    expect(updates.hours).toEqual({ x: 40, y: Y_GAP })
    expect(updates.ok).toEqual({ x: 40, y: Y_GAP * 2 })
    expect(updates.no).toEqual({ x: 40 + X_GAP, y: Y_GAP * 2 })
    expect(updates.child).toEqual({ x: 40, y: Y_GAP * 3 })
  })

  it('appends below the parent when that step has no child', () => {
    const updates = positionsForSplice(
      [{ id: '1', parentId: -1, type: 'trigger', data: {} }],
      '1',
      [{ id: 'note', parentId: '1', type: 'addComment', data: {} }],
      { 1: { x: 10, y: 20 } },
    )
    expect(updates.note).toEqual({ x: 10, y: 20 + Y_GAP })
    expect(updates['1']).toBeUndefined()
  })
})

describe('positionsAfterRemoval', () => {
  it('slides the reconnected child up into the deleted step', () => {
    /** @type {NodeRecord[]} */
    const records = [
      { id: '1', parentId: -1, type: 'trigger', data: {} },
      { id: 'mid', parentId: '1', type: 'addComment', data: {} },
      { id: 'child', parentId: 'mid', type: 'sendMessage', data: {} },
    ]
    const updates = positionsAfterRemoval(records, 'mid', {
      1: { x: 0, y: 0 },
      mid: { x: 0, y: Y_GAP },
      child: { x: 12, y: Y_GAP * 2 },
    })
    expect(updates.child).toEqual({ x: 12, y: Y_GAP })
    expect(updates.mid).toBeUndefined()
    expect(updates['1']).toBeUndefined()
  })

  it('keeps a child that was placed above the deleted step', () => {
    /** @type {NodeRecord[]} */
    const records = [
      { id: '1', parentId: -1, type: 'trigger', data: {} },
      { id: 'mid', parentId: '1', type: 'addComment', data: {} },
      { id: 'child', parentId: 'mid', type: 'sendMessage', data: {} },
    ]
    const updates = positionsAfterRemoval(records, 'mid', {
      1: { x: 0, y: 0 },
      mid: { x: 0, y: Y_GAP },
      child: { x: 12, y: 0 },
    })
    expect(updates.child).toBeUndefined()
  })
})

describe('defaultCreateParentId', () => {
  it('uses the focused step, then the main-path leaf', () => {
    expect(defaultCreateParentId(canonical, 'message')).toBe('message')
    expect(defaultCreateParentId(canonical, 'hours')).toBe('message')
    expect(defaultCreateParentId(canonical, null)).toBe('message')
  })
})

describe('spliceNodes', () => {
  it('splices a step between a parent and its current child', () => {
    /** @type {NodeRecord[]} */
    const created = [{ id: 'mid', parentId: 1, type: 'sendMessage', name: 'Mid', data: {} }]
    const next = spliceNodes(canonical, '1', created)
    expect(next.find((node) => node.id === 'hours').parentId).toBe('mid')
    expect(next.find((node) => node.id === 'mid').parentId).toBe(1)
  })

  it('keeps the previous branch on the success path of inserted hours', () => {
    /** @type {NodeRecord[]} */
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
