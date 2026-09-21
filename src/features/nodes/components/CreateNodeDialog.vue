<script setup>
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { layoutGraph } from '@/features/flow/lib/graph'
import { useFlowUiStore } from '@/stores/flowUi'

import { useCreateNodeMutation } from '../composables/useNodes'
import { createNodeSchema } from '../lib/nodeSchemas'

const props = defineProps({ open: Boolean, records: { type: Array, required: true } })
const emit = defineEmits(['close', 'created'])
const mutation = useCreateNodeMutation()
const store = useFlowUiStore()
const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: toTypedSchema(createNodeSchema),
  initialValues: { title: '', description: '', type: '' },
})
const [title, titleAttrs] = defineField('title')
const [description, descriptionAttrs] = defineField('description')
const [type, typeAttrs] = defineField('type')

function makeRecords(values) {
  const nodeId = crypto.randomUUID()
  const common = { id: nodeId, parentId: -1, name: values.title }
  if (values.type === 'sendMessage') {
    return [
      { ...common, type: 'sendMessage', data: { description: values.description, payload: [] } },
    ]
  }
  if (values.type === 'addComment') {
    return [
      {
        ...common,
        type: 'addComment',
        data: { description: values.description, comment: values.description },
      },
    ]
  }
  const successId = crypto.randomUUID()
  const failureId = crypto.randomUUID()
  const times = weekdays.map((day) => ({ day, startTime: '09:00', endTime: '17:00' }))
  return [
    {
      ...common,
      type: 'dateTime',
      data: {
        action: 'businessHours',
        description: values.description,
        timezone: 'UTC',
        times,
        connectors: [successId, failureId],
      },
    },
    {
      id: successId,
      parentId: nodeId,
      type: 'dateTimeConnector',
      name: 'Success',
      data: { connectorType: 'success' },
    },
    {
      id: failureId,
      parentId: nodeId,
      type: 'dateTimeConnector',
      name: 'Failure',
      data: { connectorType: 'failure' },
    },
  ]
}

function newPositions(created) {
  const computed = layoutGraph(props.records)
  const existing = { ...computed, ...store.positions }
  const nextX = Math.max(-280, ...Object.values(existing).map((position) => position.x)) + 280
  const root = created[0]
  const positions = { [root.id]: { x: nextX, y: 0 } }
  if (created.length === 3) {
    positions[created[1].id] = { x: nextX - 140, y: 190 }
    positions[created[2].id] = { x: nextX + 140, y: 190 }
  }
  return positions
}

const submit = handleSubmit(
  async (values) => {
    const created = makeRecords(values)
    const positions = newPositions(created)
    try {
      await mutation.mutateAsync(created)
      store.setPositions(positions)
      store.focusNode(created[0].id)
      resetForm()
      emit('created', created[0].id)
      toast.success(`${values.title} created`)
    } catch (error) {
      store.removePositions(Object.keys(positions))
      toast.error(error.message)
    }
  },
  ({ errors: invalid }) => {
    const first = Object.keys(invalid)[0]
    document.querySelector(`[name="${first}"]`)?.focus()
  },
)

function close() {
  if (!mutation.isPending.value) emit('close')
}
</script>

<template>
  <Dialog :open="open" @update:open="(nextOpen) => !nextOpen && close()">
    <DialogContent class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[520px]">
      <form @submit="submit">
        <DialogHeader>
          <DialogTitle id="create-title">Create New Node</DialogTitle>
          <DialogDescription>
            Add a new root step to your customer automation flow.
          </DialogDescription>
        </DialogHeader>
        <div class="mt-6 grid gap-5">
          <div class="grid gap-2">
            <Label for="create-name">Title</Label>
            <Input
              id="create-name"
              v-model="title"
              name="title"
              maxlength="80"
              placeholder="e.g. Welcome message"
              v-bind="titleAttrs"
              autofocus
            />
            <p v-if="errors.title" class="text-xs font-medium text-destructive" role="alert">
              {{ errors.title }}
            </p>
          </div>
          <div class="grid gap-2">
            <Label for="create-description">Description</Label>
            <Textarea
              id="create-description"
              v-model="description"
              name="description"
              maxlength="240"
              class="min-h-24 resize-y"
              placeholder="Describe what this step does"
              v-bind="descriptionAttrs"
            />
            <p v-if="errors.description" class="text-xs font-medium text-destructive" role="alert">
              {{ errors.description }}
            </p>
          </div>
          <div class="grid gap-2">
            <Label for="create-type">Type</Label>
            <select
              id="create-type"
              v-model="type"
              name="type"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              v-bind="typeAttrs"
            >
              <option value="" disabled>Select a type</option>
              <option value="sendMessage">Send Message</option>
              <option value="addComment">Add Comment</option>
              <option value="businessHours">Business Hours</option>
            </select>
            <p v-if="errors.type" class="text-xs font-medium text-destructive" role="alert">
              {{ errors.type }}
            </p>
          </div>
        </div>
        <DialogFooter class="mt-7">
          <Button
            type="button"
            variant="outline"
            :disabled="mutation.isPending.value"
            @click="close"
          >
            Cancel
          </Button>
          <Button :disabled="mutation.isPending.value">
            {{ mutation.isPending.value ? 'Creating…' : 'Create Node' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
