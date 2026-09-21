<script setup lang="ts">
import { Clock3 } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { Input } from '@/components/ui/input'

const props = defineProps<{ id: string; label: string; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const times = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0')
  return `${hour}:${index % 2 ? '30' : '00'}`
})

function pick(value: string) {
  emit('update:modelValue', value)
  open.value = false
}
function onPointerDown(event: PointerEvent) {
  if (!open.value || !root.value?.contains(event.target as Node)) open.value = false
}
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return
  event.stopPropagation()
  open.value = false
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  root.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
})

onMounted(() => window.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => window.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="root" class="relative min-w-0 flex-1" @keydown="onKeydown">
    <Input
      :id="id"
      type="time"
      :aria-label="label"
      class="h-9 pr-9"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', String($event ?? ''))"
    />
    <button
      type="button"
      class="absolute top-1/2 right-1 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      :aria-label="`Open ${label} time list`"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Clock3 :size="14" />
    </button>
    <ul
      v-if="open"
      role="listbox"
      :aria-label="`${label} times`"
      class="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-background p-1 shadow-lg"
    >
      <li v-for="time in times" :key="time" role="presentation">
        <button
          type="button"
          role="option"
          class="flex w-full rounded-sm px-2 py-1.5 text-left text-sm tabular-nums hover:bg-muted focus-visible:bg-muted focus-visible:outline-none aria-selected:bg-muted aria-selected:font-medium"
          :aria-selected="time === modelValue"
          @click="pick(time)"
        >
          {{ time }}
        </button>
      </li>
    </ul>
  </div>
</template>
