<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    for?: string
    class?: string
    as?: string
  }>(),
  { as: 'label' },
)
</script>

<template>
  <component
    :is="as"
    :for="for"
    :class="
      cn(
        'text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        props.class,
      )
    "
  >
    <slot />
  </component>
</template>
