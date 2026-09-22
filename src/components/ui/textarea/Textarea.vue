<script setup lang="ts">
import { useVModel } from '@vueuse/core'

import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: string
  defaultValue?: string | number
  modelValue?: string | number
}>()

const emits = defineEmits<{
  'update:modelValue': [value: string | number | undefined]
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <textarea
    v-model="modelValue"
    :class="
      cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/30',
        props.class,
      )
    "
  />
</template>
