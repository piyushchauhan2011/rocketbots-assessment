import { ref } from 'vue'

import { FieldError } from './field-error'
import { Input } from './input'
import { Label } from './label'
import { Select } from './select'
import { Textarea } from './textarea'
import TimeField from './time-picker/TimeField.vue'

const typeOptions = [
  { value: 'sendMessage', label: 'Send Message' },
  { value: 'addComment', label: 'Add Comment' },
  { value: 'businessHours', label: 'Business Hours' },
]

export default {
  title: 'UI/Form controls',
  component: Input,
  subcomponents: { FieldError, Label, Select, Textarea, TimeField },
  parameters: { layout: 'centered' },
}

export const Editable = {
  render: () => ({
    components: { Input, Label, Select, Textarea, TimeField },
    setup() {
      const title = ref('Welcome message')
      const description = ref('Send a greeting when a conversation opens.')
      const type = ref('sendMessage')
      const time = ref('09:00')
      return { description, time, title, type, typeOptions }
    },
    template: `
      <form class="grid w-96 gap-5 rounded-xl border bg-card p-5 shadow-sm" @submit.prevent>
        <div class="grid gap-2">
          <Label for="story-title">Title</Label>
          <Input id="story-title" v-model="title" />
        </div>
        <div class="grid gap-2">
          <Label for="story-description">Description</Label>
          <Textarea id="story-description" v-model="description" />
        </div>
        <div class="grid gap-2">
          <Label for="story-type">Node type</Label>
          <Select id="story-type" v-model="type" :options="typeOptions" />
        </div>
        <div class="grid gap-2">
          <Label for="story-time">Start time</Label>
          <TimeField id="story-time" v-model="time" label="Start time" />
        </div>
      </form>
    `,
  }),
}

export const ValidationErrors = {
  render: () => ({
    components: { FieldError, Input, Label, Textarea },
    template: `
      <form class="grid w-96 gap-5 rounded-xl border bg-card p-5 shadow-sm" @submit.prevent>
        <div class="grid gap-2">
          <Label for="invalid-title">Title</Label>
          <Input id="invalid-title" model-value="" aria-invalid="true" aria-describedby="invalid-title-error" />
          <FieldError id="invalid-title-error" message="Title is required" />
        </div>
        <div class="grid gap-2">
          <Label for="invalid-description">Description</Label>
          <Textarea id="invalid-description" model-value="" aria-invalid="true" aria-describedby="invalid-description-error" />
          <FieldError id="invalid-description-error" message="Description is required" />
        </div>
      </form>
    `,
  }),
}
