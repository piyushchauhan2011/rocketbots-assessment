import { getNodeSummary, layoutGraph } from '@rocketbots/core'

/** @typedef {import('@rocketbots/core/types').NodeRecord} NodeRecord */

/** @param {unknown} value @returns {string} */
function id(value) {
  return String(value)
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
 * @param {Record<string, import('@rocketbots/core/types').Position>} [savedPositions]
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
