<script setup lang="ts">
import { FieldError } from '@/components/ui/field-error'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

defineProps<{ modelValue: string; error?: string }>()
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
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? 'comment-body-error' : undefined"
        @update:model-value="$emit('update:modelValue', $event)"
      />
      <FieldError id="comment-body-error" :message="error" />
    </div>
  </section>
</template>
