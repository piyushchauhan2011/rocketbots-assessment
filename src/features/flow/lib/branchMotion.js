/** @typedef {import('@/features/nodes/lib/types.js').Position} NodePosition */
/** @typedef {Record<string, NodePosition>} PositionOverlay */
/** @typedef {{ from: NodePosition, to: NodePosition, started: number }} BranchMotion */

export const MOTION_MS = 280

/**
 * @param {PositionOverlay} overlay
 * @param {string} nodeId
 * @param {BranchMotion} motion
 * @param {number} progress
 */
export function paintBranch(overlay, nodeId, motion, progress) {
  const eased = 1 - (1 - progress) ** 3
  overlay[nodeId] = {
    x: motion.from.x + (motion.to.x - motion.from.x) * eased,
    y: motion.from.y + (motion.to.y - motion.from.y) * eased,
  }
}

/**
 * Drop overrides that have arrived, and any override for a node that no longer has a stored position.
 * @param {PositionOverlay} overlay
 * @param {Record<string, NodePosition>} positions
 * @param {Set<string>} movingIds
 * @param {string} draggingNodeId
 */
export function releaseSettledPositions(overlay, positions, movingIds, draggingNodeId) {
  Object.keys(overlay).forEach((nodeId) => {
    if (nodeId === draggingNodeId || movingIds.has(nodeId)) return
    const stored = positions[nodeId]
    const live = overlay[nodeId]
    if (!stored || (live.x === stored.x && live.y === stored.y)) delete overlay[nodeId]
  })
}

/**
 * @param {PositionOverlay} overlay
 * @param {Map<string, BranchMotion>} motions
 * @param {number} timestamp
 * @param {string} draggingNodeId
 * @returns {boolean}
 */
export function advanceBranchMotions(overlay, motions, timestamp, draggingNodeId) {
  const sample = motions.values().next().value
  if (sample && timestamp < sample.started) {
    motions.forEach((motion, nodeId) => paintBranch(overlay, nodeId, motion, 1))
    motions.clear()
    return false
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  motions.forEach((motion, nodeId) => {
    if (nodeId === draggingNodeId) {
      motions.delete(nodeId)
      return
    }
    const progress = reduceMotion ? 1 : Math.min(1, (timestamp - motion.started) / MOTION_MS)
    paintBranch(overlay, nodeId, motion, progress)
    if (progress >= 1) motions.delete(nodeId)
  })
  return motions.size > 0
}

/**
 * @param {PositionOverlay} overlay
 * @param {{
 *   draggingNodeId: () => string,
 *   findNode: (nodeId: string) => { position: NodePosition } | undefined,
 * }} options
 */
export function createBranchMotion(overlay, options) {
  /** @type {Map<string, BranchMotion>} */
  const motions = new Map()
  /** @type {Record<string, NodePosition>} */
  let stored = {}
  let running = false

  function settle() {
    releaseSettledPositions(overlay, stored, new Set(motions.keys()), options.draggingNodeId())
  }
  /** @param {number} timestamp */
  function step(timestamp) {
    const pending = advanceBranchMotions(overlay, motions, timestamp, options.draggingNodeId())
    settle()
    if (pending) requestAnimationFrame(step)
    else running = false
  }
  /** @param {Record<string, NodePosition>} positions */
  function sync(positions) {
    stored = positions
    const dragging = options.draggingNodeId()
    const started = performance.now()
    motions.forEach((_motion, nodeId) => {
      if (nodeId !== dragging && !(nodeId in positions)) motions.delete(nodeId)
    })
    Object.entries(positions).forEach(([nodeId, position]) => {
      if (nodeId === dragging) return
      const node = options.findNode(nodeId)
      if (!node || (node.position.x === position.x && node.position.y === position.y)) return
      const origin = { x: node.position.x, y: node.position.y }
      overlay[nodeId] = origin
      motions.set(nodeId, { from: origin, to: { ...position }, started })
    })
    if (motions.size && !running) {
      running = true
      requestAnimationFrame(step)
    }
    settle()
  }
  /** @param {string[]} liveIds */
  function prune(liveIds) {
    const live = new Set(liveIds)
    motions.forEach((_motion, nodeId) => {
      if (!live.has(nodeId)) motions.delete(nodeId)
    })
    Object.keys(overlay).forEach((nodeId) => {
      if (!live.has(nodeId)) delete overlay[nodeId]
    })
  }

  return { prune, sync }
}
