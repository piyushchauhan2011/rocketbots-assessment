<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import { computed, defineComponent, nextTick, ref } from 'vue'

import type { Position as NodePosition, NodeRecord } from '@/features/nodes/lib/types'
import { useFlowUiStore } from '@/stores/flowUi'

import { buildFlowEdges, buildFlowNodes } from '../lib/graph'
import BaseFlowNode from './BaseFlowNode.vue'

const ViewportBridge = defineComponent({
  name: 'ViewportBridge',
  setup(_, { expose }) {
    const { findNode, getViewport, setCenter } = useVueFlow()
    async function centerOnNode(nodeId: string | number) {
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

const props = defineProps<{ records: NodeRecord[] }>()
const emit = defineEmits<{
  'open-node': [nodeId: string]
  'add-node': [parentId: string]
}>()
const store = useFlowUiStore()
const bridge = ref<{ revealNode: (nodeId: string | number) => Promise<void> } | null>(null)
const dragStart = ref<{ nodeId: string; position: NodePosition } | null>(null)

const nodes = computed(() =>
  buildFlowNodes(props.records, store.positions).map((node) => ({
    ...node,
    data: {
      ...node.data,
      onOpen: openNode,
      onAdd: (parentId: string) => emit('add-node', parentId),
    },
  })),
)
const edges = computed(() => buildFlowEdges(props.records))

function openNode(nodeId: string) {
  store.focusNode(nodeId)
  emit('open-node', nodeId)
}
function onNodeClick({ node }: { node: { selectable?: boolean; id: string } }) {
  if (node.selectable !== false) openNode(node.id)
}
function onDragStart({ node }: { node: { id: string; position: NodePosition } }) {
  dragStart.value = { nodeId: node.id, position: { ...node.position } }
}
function onDragStop({ node }: { node: { id: string; position: NodePosition } }) {
  const before = dragStart.value?.position
  const after = { ...node.position }
  dragStart.value = null
  if (!before || (before.x === after.x && before.y === after.y)) return
  store.setPosition(node.id, after)
  store.record({ kind: 'move', nodeId: node.id, before, after })
}

async function focusNode(nodeId: string | number) {
  await nextTick()
  document.querySelector(`[data-id="${CSS.escape(String(nodeId))}"] .flow-node`)?.focus()
}
async function revealNode(nodeId: string | number) {
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
