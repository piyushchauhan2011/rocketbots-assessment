<script setup>
import { ImagePlus, Plus, Trash2 } from '@lucide/vue'
import { validateUpload } from '@rocketbots/core'
import { Button } from '@rocketbots/ui/button'
import { Card } from '@rocketbots/ui/card'
import { FieldError } from '@rocketbots/ui/field-error'
import { Label } from '@rocketbots/ui/label'
import { Textarea } from '@rocketbots/ui/textarea'
import { ResultAsync } from 'neverthrow'
import { ref } from 'vue'

/** @typedef {import('@rocketbots/core/types').MessagePayloadItem} MessagePayloadItem */
/** @typedef {import('vue').PropType<MessagePayloadItem[]>} MessagePayloadProp */

const props = /** @type {{ modelValue: MessagePayloadItem[], error?: string }} */ (
  defineProps({
    modelValue: { type: /** @type {MessagePayloadProp} */ (Array), required: true },
    error: { type: String, default: undefined },
  })
)
const emit = defineEmits(['update:modelValue'])
const uploadError = ref('')

/**
 * @param {number} index
 * @param {MessagePayloadItem} item
 */
function replace(index, item) {
  const next = props.modelValue.slice()
  next[index] = item
  emit('update:modelValue', next)
}
/** @param {number} index */
function remove(index) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_item, itemIndex) => itemIndex !== index),
  )
}
function appendText() {
  emit('update:modelValue', [...props.modelValue, { type: 'text', text: '' }])
}
/** @param {File} file */
function readFile(file) {
  const contents = new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  return ResultAsync.fromPromise(
    /** @type {Promise<string>} */ (contents),
    () => 'Could not read this image',
  )
}
/** @param {Event} event */
async function upload(event) {
  uploadError.value = ''
  /** @type {File[]} */
  const accepted = []
  const validationPayload = [...props.modelValue]
  const target = /** @type {HTMLInputElement} */ (event.target)
  for (const file of target.files || []) {
    const validation = validateUpload(file, validationPayload)
    if (validation) {
      uploadError.value = validation
      break
    }
    accepted.push(file)
    validationPayload.push({
      type: 'attachment',
      attachment: `data:image/preview;base64,${'x'.repeat(Math.ceil((file.size * 4) / 3))}`,
    })
  }
  const attachments = await ResultAsync.combine(accepted.map((file) => readFile(file)))
  if (attachments.isErr()) {
    uploadError.value = attachments.error
  } else {
    /** @type {MessagePayloadItem[]} */
    const additions = attachments.value.map((attachment) => ({ type: 'attachment', attachment }))
    emit('update:modelValue', [...props.modelValue, ...additions])
  }
  target.value = ''
}
</script>

<template>
  <section class="mt-6 grid gap-4 border-t pt-6">
    <div>
      <h3 class="text-sm font-semibold">Message content</h3>
      <p class="mt-1 text-xs text-muted-foreground">Text and images are sent in this order.</p>
      <FieldError id="message-content-error" :message="error" />
    </div>
    <Card
      v-for="(item, index) in modelValue"
      :key="index"
      class="message-item overflow-hidden border-border/70 p-3 shadow-none"
    >
      <template v-if="item.type === 'text'">
        <div class="grid gap-2">
          <Label :for="`message-${index}`">Text item {{ index + 1 }}</Label>
          <Textarea
            :id="`message-${index}`"
            class="min-h-24 resize-y"
            :model-value="item.text"
            :aria-invalid="Boolean(error && !item.text.trim())"
            :aria-describedby="error && !item.text.trim() ? 'message-content-error' : undefined"
            @update:model-value="replace(index, { ...item, text: $event })"
          />
        </div>
      </template>
      <div
        v-else-if="item.type === 'attachment'"
        class="attachment overflow-hidden rounded-lg border bg-muted"
      >
        <img
          class="block max-h-48 w-full object-cover"
          :src="item.attachment"
          :alt="`Attachment ${index + 1}`"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="mt-2 text-destructive"
        @click="remove(index)"
      >
        <Trash2 /> Remove
      </Button>
    </Card>
    <div class="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" @click="appendText">
        <Plus /> Add text
      </Button>
      <Button
        as="label"
        variant="outline"
        size="sm"
        for="attachment-upload"
        :class="uploadError && 'border-destructive text-destructive'"
      >
        <ImagePlus /> Add image
      </Button>
      <input
        id="attachment-upload"
        class="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        :aria-invalid="Boolean(uploadError)"
        :aria-describedby="uploadError ? 'attachment-upload-error' : undefined"
        @change="upload"
      />
    </div>
    <FieldError id="attachment-upload-error" :message="uploadError" />
  </section>
</template>
