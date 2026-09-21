<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createNodeSchema } from '@/features/nodes/lib/nodeSchemas'

const props = defineProps<{
  allowHours: boolean
  parentName: string
  hasChild: boolean
}>()
const emit = defineEmits<{
  close: []
  create: [
    value: {
      title: string
      description: string
      type: 'sendMessage' | 'addComment' | 'businessHours'
    },
  ]
}>()

const dialog = ref<HTMLElement | null>(null)
const title = ref('')
const description = ref('')
const type = ref<'sendMessage' | 'addComment' | 'businessHours'>('sendMessage')
const error = ref('')
const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

const typeOptions = [
  { value: 'sendMessage', label: 'Send Message' },
  { value: 'addComment', label: 'Add Comments' },
  ...(props.allowHours ? [{ value: 'businessHours', label: 'Business Hours' }] : []),
]

function close() {
  emit('close')
  returnFocus?.focus()
}
function submit() {
  const parsed = createNodeSchema.safeParse({
    title: title.value,
    description: description.value,
    type: type.value,
  })
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message || 'Check the form'
    return
  }
  error.value = ''
  emit('create', parsed.data)
}
function trapFocus(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const items = [...dialog.value.querySelectorAll<HTMLElement>('button, input, textarea')].filter(
    (item) => !item.hasAttribute('disabled'),
  )
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
          <Input id="create-title" v-model="title" maxlength="80" autocomplete="off" />
        </div>
        <div class="grid gap-2">
          <Label for="create-description">Description</Label>
          <Textarea
            id="create-description"
            v-model="description"
            maxlength="240"
            class="min-h-24 resize-y"
          />
        </div>
        <div class="grid gap-2">
          <Label for="create-type">Type of node</Label>
          <Select id="create-type" v-model="type" :options="typeOptions" />
        </div>
        <p
          v-if="error"
          class="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive"
          role="alert"
        >
          {{ error }}
        </p>
        <div class="flex justify-end gap-2">
          <Button type="button" variant="outline" @click="close">Cancel</Button>
          <Button type="submit">Create node</Button>
        </div>
      </form>
    </div>
  </div>
</template>
