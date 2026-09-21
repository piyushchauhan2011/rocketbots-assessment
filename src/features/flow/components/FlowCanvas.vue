<script setup>
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import { computed, nextTick, ref } from 'vue'

import { useFlowUiStore } from '@/stores/flowUi'

import { buildFlowEdges, buildFlowNodes } from '../lib/graph'
import BaseFlowNode from './BaseFlowNode.vue'

const props = defineProps({ records: { type: Array, required: true } })
const emit = defineEmits(['open-node'])
const store = useFlowUiStore()
const dragStart = ref(null)

const nodes = computed(() =>
  buildFlowNodes(props.records, store.positions).map((node) => ({
    ...node,
    data: { ...node.data, onOpen: openNode },
  })),
)
const edges = computed(() => buildFlowEdges(props.records))

function openNode(nodeId) {
  store.focusNode(nodeId)
  emit('open-node', nodeId)
}
function onNodeClick({ node }) {
  if (node.selectable !== false) openNode(node.id)
}
function onDragStart({ node }) {
  dragStart.value = { nodeId: node.id, position: { ...node.position } }
}
function onDragStop({ node }) {
  const before = dragStart.value?.position
  const after = { ...node.position }
  dragStart.value = null
  if (!before || (before.x === after.x && before.y === after.y)) return
  store.setPosition(node.id, after)
  store.record({ kind: 'move', nodeId: node.id, before, after })
}

async function focusNode(nodeId) {
  await nextTick()
  document.querySelector(`[data-id="${CSS.escape(String(nodeId))}"] .flow-node`)?.focus()
}
defineExpose({ focusNode })
</script>

<template>
  <VueFlow
    class="h-full w-full bg-[radial-gradient(circle_at_top_left,oklch(0.95_0.035_260),transparent_40%)]"
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
    <Background :gap="22" pattern-color="oklch(0.78 0.025 255)" :size="1.2" />
    <Controls />
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
