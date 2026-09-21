const X_GAP = 280
const Y_GAP = 190

function id(value) {
  return String(value)
}

const SUMMARY_BY_TYPE = {
  trigger: () => 'Conversation opened',
  sendMessage: (record) => {
    const text = record.data?.payload?.find((item) => item.type === 'text')?.text?.trim()
    return text || 'Message with attachment'
  },
  addComment: (record) => record.data?.comment?.trim() || 'Comment',
  dateTime: (record) => `${record.data?.timezone || 'UTC'} business hours`,
  dateTimeConnector: (record) => `${record.data?.connectorType || ''} path`.trim(),
}

export function getNodeSummary(record) {
  const description = record?.data?.description?.trim()
  if (description) return description
  return SUMMARY_BY_TYPE[record?.type]?.(record) || record?.name || 'Flow step'
}

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
        type: 'smoothstep',
      },
    ]
  })
}

export function getDescendantIds(records, nodeId) {
  const children = new Map()
  records.forEach((record) => {
    const parent = id(record.parentId)
    children.set(parent, [...(children.get(parent) || []), id(record.id)])
  })
  const found = []
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

export function layoutGraph(records) {
  const recordIds = new Set(records.map((record) => id(record.id)))
  const children = new Map()
  records.forEach((record) => {
    const parent = id(record.parentId)
    children.set(parent, [...(children.get(parent) || []), id(record.id)])
  })
  const roots = records
    .filter((record) => id(record.parentId) === '-1' || !recordIds.has(id(record.parentId)))
    .map((record) => id(record.id))
  const placed = new Set()
  const positions = {}
  let nextColumn = 0

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

export function buildFlowNodes(records, savedPositions = {}) {
  const layout = layoutGraph(records)
  return records.map((record) => {
    const nodeId = id(record.id)
    const displayOnly = record.type === 'trigger' || record.type === 'dateTimeConnector'
    const businessHours = record.type === 'dateTime' && record.data?.action === 'businessHours'
    return {
      id: nodeId,
      type: businessHours ? 'businessHours' : record.type,
      position: savedPositions[nodeId] || layout[nodeId] || { x: 0, y: 0 },
      data: { record, summary: getNodeSummary(record) },
      selectable: !displayOnly,
      draggable: !displayOnly,
      focusable: !displayOnly,
    }
  })
}
