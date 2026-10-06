<script setup>
import { Grid2X2 } from '@lucide/vue'
import { Background } from '@vue-flow/background'
import { ControlButton, Controls } from '@vue-flow/controls'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import { computed, defineComponent, nextTick, reactive, ref, watch } from 'vue'

import { useFlowUiStore } from '@/stores/flowUi'

import { buildFlowEdges, buildFlowNodes, nextNodeId } from '../lib/graph'
import BaseFlowNode from './BaseFlowNode.vue'

/** @typedef {import('@/features/nodes/lib/types.js').NodeRecord} NodeRecord */
/** @typedef {import('@/features/nodes/lib/types.js').NodeId} NodeId */
/** @typedef {import('@/features/nodes/lib/types.js').Position} NodePosition */
/** @typedef {'up' | 'down' | 'left' | 'right'} MoveDirection */
/** @typedef {{ revealNode: (nodeId: NodeId) => Promise<void> }} ViewportBridgeSurface */
/** @typedef {{ nodeId: string, position: NodePosition }} DragStart */
/** @typedef {{ node: { id: string, selectable?: boolean, position: NodePosition } }} FlowNodeEvent */

const MOTION_MS = 280
/** Live coordinates while a branch is sliding. These override stored positions until the move finishes. */
const animatedPositions = reactive(/** @type {Record<string, NodePosition>} */ ({}))
/** @typedef {{ from: NodePosition, to: NodePosition, started: number }} BranchMotion */

/**
 * @param {string} nodeId
 * @param {BranchMotion} motion
 * @param {number} progress
 * @param {(nodeId: string, position: NodePosition) => void} updateNode
 */
function paintBranch(nodeId, motion, progress, updateNode) {
  const eased = 1 - (1 - progress) ** 3
  const position = {
    x: motion.from.x + (motion.to.x - motion.from.x) * eased,
    y: motion.from.y + (motion.to.y - motion.from.y) * eased,
  }
  animatedPositions[nodeId] = position
  updateNode(nodeId, position)
}

/**
 * @param {Map<string, BranchMotion>} motions
 * @param {number} timestamp
 * @param {string} draggingNodeId
 * @param {(nodeId: string, position: NodePosition) => void} updateNode
 * @returns {boolean}
 */
function advanceBranchMotions(motions, timestamp, draggingNodeId, updateNode) {
  const sample = motions.values().next().value
  if (sample && timestamp < sample.started) {
    motions.forEach((motion, nodeId) => paintBranch(nodeId, motion, 1, updateNode))
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
    paintBranch(nodeId, motion, progress, updateNode)
    if (progress >= 1) motions.delete(nodeId)
  })
  return motions.size > 0
}

/**
 * @param {{
 *   draggingNodeId: () => string,
 *   findNode: (nodeId: string) => { position: NodePosition } | undefined,
 *   updateNode: (nodeId: string, position: NodePosition) => void,
 * }} options
 */
function createBranchMotion(options) {
  /** @type {Map<string, BranchMotion>} */
  const motions = new Map()
  let running = false

  /** @param {number} timestamp */
  function step(timestamp) {
    const pending = advanceBranchMotions(
      motions,
      timestamp,
      options.draggingNodeId(),
      options.updateNode,
    )
    if (pending) requestAnimationFrame(step)
    else running = false
  }

  /** @param {Record<string, NodePosition>} positions */
  function sync(positions) {
    const started = performance.now()
    Object.entries(positions).forEach(([nodeId, position]) => {
      if (nodeId === options.draggingNodeId()) return
      const node = options.findNode(nodeId)
      if (!node || (node.position.x === position.x && node.position.y === position.y)) return
      const origin = { x: node.position.x, y: node.position.y }
      animatedPositions[nodeId] = origin
      motions.set(nodeId, { from: origin, to: { ...position }, started })
    })
    if (!motions.size || running) return
    running = true
    requestAnimationFrame(step)
  }

  return { sync }
}

const ViewportBridge = defineComponent({
  name: 'ViewportBridge',
  props: {
    draggingNodeId: { type: String, default: '' },
  },
  setup(props, { expose }) {
    const { findNode, getViewport, setCenter, updateNode } = useVueFlow()
    const store = useFlowUiStore()
    const motion = createBranchMotion({
      draggingNodeId: () => props.draggingNodeId,
      findNode,
      updateNode: (nodeId, position) => updateNode(nodeId, { position }),
    })
    watch(
      () => store.positions,
      (positions) => motion.sync(positions),
    )
    /** @param {NodeId} nodeId */
    async function centerOnNode(nodeId) {
      await nextTick()
      let node = findNode(String(nodeId))
      if (!node?.dimensions?.width) {
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
        node = findNode(String(nodeId))
      }
      if (!node) return
      const width = node.dimensions?.width || 260
      const height = node.dimensions?.height || 140
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setCenter(node.position.x + width / 2, node.position.y + height / 2, {
        zoom: getViewport().zoom,
        duration: reduceMotion ? 0 : 280,
      })
    }
    expose({ revealNode: centerOnNode })
    return () => null
  },
})

const props = /** @type {{ records: NodeRecord[] }} */ (
  defineProps({ records: { type: Array, required: true } })
)
const emit = defineEmits(['open-node', 'add-node'])
const store = useFlowUiStore()
const bridge = ref(/** @type {ViewportBridgeSurface | null} */ (null))
const dragStart = ref(/** @type {DragStart | null} */ (null))
const showGrid = ref(true)

const nodes = computed(() =>
  buildFlowNodes(props.records, { ...store.positions, ...animatedPositions })
    .map((node) => ({
      ...node,
      data: {
        ...node.data,
        onOpen: openNode,
        onAdd: (/** @type {string} */ parentId) => emit('add-node', parentId),
        onMove: moveSelection,
      },
    }))
    .sort(
      (left, right) =>
        left.position.y - right.position.y ||
        left.position.x - right.position.x ||
        String(left.id).localeCompare(String(right.id)),
    ),
)
const edges = computed(() => buildFlowEdges(props.records))

/** @param {string} nodeId */
function openNode(nodeId) {
  store.focusNode(nodeId)
  emit('open-node', nodeId)
}
/**
 * @param {string} nodeId
 * @param {MoveDirection} direction
 */
function moveSelection(nodeId, direction) {
  const next = nextNodeId(props.records, nodeId, direction)
  if (!next) return
  store.focusNode(next)
  void focusNode(next)
}
/** @param {FlowNodeEvent} event */
function onNodeClick({ node }) {
  store.focusNode(node.id)
  void focusNode(node.id)
  if (node.selectable !== false) emit('open-node', node.id)
}
/** @param {FlowNodeEvent} event */
function onDragStart({ node }) {
  animatedPositions[node.id] = { ...node.position }
  dragStart.value = { nodeId: node.id, position: { ...node.position } }
}
/** @param {FlowNodeEvent} event */
function onDragStop({ node }) {
  const before = dragStart.value?.position
  const after = { ...node.position }
  animatedPositions[node.id] = after
  dragStart.value = null
  if (!before || (before.x === after.x && before.y === after.y)) return
  store.setPosition(node.id, after)
  store.record({ kind: 'move', nodeId: node.id, before, after })
}

/** @param {NodeId} nodeId */
async function focusNode(nodeId) {
  await nextTick()
  ;/** @type {HTMLElement | null} */ (
    document.querySelector(`[data-id="${CSS.escape(String(nodeId))}"] .flow-node`)
  )?.focus()
}
/** @param {NodeId} nodeId */
async function revealNode(nodeId) {
  await bridge.value?.revealNode(nodeId)
}
defineExpose({ focusNode, revealNode })
</script>

<template>
  <VueFlow
    class="h-full w-full bg-muted/20"
    :nodes="nodes"
    :edges="edges"
    :fit-view-on-init="true"
    :snap-to-grid="true"
    :snap-grid="[16, 16]"
    :min-zoom="0.25"
    :max-zoom="1.8"
    @node-click="onNodeClick"
    @node-drag-start="onDragStart"
    @node-drag-stop="onDragStop"
  >
    <ViewportBridge ref="bridge" :dragging-node-id="dragStart?.nodeId || ''" />
    <Background v-if="showGrid" :gap="20" pattern-color="oklch(0.88 0.01 255)" :size="1" />
    <Controls position="bottom-right">
      <ControlButton
        aria-label="Toggle canvas grid"
        :aria-pressed="showGrid"
        :title="showGrid ? 'Hide canvas grid' : 'Show canvas grid'"
        @click="showGrid = !showGrid"
      >
        <Grid2X2 aria-hidden="true" />
      </ControlButton>
    </Controls>
    <template #node-trigger="slotProps"
      ><BaseFlowNode v-bind="slotProps" node-type="trigger"
    /></template>
    <template #node-sendMessage="slotProps"
      ><BaseFlowNode v-bind="slotProps" node-type="sendMessage"
    /></template>
    <template #node-addComment="slotProps"
      ><BaseFlowNode v-bind="slotProps" node-type="addComment"
    /></template>
    <template #node-businessHours="slotProps"
      ><BaseFlowNode v-bind="slotProps" node-type="businessHours"
    /></template>
    <template #node-dateTimeConnector="slotProps"
      ><BaseFlowNode v-bind="slotProps" node-type="dateTimeConnector"
    /></template>
  </VueFlow>
</template>
