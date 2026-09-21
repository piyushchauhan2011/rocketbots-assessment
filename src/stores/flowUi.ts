import { defineStore } from 'pinia'

import type { FlowNodeCommand, Position } from '@/features/nodes/lib/types'

export const POSITIONS_STORAGE_KEY = 'rocketbots-flow-positions:v2'
const HISTORY_LIMIT = 50

function loadPositions(): Record<string, Position> {
  try {
    return JSON.parse(localStorage.getItem(POSITIONS_STORAGE_KEY) || '{}') as Record<
      string,
      Position
    >
  } catch {
    return {}
  }
}

export const useFlowUiStore = defineStore('flow-ui', {
  state: () => ({
    positions: loadPositions(),
    focusedNodeId: null as string | null,
    undoStack: [] as FlowNodeCommand[],
    redoStack: [] as FlowNodeCommand[],
  }),
  actions: {
    setPosition(nodeId: string | number, position: Position) {
      this.positions = { ...this.positions, [String(nodeId)]: { ...position } }
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(this.positions))
    },
    setPositions(entries: Record<string, Position>) {
      this.positions = { ...this.positions, ...entries }
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(this.positions))
    },
    removePositions(ids: Array<string | number>) {
      const next = { ...this.positions }
      ids.forEach((id) => delete next[String(id)])
      this.positions = next
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(next))
    },
    focusNode(nodeId: string | number | null) {
      this.focusedNodeId = nodeId === null ? null : String(nodeId)
    },
    record(command: FlowNodeCommand) {
      this.undoStack = [...this.undoStack.slice(-(HISTORY_LIMIT - 1)), structuredClone(command)]
      this.redoStack = []
    },
    takeUndo() {
      const command = this.undoStack.pop()
      if (command) this.redoStack.push(command)
      return command
    },
    takeRedo() {
      const command = this.redoStack.pop()
      if (command) this.undoStack.push(command)
      return command
    },
  },
})
