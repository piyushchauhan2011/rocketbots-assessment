<script setup>
defineProps({
  id: { type: String, required: true },
  message: { type: String, default: undefined },
})
</script>

<template>
  <p v-if="message" :id="id" class="text-xs font-medium text-destructive" role="alert">
    {{ message }}
  </p>
</template>
