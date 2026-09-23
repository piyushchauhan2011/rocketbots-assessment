import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { reactive } from 'vue'

import { POSITIONS_STORAGE_KEY, useFlowUiStore } from '@/stores/flowUi'
/** @typedef {import('@rocketbots/core/types').FlowNodeCommandMove} FlowNodeCommandMove */

beforeEach(() => setActivePinia(createPinia()))

describe('flow UI state', () => {
  it('persists positions and removes deleted positions', () => {
    const store = useFlowUiStore()
    store.setPosition(1, { x: 2, y: 3 })
    store.setPositions({ two: { x: 4, y: 5 } })
    expect(JSON.parse(localStorage.getItem(POSITIONS_STORAGE_KEY) || '{}')).toEqual({
      1: { x: 2, y: 3 },
      two: { x: 4, y: 5 },
    })
    store.removePositions([1])
    expect(store.positions['1']).toBeUndefined()
  })

  it('caps history at 50 and clears redo on a new command', () => {
    const store = useFlowUiStore()
    for (let index = 0; index < 55; index += 1)
      store.record({
        kind: 'move',
        nodeId: String(index),
        before: { x: 0, y: 0 },
        after: { x: 0, y: 0 },
      })
    expect(store.undoStack).toHaveLength(50)
    const command = store.takeUndo()
    expect(store.redoStack).toEqual([command])
    store.record({
      kind: 'move',
      nodeId: 'new',
      before: { x: 0, y: 0 },
      after: { x: 0, y: 0 },
    })
    expect(store.redoStack).toEqual([])
  })

  it('moves commands between undo and redo stacks', () => {
    const store = useFlowUiStore()
    /** @type {FlowNodeCommandMove} */
    const command = { kind: 'move', nodeId: 'a', before: { x: 0, y: 0 }, after: { x: 1, y: 2 } }
    store.record(command)
    expect(store.takeUndo()).toEqual(command)
    expect(store.takeRedo()).toEqual(command)
    expect(store.focusedNodeId).toBeNull()
    store.focusNode(4)
    expect(store.focusedNodeId).toBe('4')
  })

  it('copies reactive move coordinates into a plain command', () => {
    const store = useFlowUiStore()
    const before = reactive({ x: 12, y: 24 })
    store.record({ kind: 'move', nodeId: 'dragged', before, after: reactive({ x: 40, y: 24 }) })
    expect(store.undoStack[0]).toEqual({
      kind: 'move',
      nodeId: 'dragged',
      before: { x: 12, y: 24 },
      after: { x: 40, y: 24 },
    })
  })
})
