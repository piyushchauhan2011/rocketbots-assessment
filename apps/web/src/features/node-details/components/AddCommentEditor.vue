<script setup>
import { FieldError } from '@rocketbots/ui/field-error'
import { Label } from '@rocketbots/ui/label'
import { Textarea } from '@rocketbots/ui/textarea'

defineProps({
  modelValue: { type: String, required: true },
  error: { type: String, default: undefined },
})
defineEmits(['update:modelValue'])
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
