<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <section class="mt-6 border-t pt-6">
    <div class="grid gap-2">
      <div class="flex items-center justify-between">
        <Label for="comment-body">Comment</Label>
        <span class="text-xs text-muted-foreground tabular-nums">{{ modelValue.length }}/1000</span>
      </div>
      <Textarea
        id="comment-body"
        class="min-h-32 resize-y"
        :model-value="modelValue"
        maxlength="1000"
        placeholder="Add a note for your team"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </div>
  </section>
</template>
