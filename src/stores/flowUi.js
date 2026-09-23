import { defineStore } from 'pinia'

/** @typedef {import('@/features/nodes/lib/types.js').FlowNodeCommand} FlowNodeCommand */
/** @typedef {import('@/features/nodes/lib/types.js').NodeId} NodeId */
/** @typedef {import('@/features/nodes/lib/types.js').Position} Position */

export const POSITIONS_STORAGE_KEY = 'rocketbots-flow-positions:v2'
const HISTORY_LIMIT = 50

/**
 * @param {Partial<Position> | undefined} position
 * @returns {Position}
 */
function point(position) {
  return { x: Number(position?.x) || 0, y: Number(position?.y) || 0 }
}

/**
 * @param {FlowNodeCommand} command
 * @returns {FlowNodeCommand}
 */
function cloneCommand(command) {
  if (command.kind === 'move') {
    return {
      kind: 'move',
      nodeId: String(command.nodeId),
      before: point(command.before),
      after: point(command.after),
    }
  }
  return /** @type {FlowNodeCommand} */ (JSON.parse(JSON.stringify(command)))
}

/** @returns {Record<string, Position>} */
function loadPositions() {
  try {
    return /** @type {Record<string, Position>} */ (
      JSON.parse(localStorage.getItem(POSITIONS_STORAGE_KEY) || '{}')
    )
  } catch {
    return {}
  }
}

export const useFlowUiStore = defineStore('flow-ui', {
  state: () => ({
    positions: loadPositions(),
    focusedNodeId: /** @type {string | null} */ (null),
    undoStack: /** @type {FlowNodeCommand[]} */ ([]),
    redoStack: /** @type {FlowNodeCommand[]} */ ([]),
  }),
  actions: {
    /** @param {NodeId} nodeId @param {Position} position */
    setPosition(nodeId, position) {
      this.positions = { ...this.positions, [String(nodeId)]: { ...position } }
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(this.positions))
    },
    /** @param {Record<string, Position>} entries */
    setPositions(entries) {
      this.positions = { ...this.positions, ...entries }
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(this.positions))
    },
    /** @param {NodeId[]} ids */
    removePositions(ids) {
      const next = { ...this.positions }
      ids.forEach((id) => delete next[String(id)])
      this.positions = next
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(next))
    },
    /** @param {NodeId | null} nodeId */
    focusNode(nodeId) {
      this.focusedNodeId = nodeId === null ? null : String(nodeId)
    },
    /** @param {FlowNodeCommand} command */
    record(command) {
      this.undoStack = [...this.undoStack.slice(-(HISTORY_LIMIT - 1)), cloneCommand(command)]
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
