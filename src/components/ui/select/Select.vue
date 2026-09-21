<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  id?: string
  modelValue: string
  options: { value: string; label: string }[]
  placeholder?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const selected = computed(() => props.options.find((option) => option.value === props.modelValue))
const listId = computed(() => (props.id ? `${props.id}-list` : undefined))

function close() {
  open.value = false
}
function choose(index: number) {
  const option = props.options[index]
  if (!option) return
  emit('update:modelValue', option.value)
  close()
  root.value?.querySelector<HTMLButtonElement>('button')?.focus()
}
function move(step: number) {
  const count = props.options.length
  activeIndex.value = (activeIndex.value + step + count) % count
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (!open.value) return
    event.stopPropagation()
    close()
    return
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) {
      open.value = true
      activeIndex.value = Math.max(
        0,
        props.options.findIndex((option) => option.value === props.modelValue),
      )
      return
    }
    move(event.key === 'ArrowDown' ? 1 : -1)
    return
  }
  if ((event.key === 'Enter' || event.key === ' ') && open.value) {
    event.preventDefault()
    choose(activeIndex.value)
  }
}
function onPointerDown(event: PointerEvent) {
  if (!open.value || !root.value?.contains(event.target as Node)) close()
}

onMounted(() => window.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => window.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="root" class="relative">
    <button
      :id="id"
      type="button"
      class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listId"
      @click="open = !open"
      @keydown="onKeydown"
    >
      <span class="truncate">{{ selected?.label || placeholder || 'Select' }}</span>
      <ChevronDown :size="16" class="text-muted-foreground" />
    </button>
    <ul
      v-if="open"
      :id="listId"
      role="listbox"
      class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background p-1 shadow-lg"
    >
      <li v-for="(option, index) in options" :key="option.value" role="presentation">
        <button
          type="button"
          role="option"
          class="flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          :aria-selected="option.value === modelValue"
          :class="index === activeIndex && 'bg-muted'"
          @click="choose(index)"
          @mouseenter="activeIndex = index"
        >
          {{ option.label }}
        </button>
      </li>
    </ul>
  </div>
</template>
