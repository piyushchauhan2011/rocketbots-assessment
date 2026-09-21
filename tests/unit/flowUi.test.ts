import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { POSITIONS_STORAGE_KEY, useFlowUiStore } from '@/stores/flowUi'

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
      store.record({ kind: 'move', nodeId: String(index), before: {}, after: {} })
    expect(store.undoStack).toHaveLength(50)
    const command = store.takeUndo()
    expect(store.redoStack).toEqual([command])
    store.record({ kind: 'move', nodeId: 'new', before: {}, after: {} })
    expect(store.redoStack).toEqual([])
  })

  it('moves commands between undo and redo stacks', () => {
    const store = useFlowUiStore()
    const command = { kind: 'move', nodeId: 'a', before: { x: 0 }, after: { x: 1 } }
    store.record(command)
    expect(store.takeUndo()).toEqual(command)
    expect(store.takeRedo()).toEqual(command)
    expect(store.focusedNodeId).toBeNull()
    store.focusNode(4)
    expect(store.focusedNodeId).toBe('4')
  })
})
