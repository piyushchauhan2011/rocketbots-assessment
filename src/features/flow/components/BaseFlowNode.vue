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
const canAddHours = computed(() => props.nodeType !== 'businessHours')
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
  <div ref="rootEl" class="flow-node-shell relative w-[260px] pb-14">
    <Handle
      v-if="nodeType !== 'trigger'"
      type="target"
      :position="Position.Top"
      class="!h-px !min-h-0 !w-px !min-w-0 !border-0 !bg-transparent"
    />
    <div v-if="isConnectorNode" class="flow-node flex justify-center">
      <div
        class="rounded-full bg-[#3b82f6] px-4 py-1.5 text-sm font-medium text-white shadow-sm"
        :class="selected && 'ring-4 ring-sky-500/25'"
      >
        {{ title }}
      </div>
    </div>
    <Card
      v-else
      :class="[
        'flow-node w-full border-slate-200/90 bg-white py-0 shadow-md shadow-slate-900/[0.06]',
        editable && 'cursor-pointer transition-shadow duration-200 hover:shadow-lg',
        selected && 'ring-4 ring-sky-500/15',
      ]"
      :role="editable ? 'button' : undefined"
      :tabindex="editable ? 0 : -1"
      :aria-label="editable ? `${config.label}: ${title}` : undefined"
      @dblclick="activate"
      @keydown.enter.prevent="activate"
      @keydown.space.prevent="activate"
      @keydown.esc.prevent="closeMenu"
    >
      <div class="flex items-start gap-2.5 px-3.5 py-3">
        <span
          class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-white shadow-sm"
          :style="{ backgroundColor: config.color }"
        >
          <component :is="config.icon" :size="14" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] leading-5 font-semibold text-slate-900">
            {{ title }}
          </span>
          <span class="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-500">
            {{ data.summary }}
          </span>
        </span>
      </div>
    </Card>
    <div
      class="pointer-events-none absolute bottom-8 left-1/2 h-6 w-0.5 -translate-x-1/2 bg-[#f0a898]"
      aria-hidden="true"
    />
    <button
      type="button"
      :data-open="menuOpen ? 'true' : 'false'"
      class="flow-add-trigger absolute bottom-1 left-1/2 z-30 -translate-x-1/2 border-[#f0a898] bg-white text-slate-700 shadow-sm transition-transform duration-200 ease-out hover:scale-105 focus-visible:scale-105 data-[open=true]:scale-105"
      aria-label="Add node"
      @click.stop="toggleMenu"
    >
      <Plus :size="14" class="transition-transform duration-200" :class="menuOpen && 'rotate-45'" />
    </button>
    <transition name="flow-add-menu">
      <div
        v-if="menuOpen"
        class="flow-add-menu absolute bottom-0 left-[calc(50%+1.35rem)] z-40 flex items-center gap-1 rounded-2xl border border-border/85 bg-background/98 p-1.5 shadow-xl shadow-slate-950/10 backdrop-blur"
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
    <Handle
      type="source"
      :position="Position.Bottom"
      class="!bottom-1 !h-px !min-h-0 !w-px !min-w-0 !border-0 !bg-transparent"
    />
  </div>
</template>
