<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import { cn } from '@/lib/utils'

import { buttonVariants } from '.'

const props = withDefaults(
  defineProps<{
    variant?: string
    size?: string
    class?: string
    as?: string
  }>(),
  {
    as: 'button',
  },
)

const attrs = useAttrs()
const isButtonElement = computed(() => props.as === 'button')
</script>

<template>
  <component
    :is="as"
    v-bind="attrs"
    :type="isButtonElement ? ((attrs.type as string | undefined) ?? 'button') : undefined"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </component>
</template>
