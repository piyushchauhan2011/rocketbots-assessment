<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import { computed, nextTick, ref } from 'vue'

import type { Position as NodePosition, NodeRecord } from '@/features/nodes/lib/types'
import { useFlowUiStore } from '@/stores/flowUi'

import { buildFlowEdges, buildFlowNodes } from '../lib/graph'
import BaseFlowNode from './BaseFlowNode.vue'

const props = defineProps<{ records: NodeRecord[] }>()
const emit = defineEmits<{
  'open-node': [nodeId: string]
  'create-node': [parentId: string, type: 'sendMessage' | 'addComment' | 'businessHours']
}>()
const store = useFlowUiStore()
const dragStart = ref<{ nodeId: string; position: NodePosition } | null>(null)

const nodes = computed(() =>
  buildFlowNodes(props.records, store.positions).map((node) => ({
    ...node,
    data: {
      ...node.data,
      onOpen: openNode,
      onCreate: (parentId: string, type: 'sendMessage' | 'addComment' | 'businessHours') =>
        emit('create-node', parentId, type),
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
defineExpose({ focusNode })
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
    <Background :gap="20" pattern-color="oklch(0.88 0.01 255)" :size="1" />
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
