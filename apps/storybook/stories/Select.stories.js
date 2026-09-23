import { FieldError } from '@rocketbots/ui/field-error'
import { Label } from '@rocketbots/ui/label'
import { Select } from '@rocketbots/ui/select'
import { ref } from 'vue'

const options = [
  { value: 'message', label: 'Send Message' },
  { value: 'comment', label: 'Add Comment' },
  { value: 'hours', label: 'Business Hours' },
]

export default { title: 'UI/Select', component: Select }

export const SelectableOptions = {
  render: () => ({
    components: { Label, Select },
    setup() {
      return { options, value: ref('message') }
    },
    template: `<div class="grid w-72 gap-2"><Label for="type">Node type</Label><Select id="type" v-model="value" :options="options" /></div>`,
  }),
}

export const Invalid = {
  render: () => ({
    components: { FieldError, Label, Select },
    setup() {
      return { options, value: ref('') }
    },
    template: `<div class="grid w-72 gap-2"><Label for="invalid-type">Node type</Label><Select id="invalid-type" v-model="value" :options="options" placeholder="Choose one" invalid described-by="select-error" /><FieldError id="select-error" message="Choose a node type" /></div>`,
  }),
}
