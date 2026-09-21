<script setup>
import { Handle, Position } from '@vue-flow/core'
import { Clock3, MessageSquare, MessageSquareText, Play, Split } from 'lucide-vue-next'
import { computed } from 'vue'

import { Card } from '@/components/ui/card'

defineOptions({ inheritAttrs: false })

const props = defineProps({ id: String, data: Object, selected: Boolean, nodeType: String })

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
const title = computed(() => props.data.record.name || config.value.label)

function activate() {
  if (editable.value) props.data.onOpen?.(props.id)
}
</script>

<template>
  <Handle v-if="nodeType !== 'trigger'" type="target" :position="Position.Top" />
  <Card
    :class="[
      'flow-node group w-[230px] overflow-hidden border-2 bg-card/95 shadow-lg shadow-slate-950/10 backdrop-blur transition-[box-shadow,transform] duration-200',
      editable && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/15',
      selected && 'shadow-xl ring-4 ring-primary/20',
    ]"
    :style="{ borderColor: config.color }"
    :role="editable ? 'button' : undefined"
    :tabindex="editable ? 0 : -1"
    :aria-label="editable ? `${config.label}: ${title}` : undefined"
    @dblclick="activate"
    @keydown.enter.prevent="activate"
    @keydown.space.prevent="activate"
  >
    <div class="flex items-center gap-2.5 border-b bg-muted/30 px-3 py-2.5">
      <span
        class="grid size-8 shrink-0 place-items-center rounded-lg text-white shadow-sm"
        :style="{ backgroundColor: config.color }"
      >
        <component :is="config.icon" :size="16" />
      </span>
      <span class="min-w-0">
        <span
          class="block text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
        >
          {{ config.label }}
        </span>
        <span class="block truncate text-sm font-semibold text-card-foreground">{{ title }}</span>
      </span>
    </div>
    <div
      class="line-clamp-2 min-h-[3.5rem] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
    >
      {{ data.summary }}
    </div>
  </Card>
  <Handle type="source" :position="Position.Bottom" />
</template>
