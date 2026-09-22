<script setup>
import { computed, useAttrs } from 'vue'

import { cn } from '@/lib/utils'

import { buttonVariants } from '.'
/** @typedef {'link' | 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'} ButtonVariant */
/** @typedef {'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'} ButtonSize */
/** @typedef {import('vue').PropType<ButtonVariant>} ButtonVariantProp */
/** @typedef {import('vue').PropType<ButtonSize>} ButtonSizeProp */

const props = defineProps({
  variant: { type: /** @type {ButtonVariantProp} */ (String), default: undefined },
  size: { type: /** @type {ButtonSizeProp} */ (String), default: undefined },
  class: { type: String, default: undefined },
  as: { type: String, default: 'button' },
})

const attrs = useAttrs()
const isButtonElement = computed(() => props.as === 'button')
</script>

<template>
  <component
    :is="as"
    v-bind="attrs"
    :type="isButtonElement ? (attrs.type ?? 'button') : undefined"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </component>
</template>
