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
      draggable: !displayOnly,
      focusable: !displayOnly,
    }
  })
}
