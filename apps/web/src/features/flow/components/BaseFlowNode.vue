<script setup>
import { Clock3, MessageSquare, MessageSquareText, Plus, Play, Split } from '@lucide/vue'
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'

import { useFlowUiStore } from '@/stores/flowUi'

/** @typedef {import('@rocketbots/core/types').NodeRecord} NodeRecord */
/** @typedef {'up' | 'down' | 'left' | 'right'} MoveDirection */
/**
 * @typedef {object} FlowNodeData
 * @property {NodeRecord} record
 * @property {string} summary
 * @property {boolean} hasChildren
 * @property {(nodeId: string) => void} [onOpen]
 * @property {(parentId: string) => void} [onAdd]
 * @property {(nodeId: string, direction: MoveDirection) => void} [onMove]
 */

defineOptions({ inheritAttrs: false })

const props =
  /** @type {{ id: string, data: FlowNodeData, selected: boolean, nodeType: string }} */ (
    defineProps({
      id: { type: String, required: true },
      data: { type: Object, required: true },
      selected: { type: Boolean, required: true },
      nodeType: { type: String, required: true },
    })
  )

const config = computed(() => {
  const type = props.nodeType
  if (type === 'trigger') return { label: 'Trigger', color: '#f43f5e', icon: Play }
  if (type === 'sendMessage')
    return { label: 'Send Message', color: '#22c55e', icon: MessageSquare }
  if (type === 'addComment')
    return { label: 'Add Comment', color: '#64748b', icon: MessageSquareText }
  if (type === 'businessHours') return { label: 'Business Hours', color: '#ef4444', icon: Clock3 }
  return {
    label: props.data.record.data?.connectorType || 'Connector',
    color: '#3b82f6',
    icon: Split,
  }
})
const editable = computed(() => !['trigger', 'dateTimeConnector'].includes(props.nodeType))
const isConnectorNode = computed(() => props.nodeType === 'dateTimeConnector')
const title = computed(() => props.data.record.name || config.value.label)
const canAdd = computed(() => props.nodeType !== 'businessHours')
const store = useFlowUiStore()
const highlighted = computed(() => props.selected || store.focusedNodeId === props.id)
/** @type {Record<string, MoveDirection>} */
const arrows = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }

function activate() {
  if (editable.value) props.data.onOpen?.(props.id)
}
function requestCreate() {
  props.data.onAdd?.(props.id)
}
function rememberFocus() {
  if (store.focusedNodeId !== props.id) store.focusNode(props.id)
}
/** @param {KeyboardEvent} event */
function onArrows(event) {
  const direction = arrows[event.key]
  if (!direction) return
  event.preventDefault()
  event.stopPropagation()
  props.data.onMove?.(props.id, direction)
}
</script>

<template>
  <div class="flow-node-shell relative w-65 pb-14">
    <Handle
      v-if="nodeType !== 'trigger'"
      type="target"
      :position="Position.Top"
      class="h-px! min-h-0! w-px! min-w-0! border-0! bg-transparent"
    />
    <button
      v-if="isConnectorNode"
      type="button"
      class="flow-node mx-auto flex justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      tabindex="0"
      :aria-label="`${title} connector`"
      :class="highlighted && 'ring-4 ring-sky-500/25'"
      @focus="rememberFocus"
      @click.stop
      @keydown="onArrows"
    >
      <div class="rounded-full bg-[#3b82f6] px-4 py-1.5 text-sm font-medium text-white shadow-sm">
        {{ title }}
      </div>
    </button>
    <button
      v-else
      type="button"
      :class="[
        'flow-node w-full rounded-xl border border-border/70 bg-card py-0 text-left text-card-foreground shadow-md shadow-slate-900/6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        editable && 'cursor-pointer transition-shadow duration-200 hover:shadow-lg',
        highlighted && 'ring-4 ring-sky-500/15',
      ]"
      tabindex="0"
      :aria-label="editable ? `${config.label}: ${title}` : config.label"
      :aria-current="highlighted ? 'true' : undefined"
      @focus="rememberFocus"
      @click.stop="activate"
      @keydown="onArrows"
      @keydown.enter.prevent="activate"
      @keydown.space.prevent="activate"
    >
      <div class="flex items-start gap-2.5 px-3.5 py-3">
        <span
          class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-white shadow-sm"
          :style="{ backgroundColor: config.color }"
        >
          <component :is="config.icon" :size="14" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] leading-5 font-semibold text-card-foreground">
            {{ title }}
          </span>
          <span class="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">
            {{ data.summary }}
          </span>
        </span>
      </div>
    </button>
    <div
      class="pointer-events-none absolute bottom-0 left-1/2 h-14 w-0.5 -translate-x-1/2 bg-[#f0a898]"
      aria-hidden="true"
    />
    <button
      v-if="canAdd"
      type="button"
      class="flow-add-trigger absolute bottom-1 left-1/2 z-30 -translate-x-1/2 border-[#f0a898] text-foreground shadow-sm transition-transform duration-200 ease-out hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label="Add node"
      aria-haspopup="dialog"
      @click.stop="requestCreate"
    >
      <Plus :size="14" />
    </button>
    <Handle
      type="source"
      :position="Position.Bottom"
      class="bottom-1! h-px! min-h-0! w-px! min-w-0! border-0! bg-transparent!"
    />
  </div>
</template>
