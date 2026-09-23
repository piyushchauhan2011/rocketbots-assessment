/** @typedef {import('../nodes/types').NodeId} NodeId */
/** @typedef {import('../nodes/types').NodeKind} NodeKind */
/** @typedef {import('../nodes/types').NodeRecord} NodeRecord */
/** @typedef {import('../nodes/types').Position} Position */

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
 * @param {Partial<NodeRecord> | null | undefined} record
 * @returns {string}
 */
export function getNodeSummary(record) {
  return descriptionFor(record) || summaryForType(record) || record?.name || 'Flow step'
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
 * @param {Position} position
 * @param {Record<string, Position>} placed
 * @returns {boolean}
 */
function overlaps(position, placed) {
  return Object.values(placed).some(
    (current) => Math.abs(current.x - position.x) < 8 && Math.abs(current.y - position.y) < 8,
  )
}

/**
 * @param {Position} position
 * @param {Record<string, Position>} placed
 * @returns {Position}
 */
function clearPosition(position, placed) {
  let next = point(position)
  for (let shift = 0; overlaps(next, placed) && shift < 8; shift += 1) {
    next = { x: position.x + (shift + 1) * X_GAP, y: position.y }
  }
  return next
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
 * @param {NodeRecord} record
 * @param {Record<string, Position>} layout
 * @param {Record<string, Position>} placed
 * @returns {Position}
 */
function addedPosition(record, layout, placed) {
  const nodeId = id(record.id)
  const parentId = id(record.parentId)
  const layoutPos = layout[nodeId]
  const parentLayout = layout[parentId]
  const parentPos = placed[parentId]
  const anchored =
    parentPos && parentLayout
      ? {
          x: parentPos.x + layoutPos.x - parentLayout.x,
          y: parentPos.y + layoutPos.y - parentLayout.y,
        }
      : point(layoutPos)
  return clearPosition(anchored, placed)
}

/**
 * @param {NodeRecord[]} records
 * @param {Record<string, Position>} [saved]
 * @returns {Record<string, Position>}
 */
export function positionsForAddedNodes(records, saved = {}) {
  const layout = layoutGraph(records)
  const placed = { ...saved }
  /** @type {Record<string, Position>} */
  const added = {}
  const pending = records
    .filter((record) => !placed[id(record.id)] && layout[id(record.id)])
    .sort(
      (left, right) =>
        layout[id(left.id)].y - layout[id(right.id)].y ||
        layout[id(left.id)].x - layout[id(right.id)].x,
    )
  pending.forEach((record) => {
    const nodeId = id(record.id)
    const position = addedPosition(record, layout, placed)
    placed[nodeId] = position
    added[nodeId] = position
  })
  return added
}

/**
 * @param {NodeRecord[]} records
 * @param {string} parentId
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
