/** @typedef {import('@/features/nodes/lib/types.js').NodeId} NodeId */
/** @typedef {import('@/features/nodes/lib/types.js').NodeKind} NodeKind */
/** @typedef {import('@/features/nodes/lib/types.js').NodeRecord} NodeRecord */
/** @typedef {import('@/features/nodes/lib/types.js').Position} Position */

export const X_GAP = 320
export const Y_GAP = 248

/** @param {unknown} value @returns {string} */
function id(value) {
  return String(value)
}

/** @type {Record<NodeKind, (record: NodeRecord) => string>} */
const SUMMARY_BY_TYPE = {
  trigger: () => 'Conversation opened',
  sendMessage: (record) => {
    const text = record.data?.payload?.find((item) => item.type === 'text')?.text?.trim()
    return text || 'Message with attachment'
  },
  addComment: (record) => record.data?.comment?.trim() || 'Comment',
  dateTime: (record) => `Business hours - ${record.data?.timezone || 'UTC'}`,
  dateTimeConnector: (record) => `${record.data?.connectorType || ''} path`.trim(),
}

/** @param {Partial<NodeRecord> | null | undefined} record @returns {string} */
function descriptionFor(record) {
  return record?.data?.description?.trim() || ''
}

/** @param {Partial<NodeRecord> | null | undefined} record @returns {string} */
function summaryForType(record) {
  if (!record?.type) return ''
  return SUMMARY_BY_TYPE[record.type](/** @type {NodeRecord} */ (record))
}

/**
 * Canvas cards show the description, then a type summary when a node has none.
 * @param {Partial<NodeRecord> | null | undefined} record
 * @returns {string}
 */
export function getNodeSummary(record) {
  return descriptionFor(record) || summaryForType(record) || record?.name || 'Flow step'
}

/**
 * @param {NodeRecord[]} records
 * @returns {import('@vue-flow/core').Edge[]}
 */
export function buildFlowEdges(records) {
  const known = new Set(records.map((record) => id(record.id)))
  return records.flatMap((record) => {
    const parent = id(record.parentId)
    if (parent === '-1' || !known.has(parent)) return []
    return [
      {
        id: `edge-${parent}-${id(record.id)}`,
        source: parent,
        target: id(record.id),
        type: /** @type {'smoothstep'} */ ('smoothstep'),
        selectable: false,
        focusable: false,
        pathOptions: { borderRadius: 16, offset: 16 },
        style: { stroke: '#f0a898', strokeWidth: 2 },
      },
    ]
  })
}

/**
 * @param {NodeRecord[]} records
 * @param {NodeId} nodeId
 * @returns {string[]}
 */
export function getDescendantIds(records, nodeId) {
  /** @type {Map<string, string[]>} */
  const children = new Map()
  records.forEach((record) => {
    const parent = id(record.parentId)
    children.set(parent, [...(children.get(parent) || []), id(record.id)])
  })
  /** @type {string[]} */
  const found = []
  const seen = new Set([id(nodeId)])
  const queue = [...(children.get(id(nodeId)) || [])]
  while (queue.length) {
    const child = /** @type {string} */ (queue.shift())
    if (seen.has(child)) continue
    seen.add(child)
    found.push(child)
    queue.push(...(children.get(child) || []))
  }
  return found
}

/**
 * @param {NodeRecord[]} records
 * @returns {Record<string, Position>}
 */
export function layoutGraph(records) {
  const recordIds = new Set(records.map((record) => id(record.id)))
  /** @type {Map<string, string[]>} */
  const children = new Map()
  records.forEach((record) => {
    const parent = id(record.parentId)
    children.set(parent, [...(children.get(parent) || []), id(record.id)])
  })
  const roots = records
    .filter((record) => id(record.parentId) === '-1' || !recordIds.has(id(record.parentId)))
    .map((record) => id(record.id))
  const placed = new Set()
  /** @type {Record<string, Position>} */
  const positions = {}
  let nextColumn = 0

  /**
   * @param {string} nodeId
   * @param {number} depth
   * @param {Set<string>} ancestry
   * @returns {number}
   */
  function place(nodeId, depth, ancestry) {
    if (placed.has(nodeId) || ancestry.has(nodeId)) return 0
    const branch = new Set(ancestry).add(nodeId)
    const validChildren = (children.get(nodeId) || []).filter((child) => !branch.has(child))
    const start = nextColumn
    if (!validChildren.length) nextColumn += 1
    validChildren.forEach((child) => place(child, depth + 1, branch))
    const end = Math.max(start, nextColumn - 1)
    positions[nodeId] = { x: ((start + end) / 2) * X_GAP, y: depth * Y_GAP }
    placed.add(nodeId)
    return end - start + 1
  }

  roots.forEach((root) => place(root, 0, new Set()))
  records.forEach((record) => {
    if (!placed.has(id(record.id))) {
      place(id(record.id), 0, new Set())
      nextColumn += 1
    }
  })
  return positions
}

/**
 * @param {NodeRecord[]} records
 * @param {NodeRecord} target
 * @returns {Set<string>}
 */
function removedIdsFor(records, target) {
  const targetId = id(target.id)
  const removed = new Set([targetId])
  if (target.type !== 'dateTime') return removed
  records.forEach((record) => {
    if (id(record.parentId) === targetId && record.type === 'dateTimeConnector') {
      removed.add(id(record.id))
    }
  })
  return removed
}

/**
 * @param {NodeRecord[]} records
 * @param {NodeId} nodeId
 * @returns {{ records: NodeRecord[], removedIds: string[] }}
 */
export function removeNode(records, nodeId) {
  const target = records.find((record) => id(record.id) === id(nodeId))
  if (!target) return { records, removedIds: [] }
  const removed = removedIdsFor(records, target)
  const next = records.flatMap((record) => {
    if (removed.has(id(record.id))) return []
    if (!removed.has(id(record.parentId))) return [record]
    return [{ ...record, parentId: target.parentId }]
  })
  return { records: next, removedIds: [...removed] }
}

/**
 * @param {NodeRecord[]} records
 * @param {NodeRecord} current
 * @param {number} step
 * @returns {string | null}
 */
function siblingId(records, current, step) {
  const siblings = records.filter((record) => id(record.parentId) === id(current.parentId))
  const index = siblings.findIndex((record) => id(record.id) === id(current.id))
  const next = siblings[index + step]
  return next ? id(next.id) : null
}

/**
 * @param {NodeRecord[]} records
 * @param {string | null} currentId
 * @param {'up' | 'down' | 'left' | 'right'} direction
 * @returns {string | null}
 */
export function nextNodeId(records, currentId, direction) {
  if (!currentId) {
    const root = records.find((record) => record.type === 'trigger') || records[0]
    return root ? id(root.id) : null
  }
  const current = records.find((record) => id(record.id) === id(currentId))
  if (!current) return null
  if (direction === 'down') {
    const child = records.find((record) => id(record.parentId) === id(current.id))
    return child ? id(child.id) : null
  }
  if (direction === 'up') {
    const parent = id(current.parentId)
    return records.some((record) => id(record.id) === parent) ? parent : null
  }
  return siblingId(records, current, direction === 'left' ? -1 : 1)
}

/** @param {Position} position @returns {Position} */
function point(position) {
  return { x: position.x, y: position.y }
}

/**
 * @param {NodeRecord[]} records
 * @param {Record<string, Position>} [saved]
 * @returns {Record<string, Position>}
 */
export function missingLayoutPositions(records, saved = {}) {
  const layout = layoutGraph(records)
  return Object.fromEntries(
    records.flatMap((record) => {
      const nodeId = id(record.id)
      return saved[nodeId] || !layout[nodeId] ? [] : [[nodeId, point(layout[nodeId])]]
    }),
  )
}

/**
 * @param {NodeRecord[]} records
 * @param {Record<string, Position>} saved
 * @returns {Record<string, Position>}
 */
function resolvedPositions(records, saved) {
  const layout = layoutGraph(records)
  return Object.fromEntries(
    records.map((record) => {
      const nodeId = id(record.id)
      return [nodeId, point(saved[nodeId] || layout[nodeId] || { x: 0, y: 0 })]
    }),
  )
}

/**
 * @param {NodeRecord[]} records
 * @param {NodeId} nodeId
 * @returns {NodeRecord[]}
 */
function childRecords(records, nodeId) {
  return records.filter((record) => id(record.parentId) === id(nodeId))
}

/**
 * @param {Position[]} positions
 * @returns {Position}
 */
function branchAnchor(positions) {
  const minY = Math.min(...positions.map((position) => position.y))
  const averageX = positions.reduce((sum, position) => sum + position.x, 0) / positions.length
  return { x: averageX, y: minY }
}

/**
 * Moves a node and every descendant by the same delta.
 * Descendants are read from `records`, which must already reflect the mutation.
 * @param {NodeRecord[]} records
 * @param {Record<string, Position>} positions
 * @param {string} nodeId
 * @param {number} dx
 * @param {number} dy
 * @param {Set<string>} [seen]
 */
function shiftSubtree(records, positions, nodeId, dx, dy, seen = new Set()) {
  const key = id(nodeId)
  if (seen.has(key)) return
  seen.add(key)
  const current = positions[key]
  if (current) positions[key] = { x: current.x + dx, y: current.y + dy }
  childRecords(records, key).forEach((child) => {
    shiftSubtree(records, positions, id(child.id), dx, dy, seen)
  })
}

/**
 * @param {NodeRecord[]} nextRecords
 * @param {Record<string, Position>} saved
 * @param {Record<string, Position>} working
 * @returns {Record<string, Position>}
 */
function changedPositions(nextRecords, saved, working) {
  return Object.fromEntries(
    nextRecords.flatMap((record) => {
      const nodeId = id(record.id)
      const next = working[nodeId]
      const previous = saved[nodeId]
      if (!next || (previous && previous.x === next.x && previous.y === next.y)) return []
      return [[nodeId, point(next)]]
    }),
  )
}

/**
 * Places inserted records in the gap they open and shifts only that subtree down.
 * Unaffected nodes keep their current coordinates.
 * @param {NodeRecord[]} records
 * @param {NodeId} parentId
 * @param {NodeRecord[]} created
 * @param {Record<string, Position>} [saved]
 * @returns {Record<string, Position>}
 */
export function positionsForSplice(records, parentId, created, saved = {}) {
  const before = resolvedPositions(records, saved)
  const children = childRecords(records, parentId)
  const nextRecords = spliceNodes(records, parentId, created)
  /** @type {Record<string, Position>} */
  const working = { ...before }
  const childPositions = children.flatMap((child) => {
    const position = before[id(child.id)]
    return position ? [position] : []
  })
  const parentPos = before[id(parentId)] || { x: 0, y: 0 }
  const anchor = childPositions.length ? branchAnchor(childPositions) : null

  if (created.length === 3) {
    const [hours, success, failure] = created
    const origin = anchor || { x: parentPos.x, y: parentPos.y + Y_GAP }
    working[id(hours.id)] = point(origin)
    working[id(success.id)] = { x: origin.x, y: origin.y + Y_GAP }
    working[id(failure.id)] = { x: origin.x + X_GAP, y: origin.y + Y_GAP }
    if (anchor) {
      children.forEach((child) => {
        shiftSubtree(nextRecords, working, id(child.id), 0, Y_GAP * 2)
      })
    }
  } else if (created[0]) {
    const insertedId = id(created[0].id)
    working[insertedId] = anchor ? point(anchor) : { x: parentPos.x, y: parentPos.y + Y_GAP }
    if (anchor) {
      children.forEach((child) => {
        shiftSubtree(nextRecords, working, id(child.id), 0, Y_GAP)
      })
    }
  }

  return changedPositions(nextRecords, saved, working)
}

/**
 * Closes the gap left by a deleted step by sliding only the reconnected subtree up.
 * @param {NodeRecord[]} records
 * @param {NodeId} nodeId
 * @param {Record<string, Position>} [saved]
 * @returns {Record<string, Position>}
 */
export function positionsAfterRemoval(records, nodeId, saved = {}) {
  const target = records.find((record) => id(record.id) === id(nodeId))
  if (!target) return {}
  const before = resolvedPositions(records, saved)
  const removed = removedIdsFor(records, target)
  const nextRecords = removeNode(records, nodeId).records
  /** @type {Record<string, Position>} */
  const working = { ...before }
  const targetPos = before[id(target.id)]
  const rows = target.type === 'dateTime' ? 2 : 1
  records.forEach((record) => {
    if (!removed.has(id(record.parentId)) || removed.has(id(record.id))) return
    const childPos = working[id(record.id)]
    if (!targetPos || !childPos || childPos.y <= targetPos.y) return
    shiftSubtree(nextRecords, working, id(record.id), 0, -rows * Y_GAP)
  })
  return changedPositions(nextRecords, saved, working)
}

/**
 * Parent for the page-level Create New Node action.
 * A focused step that can grow a child wins; otherwise the main path leaf is used.
 * @param {NodeRecord[]} records
 * @param {NodeId | null} focusedId
 * @returns {string | null}
 */
export function defaultCreateParentId(records, focusedId) {
  const focused = records.find((record) => id(record.id) === id(focusedId))
  if (focused && focused.type !== 'dateTime') return id(focused.id)
  return mainLeafId(records)
}

/**
 * @param {NodeRecord[]} records
 * @returns {Map<string, NodeRecord[]>}
 */
function childrenByParent(records) {
  /** @type {Map<string, NodeRecord[]>} */
  const children = new Map()
  records.forEach((record) => {
    const parent = id(record.parentId)
    children.set(parent, [...(children.get(parent) || []), record])
  })
  return children
}

/** @param {NodeRecord[]} children @returns {NodeRecord | undefined} */
function preferredChild(children) {
  return children.find((child) => child.data?.connectorType === 'success') || children[0]
}

/**
 * @param {NodeRecord | undefined} current
 * @param {Map<string, NodeRecord[]>} children
 * @returns {string | null}
 */
function addableLeafId(current, children) {
  if (!current || current.type !== 'dateTime') return current ? id(current.id) : null
  const connector = (children.get(id(current.id)) || []).find(
    (child) => child.type === 'dateTimeConnector',
  )
  return connector ? id(connector.id) : null
}

/**
 * @param {NodeRecord[]} records
 * @returns {string | null}
 */
function mainLeafId(records) {
  const children = childrenByParent(records)
  let current = records.find((record) => record.type === 'trigger') || records[0]
  const seen = new Set()
  while (current && !seen.has(id(current.id))) {
    seen.add(id(current.id))
    const nextChildren = children.get(id(current.id)) || []
    if (!nextChildren.length) break
    current = preferredChild(nextChildren)
  }
  return addableLeafId(current, children)
}

/**
 * @param {NodeRecord[]} records
 * @param {NodeId} parentId
 * @param {NodeRecord[]} created
 * @returns {NodeRecord[]}
 */
export function spliceNodes(records, parentId, created) {
  const anchorId = created.length === 3 ? created[1].id : created[0].id
  const parent = id(parentId)
  const shifted = records.map((record) =>
    id(record.parentId) === parent ? { ...record, parentId: anchorId } : record,
  )
  return [...shifted, ...created]
}

/**
 * @param {NodeRecord[]} records
 * @param {Record<string, Position>} [savedPositions]
 * @returns {import('@vue-flow/core').Node[]}
 */
export function buildFlowNodes(records, savedPositions = {}) {
  const layout = layoutGraph(records)
  const parentCounts = new Map()
  records.forEach((record) => {
    const parentId = id(record.parentId)
    parentCounts.set(parentId, (parentCounts.get(parentId) || 0) + 1)
  })
  return records.map((record) => {
    const nodeId = id(record.id)
    const displayOnly = record.type === 'trigger' || record.type === 'dateTimeConnector'
    const businessHours = record.type === 'dateTime' && record.data?.action === 'businessHours'
    return {
      id: nodeId,
      type: businessHours ? 'businessHours' : record.type,
      position: savedPositions[nodeId] || layout[nodeId] || { x: 0, y: 0 },
      data: {
        record,
        summary: getNodeSummary(record),
        hasChildren: (parentCounts.get(nodeId) || 0) > 0,
      },
      selectable: !displayOnly,
      draggable: true,
      focusable: false,
    }
  })
}
