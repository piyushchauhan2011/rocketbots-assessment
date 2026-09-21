import type { NodeRecord, Position } from '@/features/nodes/lib/types'

export const X_GAP = 320
export const Y_GAP = 248

function id(value: unknown): string {
  return String(value)
}

const SUMMARY_BY_TYPE = {
  trigger: () => 'Conversation opened',
  sendMessage: (record: NodeRecord) => {
    const text = record.data?.payload?.find((item) => item.type === 'text')?.text?.trim()
    return text || 'Message with attachment'
  },
  addComment: (record: NodeRecord) => record.data?.comment?.trim() || 'Comment',
  dateTime: (record: NodeRecord) => `Business hours - ${record.data?.timezone || 'UTC'}`,
  dateTimeConnector: (record: NodeRecord) => `${record.data?.connectorType || ''} path`.trim(),
}

export function getNodeSummary(record: Partial<NodeRecord> | null | undefined): string {
  const description = record?.data?.description?.trim()
  if (description) return description
  return (
    SUMMARY_BY_TYPE[record?.type as keyof typeof SUMMARY_BY_TYPE]?.(record as NodeRecord) ||
    record?.name ||
    'Flow step'
  )
}

export function buildFlowEdges(records: NodeRecord[]) {
  const known = new Set(records.map((record) => id(record.id)))
  return records.flatMap((record) => {
    const parent = id(record.parentId)
    if (parent === '-1' || !known.has(parent)) return []
    return [
      {
        id: `edge-${parent}-${id(record.id)}`,
        source: parent,
        target: id(record.id),
        type: 'smoothstep' as const,
        selectable: false,
        focusable: false,
        pathOptions: { borderRadius: 16, offset: 16 },
        style: { stroke: '#f0a898', strokeWidth: 2 },
      },
    ]
  })
}

export function getDescendantIds(records: NodeRecord[], nodeId: string | number): string[] {
  const children = new Map<string, string[]>()
  records.forEach((record) => {
    const parent = id(record.parentId)
    children.set(parent, [...(children.get(parent) || []), id(record.id)])
  })
  const found: string[] = []
  const seen = new Set([id(nodeId)])
  const queue = [...(children.get(id(nodeId)) || [])]
  while (queue.length) {
    const child = queue.shift()
    if (seen.has(child)) continue
    seen.add(child)
    found.push(child)
    queue.push(...(children.get(child) || []))
  }
  return found
}

export function layoutGraph(records: NodeRecord[]): Record<string, Position> {
  const recordIds = new Set(records.map((record) => id(record.id)))
  const children = new Map<string, string[]>()
  records.forEach((record) => {
    const parent = id(record.parentId)
    children.set(parent, [...(children.get(parent) || []), id(record.id)])
  })
  const roots = records
    .filter((record) => id(record.parentId) === '-1' || !recordIds.has(id(record.parentId)))
    .map((record) => id(record.id))
  const placed = new Set()
  const positions: Record<string, Position> = {}
  let nextColumn = 0

  function place(nodeId: string, depth: number, ancestry: Set<string>) {
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

function removedIdsFor(records: NodeRecord[], target: NodeRecord) {
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

export function removeNode(records: NodeRecord[], nodeId: string | number) {
  const target = records.find((record) => id(record.id) === id(nodeId))
  if (!target) return { records, removedIds: [] as string[] }
  const removed = removedIdsFor(records, target)
  const next = records.flatMap((record) => {
    if (removed.has(id(record.id))) return []
    if (!removed.has(id(record.parentId))) return [record]
    return [{ ...record, parentId: target.parentId }]
  })
  return { records: next, removedIds: [...removed] }
}

function siblingId(records: NodeRecord[], current: NodeRecord, step: number) {
  const siblings = records.filter((record) => id(record.parentId) === id(current.parentId))
  const index = siblings.findIndex((record) => id(record.id) === id(current.id))
  const next = siblings[index + step]
  return next ? id(next.id) : null
}

export function nextNodeId(
  records: NodeRecord[],
  currentId: string | null,
  direction: 'up' | 'down' | 'left' | 'right',
) {
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

function point(position: Position): Position {
  return { x: position.x, y: position.y }
}

function overlaps(position: Position, placed: Record<string, Position>) {
  return Object.values(placed).some(
    (current) => Math.abs(current.x - position.x) < 8 && Math.abs(current.y - position.y) < 8,
  )
}

function clearPosition(position: Position, placed: Record<string, Position>) {
  let next = point(position)
  for (let shift = 0; overlaps(next, placed) && shift < 8; shift += 1) {
    next = { x: position.x + (shift + 1) * X_GAP, y: position.y }
  }
  return next
}

export function missingLayoutPositions(
  records: NodeRecord[],
  saved: Record<string, Position> = {},
) {
  const layout = layoutGraph(records)
  return Object.fromEntries(
    records.flatMap((record) => {
      const nodeId = id(record.id)
      return saved[nodeId] || !layout[nodeId] ? [] : [[nodeId, point(layout[nodeId])]]
    }),
  )
}

function addedPosition(
  record: NodeRecord,
  layout: Record<string, Position>,
  placed: Record<string, Position>,
) {
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

export function positionsForAddedNodes(
  records: NodeRecord[],
  saved: Record<string, Position> = {},
) {
  const layout = layoutGraph(records)
  const placed = { ...saved }
  const added: Record<string, Position> = {}
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

export function spliceNodes(records: NodeRecord[], parentId: string, created: NodeRecord[]) {
  const anchorId = created.length === 3 ? created[1].id : created[0].id
  const parent = id(parentId)
  const shifted = records.map((record) =>
    id(record.parentId) === parent ? { ...record, parentId: anchorId } : record,
  )
  return [...shifted, ...created]
}

export function buildFlowNodes(
  records: NodeRecord[],
  savedPositions: Record<string, Position> = {},
) {
  const layout = layoutGraph(records)
  const parentCounts = new Map<string, number>()
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
