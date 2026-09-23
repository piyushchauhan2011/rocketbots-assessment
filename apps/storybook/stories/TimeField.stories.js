import { FieldError } from '@rocketbots/ui/field-error'
import { Label } from '@rocketbots/ui/label'
import { TimeField } from '@rocketbots/ui/time-field'
import { ref } from 'vue'

export default { title: 'UI/TimeField', component: TimeField }

export const Valid = {
  render: () => ({
    components: { Label, TimeField },
    setup() {
      return { value: ref('09:00') }
    },
    template: `<div class="grid w-64 gap-2"><Label for="start-time">Start</Label><TimeField id="start-time" v-model="value" label="Start" /></div>`,
  }),
}

export const Invalid = {
  render: () => ({
    components: { FieldError, Label, TimeField },
    setup() {
      return { value: ref('09:00') }
    },
    template: `<div class="grid w-64 gap-2"><Label for="end-time">End</Label><TimeField id="end-time" v-model="value" label="End" invalid described-by="time-error" /><FieldError id="time-error" message="Start time must be earlier than end time" /></div>`,
  }),
}
