<script setup>
import { Clock3 } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: String, required: true },
  invalid: { type: Boolean, default: false },
  describedBy: { type: String, default: undefined },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const root = ref(/** @type {HTMLElement | null} */ (null))
const trigger = ref(/** @type {HTMLButtonElement | null} */ (null))
const times = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0')
  return `${hour}:${index % 2 ? '30' : '00'}`
})

/** @param {string} value */
function formatTime(value) {
  const [hour = '0', minute = '00'] = value.split(':')
  const hourNumber = Number(hour)
  const period = hourNumber < 12 ? 'AM' : 'PM'
  const displayHour = String(hourNumber % 12 || 12).padStart(2, '0')
  return `${displayHour}:${minute} ${period}`
}

/** @param {string} value */
async function pick(value) {
  emit('update:modelValue', value)
  open.value = false
  await nextTick()
  trigger.value?.focus()
}

/** @param {PointerEvent} event */
function onPointerDown(event) {
  if (!open.value || !root.value?.contains(/** @type {Node} */ (event.target))) open.value = false
}

/** @param {KeyboardEvent} event */
async function onKeydown(event) {
  if (event.key !== 'Escape' || !open.value) return
  event.stopPropagation()
  open.value = false
  await nextTick()
  trigger.value?.focus()
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
    <button
      :id="id"
      ref="trigger"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-label="`${label}: ${formatTime(modelValue)}`"
      :aria-controls="`${id}-times`"
      :aria-expanded="open"
      :aria-describedby="describedBy"
      :aria-invalid="invalid || undefined"
      class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm tabular-nums shadow-sm transition-colors hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/30"
      @click="open = !open"
    >
      <span>{{ formatTime(modelValue) }}</span>
      <Clock3 :size="14" class="shrink-0 text-slate-500" />
    </button>
    <ul
      v-if="open"
      :id="`${id}-times`"
      role="listbox"
      :aria-label="`${label} times`"
      class="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-background p-1 shadow-lg"
    >
      <li v-for="time in times" :key="time" role="presentation">
        <button
          type="button"
          role="option"
          class="flex w-full rounded-sm px-2 py-1.5 text-left text-sm tabular-nums hover:bg-muted focus-visible:bg-muted focus-visible:outline-none aria-selected:bg-muted aria-selected:font-medium"
          :aria-label="formatTime(time)"
          :aria-selected="time === modelValue"
          @click="pick(time)"
        >
          {{ formatTime(time) }}
        </button>
      </li>
    </ul>
  </div>
</template>
