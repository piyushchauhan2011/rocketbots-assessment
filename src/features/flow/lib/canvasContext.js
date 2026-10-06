/** @typedef {'up' | 'down' | 'left' | 'right'} MoveDirection */

/**
 * Canvas actions shared with node components. Kept off Vue Flow node data so
 * records stay serializable and node identity does not change on every render.
 * @typedef {object} FlowCanvasContext
 * @property {(nodeId: string) => void} openNode
 * @property {(nodeId: string) => void} addNode
 * @property {(nodeId: string, direction: MoveDirection) => void} moveNode
 * @property {(nodeId: string, element: HTMLElement | null) => void} registerNode
 */

export const flowCanvasKey = Symbol('flow-canvas')
