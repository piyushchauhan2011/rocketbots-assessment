import { defineStore } from 'pinia'

export const POSITIONS_STORAGE_KEY = 'rocketbots-flow-positions:v1'
const HISTORY_LIMIT = 50

function loadPositions() {
  try {
    return JSON.parse(localStorage.getItem(POSITIONS_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export const useFlowUiStore = defineStore('flow-ui', {
  state: () => ({ positions: loadPositions(), focusedNodeId: null, undoStack: [], redoStack: [] }),
  actions: {
    setPosition(nodeId, position) {
      this.positions = { ...this.positions, [String(nodeId)]: { ...position } }
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(this.positions))
    },
    setPositions(entries) {
      this.positions = { ...this.positions, ...entries }
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(this.positions))
    },
    removePositions(ids) {
      const next = { ...this.positions }
      ids.forEach((id) => delete next[String(id)])
      this.positions = next
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(next))
    },
    focusNode(nodeId) {
      this.focusedNodeId = nodeId === null ? null : String(nodeId)
    },
    record(command) {
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
