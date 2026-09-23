<script setup>
import { createNodeSchema } from '@rocketbots/core'
import { Button } from '@rocketbots/ui/button'
import { FieldError } from '@rocketbots/ui/field-error'
import { Input } from '@rocketbots/ui/input'
import { Label } from '@rocketbots/ui/label'
import { Select } from '@rocketbots/ui/select'
import { Textarea } from '@rocketbots/ui/textarea'
import { computed, onMounted, ref } from 'vue'

/** @typedef {'sendMessage' | 'addComment' | 'businessHours'} CreateNodeType */
/**
 * @typedef {object} CreateNodePayload
 * @property {string} title
 * @property {string} description
 * @property {CreateNodeType} type
 */

const props = defineProps({
  allowHours: { type: Boolean, required: true },
  parentName: { type: String, required: true },
  hasChild: { type: Boolean, required: true },
})
const emit = defineEmits(['close', 'create'])

const dialog = ref(/** @type {HTMLElement | null} */ (null))
const title = ref('')
const description = ref('')
const type = ref(/** @type {CreateNodeType} */ ('sendMessage'))
const submitted = ref(false)
const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

const typeOptions = [
  { value: 'sendMessage', label: 'Send Message' },
  { value: 'addComment', label: 'Add Comments' },
  ...(props.allowHours ? [{ value: 'businessHours', label: 'Business Hours' }] : []),
]

const validation = computed(() =>
  createNodeSchema.safeParse({
    title: title.value,
    description: description.value,
    type: type.value,
  }),
)
const errors = computed(() => {
  /** @type {Partial<Record<'title' | 'description' | 'type', string>>} */
  const fields = {}
  if (!submitted.value || validation.value.success) return fields
  for (const issue of validation.value.error.issues) {
    const field = /** @type {'title' | 'description' | 'type'} */ (issue.path[0])
    fields[field] ||= issue.message
  }
  return fields
})

function close() {
  emit('close')
  returnFocus?.focus()
}
function submit() {
  submitted.value = true
  const parsed = validation.value
  if (!parsed.success) return
  emit('create', /** @type {CreateNodePayload} */ (parsed.data))
}
/** @param {KeyboardEvent} event */
function trapFocus(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const items = [
    .../** @type {NodeListOf<HTMLElement>} */ (
      dialog.value.querySelectorAll('button, input, textarea')
    ),
  ].filter((item) => !item.hasAttribute('disabled'))
  const first = items[0]
  const last = items.at(-1)
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => document.getElementById('create-title')?.focus())
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" @keydown="trapFocus">
    <div
      ref="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-node-title"
      class="w-full max-w-md rounded-xl border bg-background p-5 shadow-xl"
    >
      <h2 id="create-node-title" class="text-lg font-semibold">Create new node</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {{
          hasChild
            ? `Inserts this step between ${parentName} and the next node.`
            : `Adds this step after ${parentName}.`
        }}
      </p>
      <form class="mt-4 grid gap-4" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="create-title">Title</Label>
          <Input
            id="create-title"
            v-model="title"
            maxlength="80"
            autocomplete="off"
            :aria-invalid="Boolean(errors.title)"
            :aria-describedby="errors.title ? 'create-title-error' : undefined"
          />
          <FieldError id="create-title-error" :message="errors.title" />
        </div>
        <div class="grid gap-2">
          <Label for="create-description">Description</Label>
          <Textarea
            id="create-description"
            v-model="description"
            maxlength="240"
            class="min-h-24 resize-y"
            :aria-invalid="Boolean(errors.description)"
            :aria-describedby="errors.description ? 'create-description-error' : undefined"
          />
          <FieldError id="create-description-error" :message="errors.description" />
        </div>
        <div class="grid gap-2">
          <Label for="create-type">Type of node</Label>
          <Select
            id="create-type"
            v-model="type"
            :options="typeOptions"
            :invalid="Boolean(errors.type)"
            :described-by="errors.type ? 'create-type-error' : undefined"
          />
          <FieldError id="create-type-error" :message="errors.type" />
        </div>
        <div class="flex justify-end gap-2">
          <Button type="button" variant="outline" @click="close">Cancel</Button>
          <Button type="submit">Create node</Button>
        </div>
      </form>
    </div>
  </div>
</template>
