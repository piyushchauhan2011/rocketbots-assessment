import { FieldError } from '@rocketbots/ui/field-error'
import { Input } from '@rocketbots/ui/input'
import { Label } from '@rocketbots/ui/label'
import { Textarea } from '@rocketbots/ui/textarea'
import { ref } from 'vue'

export default { title: 'UI/Form Fields' }

export const InputStates = {
  render: () => ({
    components: { FieldError, Input, Label },
    setup() {
      return { value: ref(''), invalid: ref('Invalid value') }
    },
    template: `<div class="grid w-80 gap-2"><Label for="name">Name</Label><Input id="name" v-model="value" placeholder="Enter a name" /><Label for="invalid">Invalid input</Label><Input id="invalid" aria-invalid="true" aria-describedby="input-error" /><FieldError id="input-error" :message="invalid" /><Label for="disabled">Disabled input</Label><Input id="disabled" disabled value="Unavailable" /></div>`,
  }),
}

export const TextareaStates = {
  render: () => ({
    components: { Label, Textarea },
    setup() {
      return { value: ref('Editable text') }
    },
    template: `<div class="grid w-80 gap-2"><Label for="notes">Notes</Label><Textarea id="notes" v-model="value" /><Label for="disabled-notes">Disabled</Label><Textarea id="disabled-notes" disabled model-value="Locked" /></div>`,
  }),
}
