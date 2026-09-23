<script setup>
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
</script>

<template>
  <div class="h-dvh overflow-hidden bg-background text-foreground">
    <RouterView />
  </div>
  <Toaster rich-colors position="bottom-right" style="z-index: 2147483647" />
</template>
