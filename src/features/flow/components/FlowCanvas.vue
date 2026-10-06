<script setup>
import { Grid2X2 } from '@lucide/vue'
import { Background } from '@vue-flow/background'
import { ControlButton, Controls } from '@vue-flow/controls'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import { computed, nextTick, provide, reactive, ref, watch } from 'vue'

import { useFlowUiStore } from '@/stores/flowUi'

import { flowCanvasKey } from '../lib/canvasContext'
import { buildFlowEdges, buildFlowNodes, nextNodeId } from '../lib/graph'
import BaseFlowNode from './BaseFlowNode.vue'

/** @typedef {import('@/features/nodes/lib/types.js').NodeRecord} NodeRecord */
/** @typedef {import('@/features/nodes/lib/types.js').NodeId} NodeId */
/** @typedef {import('@/features/nodes/lib/types.js').Position} NodePosition */
/** @typedef {'up' | 'down' | 'left' | 'right'} MoveDirection */
/** @typedef {{ nodeId: string, position: NodePosition }} DragStart */
/** @typedef {{ node: { id: string, selectable?: boolean, position: NodePosition } }} FlowNodeEvent */

const FLOW_CANVAS_ID = 'flow-canvas'
const MOTION_MS = 280
/** Live coordinates while a branch is sliding. These override stored positions until the move finishes. */
const animatedPositions = reactive(/** @type {Record<string, NodePosition>} */ ({}))
/** @typedef {{ from: NodePosition, to: NodePosition, started: number }} BranchMotion */

/**
 * @param {string} nodeId
 * @param {BranchMotion} motion
 * @param {number} progress
 */
function paintBranch(nodeId, motion, progress) {
  const eased = 1 - (1 - progress) ** 3
  animatedPositions[nodeId] = {
    x: motion.from.x + (motion.to.x - motion.from.x) * eased,
    y: motion.from.y + (motion.to.y - motion.from.y) * eased,
  }
}

/**
 * @param {Map<string, BranchMotion>} motions
 * @param {number} timestamp
 * @param {string} draggingNodeId
 * @returns {boolean}
 */
function advanceBranchMotions(motions, timestamp, draggingNodeId) {
  const sample = motions.values().next().value
  if (sample && timestamp < sample.started) {
    motions.forEach((motion, nodeId) => paintBranch(nodeId, motion, 1))
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
    paintBranch(nodeId, motion, progress)
    if (progress >= 1) motions.delete(nodeId)
  })
  return motions.size > 0
}

/**
 * @param {{
 *   draggingNodeId: () => string,
 *   findNode: (nodeId: string) => { position: NodePosition } | undefined,
 * }} options
 */
function createBranchMotion(options) {
  /** @type {Map<string, BranchMotion>} */
  const motions = new Map()
  let running = false

  /** @param {number} timestamp */
  function step(timestamp) {
    const pending = advanceBranchMotions(motions, timestamp, options.draggingNodeId())
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

const props = /** @type {{ records: NodeRecord[] }} */ (
  defineProps({ records: { type: Array, required: true } })
)
const emit = defineEmits(['open-node', 'add-node'])
const store = useFlowUiStore()
const dragStart = ref(/** @type {DragStart | null} */ (null))
const showGrid = ref(true)
/** @type {Map<string, HTMLElement>} */
const nodeButtons = new Map()
const { findNode, getViewport, setCenter } = useVueFlow({ id: FLOW_CANVAS_ID })
const motion = createBranchMotion({
  draggingNodeId: () => dragStart.value?.nodeId || '',
  findNode,
})
watch(
  () => store.positions,
  (positions) => motion.sync(positions),
)

const nodes = computed(() =>
  buildFlowNodes(props.records, { ...store.positions, ...animatedPositions }).sort(
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
/** @param {string} nodeId */
function addNode(nodeId) {
  emit('add-node', nodeId)
}
/**
 * @param {string} nodeId
 * @param {HTMLElement | null} element
 */
function registerNode(nodeId, element) {
  if (element) nodeButtons.set(String(nodeId), element)
  else nodeButtons.delete(String(nodeId))
}
provide(flowCanvasKey, { openNode, addNode, moveNode: moveSelection, registerNode })
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

let focusRequest = 0
/** @param {NodeId} nodeId */
async function focusNode(nodeId) {
  const request = ++focusRequest
  await nextTick()
  if (request !== focusRequest) return
  nodeButtons.get(String(nodeId))?.focus()
}
/** @param {NodeId} nodeId */
async function revealNode(nodeId) {
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
defineExpose({ focusNode, revealNode })
</script>

<template>
  <VueFlow
    :id="FLOW_CANVAS_ID"
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
