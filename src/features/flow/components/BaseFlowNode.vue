<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { Clock3, MessageSquare, MessageSquareText, Plus, Play, Split } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { Card } from '@/components/ui/card'
import type { NodeRecord } from '@/features/nodes/lib/types'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  id: string
  data: {
    record: NodeRecord
    summary: string
    hasChildren: boolean
    onOpen?: (nodeId: string) => void
    onCreate?: (parentId: string, type: 'sendMessage' | 'addComment' | 'businessHours') => void
  }
  selected: boolean
  nodeType: string
}>()

const config = computed(() => {
  const type = props.nodeType
  if (type === 'trigger') return { label: 'Trigger', color: '#2563eb', icon: Play }
  if (type === 'sendMessage')
    return { label: 'Send Message', color: '#0ea5e9', icon: MessageSquare }
  if (type === 'addComment')
    return { label: 'Add Comment', color: '#8b5cf6', icon: MessageSquareText }
  if (type === 'businessHours') return { label: 'Business Hours', color: '#16a34a', icon: Clock3 }
  return {
    label: props.data.record.data?.connectorType || 'Connector',
    color: '#64748b',
    icon: Split,
  }
})
const editable = computed(() => !['trigger', 'dateTimeConnector'].includes(props.nodeType))
const isConnectorNode = computed(() => props.nodeType === 'dateTimeConnector')
const title = computed(() => props.data.record.name || config.value.label)
const connectorLabel = computed(() =>
  props.nodeType === 'dateTimeConnector'
    ? props.data.record.data?.connectorType === 'success'
      ? 'Success'
      : 'Failure'
    : null,
)
const connectorFooterLabel = computed(() =>
  isConnectorNode.value ? '' : connectorLabel || 'Next step',
)
const canAddHours = computed(() => props.nodeType !== 'businessHours')
const addTriggerOffset = computed(() => {
  if (props.data.hasChildren) return isConnectorNode.value ? '44px' : '30px'
  return '10px'
})
const addStemStyle = computed(() => ({
  top: '100%',
  height: addTriggerOffset.value,
}))
const addTriggerStyle = computed(() => ({
  top: `calc(100% + ${addTriggerOffset.value})`,
}))
const addMenuStyle = computed(() => ({
  top: `calc(100% + ${addTriggerOffset.value} + 42px)`,
}))
const addContinuationStyle = computed(() => ({
  top: `calc(100% + ${addTriggerOffset.value} + 32px)`,
  height: '24px',
}))
const rootEl = ref<HTMLElement | null>(null)
const menuOpen = ref(false)

function activate() {
  if (editable.value) props.data.onOpen?.(props.id)
}
function addChild(type: 'sendMessage' | 'addComment' | 'businessHours') {
  menuOpen.value = false
  props.data.onCreate?.(props.id, type)
}
function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  menuOpen.value = false
}
function onWindowPointerDown(event: PointerEvent) {
  if (!menuOpen.value || !rootEl.value) return
  if (!rootEl.value.contains(event.target as Node)) menuOpen.value = false
}

onMounted(() => window.addEventListener('pointerdown', onWindowPointerDown))
onBeforeUnmount(() => window.removeEventListener('pointerdown', onWindowPointerDown))
</script>

<template>
  <div ref="rootEl" class="group flow-node-shell relative">
    <Handle
      v-if="nodeType !== 'trigger'"
      type="target"
      :position="Position.Top"
      class="!h-0 !w-0 !border-0 !bg-transparent"
    />
    <div
      v-if="isConnectorNode"
      class="flow-node flex min-w-[92px] justify-center"
      :class="selected && 'rounded-xl ring-4 ring-primary/20'"
    >
      <div
        class="rounded-lg border-2 border-slate-700 bg-background px-4 py-1.5 text-sm font-medium text-foreground shadow-sm"
      >
        {{ title }}
      </div>
    </div>
    <Card
      v-else
      :class="[
        'flow-node group w-[226px] overflow-hidden border-2 bg-card shadow-md shadow-slate-950/8 transition-[box-shadow,transform] duration-200',
        editable &&
          'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/12',
        selected && 'shadow-xl ring-4 ring-primary/20',
      ]"
      :style="{ borderColor: config.color }"
      :role="editable ? 'button' : undefined"
      :tabindex="editable ? 0 : -1"
      :aria-label="editable ? `${config.label}: ${title}` : undefined"
      @dblclick="activate"
      @keydown.enter.prevent="activate"
      @keydown.space.prevent="activate"
      @keydown.esc.prevent="closeMenu"
    >
      <div class="flex items-center gap-2.5 border-b bg-muted/20 px-3 py-2.5">
        <span
          class="grid size-7 shrink-0 place-items-center rounded-md text-white shadow-sm"
          :style="{ backgroundColor: config.color }"
        >
          <component :is="config.icon" :size="14" />
        </span>
        <span class="min-w-0">
          <span
            class="block text-[9px] font-semibold tracking-[0.2em] text-muted-foreground uppercase"
          >
            {{ config.label }}
          </span>
          <span class="block truncate text-[19px] leading-tight font-semibold text-card-foreground">
            {{ title }}
          </span>
        </span>
      </div>
      <div
        class="line-clamp-3 min-h-[3.1rem] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
      >
        {{ data.summary }}
      </div>
      <div class="flex items-center justify-between border-t bg-muted/10 px-3 py-1.5 text-[10px]">
        <span class="font-semibold tracking-wide text-muted-foreground uppercase">
          {{ nodeType === 'trigger' ? 'Start flow' : connectorFooterLabel }}
        </span>
      </div>
    </Card>
    <transition name="flow-add-menu">
      <div
        v-if="menuOpen"
        class="absolute left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-border/85 bg-background/98 p-1.5 shadow-xl shadow-slate-950/10 backdrop-blur"
        :style="addMenuStyle"
      >
        <button
          type="button"
          class="flow-add-option"
          aria-label="Add Message node"
          @click.stop="addChild('sendMessage')"
        >
          Message
        </button>
        <button
          type="button"
          class="flow-add-option"
          aria-label="Add Comment node"
          @click.stop="addChild('addComment')"
        >
          Comment
        </button>
        <button
          v-if="canAddHours"
          type="button"
          class="flow-add-option"
          aria-label="Add Business Hours node"
          @click.stop="addChild('businessHours')"
        >
          Hours
        </button>
      </div>
    </transition>
    <div
      class="pointer-events-none absolute left-1/2 z-20 w-3 -translate-x-1/2 bg-background/95"
      :style="addStemStyle"
    >
      <div class="mx-auto h-full w-0 border-l-2 border-dashed border-slate-400/95" />
    </div>
    <button
      type="button"
      :data-open="menuOpen ? 'true' : 'false'"
      class="flow-add-trigger absolute left-1/2 z-30 -translate-x-1/2 rounded-full border-2 border-foreground/80 bg-background text-foreground shadow-md transition-all duration-200 ease-out hover:scale-105 focus-visible:scale-105 data-[open=true]:scale-105"
      :style="addTriggerStyle"
      aria-label="Add node"
      @click.stop="toggleMenu"
    >
      <Plus :size="14" />
    </button>

    <div
      v-if="!data.hasChildren"
      class="pointer-events-none absolute left-1/2 w-px -translate-x-1/2 bg-slate-300/90"
      :style="addContinuationStyle"
    />
    <Handle type="source" :position="Position.Bottom" class="!h-0 !w-0 !border-0 !bg-transparent" />
  </div>
</template>
