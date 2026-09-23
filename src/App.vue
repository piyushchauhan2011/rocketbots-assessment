<script setup>
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'

const TOAST_Z_INDEX = 60
</script>

<template>
  <div class="h-dvh overflow-hidden bg-background text-foreground">
    <RouterView />
  </div>
  <Toaster rich-colors position="bottom-left" :style="{ zIndex: TOAST_Z_INDEX }" />
</template>
