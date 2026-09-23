<script setup>
import { nextNodeId } from '@rocketbots/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import { computed, defineComponent, nextTick, ref, watch } from 'vue'

import { useFlowUiStore } from '@/stores/flowUi'

import { buildFlowEdges, buildFlowNodes } from '../lib/vueFlowGraph'
import BaseFlowNode from './BaseFlowNode.vue'

/** @typedef {import('@rocketbots/core/types').NodeRecord} NodeRecord */
/** @typedef {import('@rocketbots/core/types').NodeId} NodeId */
/** @typedef {import('@rocketbots/core/types').Position} NodePosition */
/** @typedef {'up' | 'down' | 'left' | 'right'} MoveDirection */
/** @typedef {{ revealNode: (nodeId: NodeId) => Promise<void> }} ViewportBridgeSurface */
/** @typedef {{ nodeId: string, position: NodePosition }} DragStart */
/** @typedef {{ node: { id: string, selectable?: boolean, position: NodePosition } }} FlowNodeEvent */

const ViewportBridge = defineComponent({
  name: 'ViewportBridge',
  setup(_, { expose }) {
    const { findNode, getViewport, setCenter, updateNode } = useVueFlow()
    const store = useFlowUiStore()
    watch(
      () => store.positions,
      (positions) => {
        Object.entries(positions).forEach(([nodeId, position]) => {
          const node = findNode(nodeId)
          if (!node || (node.position.x === position.x && node.position.y === position.y)) return
          updateNode(nodeId, { position: { ...position } })
        })
      },
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

const nodes = computed(() =>
  buildFlowNodes(props.records, store.positions)
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
  dragStart.value = { nodeId: node.id, position: { ...node.position } }
}
/** @param {FlowNodeEvent} event */
function onDragStop({ node }) {
  const before = dragStart.value?.position
  const after = { ...node.position }
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
    <ViewportBridge ref="bridge" />
    <Background :gap="20" pattern-color="oklch(0.88 0.01 255)" :size="1" />
    <Controls position="bottom-right" />
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
