<script setup>
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
</script>

<template>
  <div class="h-dvh overflow-hidden bg-background text-foreground">
    <RouterView />
    <Toaster rich-colors position="bottom-right" />
  </div>
</template>
