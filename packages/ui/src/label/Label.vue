<script setup>
import { cn } from '../utils'

const props = defineProps({
  for: { type: String, default: undefined },
  class: { type: String, default: undefined },
  as: { type: String, default: 'label' },
})
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
