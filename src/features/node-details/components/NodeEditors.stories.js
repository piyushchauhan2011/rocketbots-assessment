import { computed, ref } from 'vue'

import { getBusinessHoursValidation } from '@/features/nodes/lib/nodeSchemas'

import AddCommentEditor from './AddCommentEditor.vue'
import BusinessHoursEditor from './BusinessHoursEditor.vue'
import SendMessageEditor from './SendMessageEditor.vue'

/** @type {import('@/features/nodes/lib/types.js').Weekday[]} */
const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
/** @type {import('@/features/nodes/lib/types.js').BusinessHourTime[]} */
const defaultTimes = weekdays.map((day) => ({ day, startTime: '09:00', endTime: '17:00' }))

export default {
  title: 'Flow/Node editors',
  parameters: { layout: 'centered' },
}

export const Message = {
  render: () => ({
    components: { SendMessageEditor },
    setup() {
      const payload = ref([
        { type: 'text', text: 'Thanks for reaching out. How can we help today?' },
      ])
      return { payload }
    },
    template: `
      <div class="w-[34rem] rounded-xl border bg-card p-6 shadow-sm">
        <h2 class="text-lg font-semibold">Send Message</h2>
        <SendMessageEditor v-model="payload" />
      </div>
    `,
  }),
}

export const MessageError = {
  render: () => ({
    components: { SendMessageEditor },
    setup: () => ({ payload: ref([{ type: 'text', text: '' }]) }),
    template: `
      <div class="w-[34rem] rounded-xl border bg-card p-6 shadow-sm">
        <h2 class="text-lg font-semibold">Send Message</h2>
        <SendMessageEditor v-model="payload" error="Add text or an image before saving" />
      </div>
    `,
  }),
}

export const Comment = {
  render: () => ({
    components: { AddCommentEditor },
    setup: () => ({ comment: ref('Escalate to the support team if the customer replies.') }),
    template: `
      <div class="w-[34rem] rounded-xl border bg-card p-6 shadow-sm">
        <h2 class="text-lg font-semibold">Add Comment</h2>
        <AddCommentEditor v-model="comment" />
      </div>
    `,
  }),
}

export const BusinessHours = {
  render: () => ({
    components: { BusinessHoursEditor },
    setup() {
      const times = ref(defaultTimes.map((time) => ({ ...time })))
      const timezone = ref('Asia/Kuala_Lumpur')
      const validation = computed(() => getBusinessHoursValidation(times.value))
      return { times, timezone, validation }
    },
    template: `
      <div class="w-[38rem] rounded-xl border bg-card p-6 shadow-sm">
        <h2 class="text-lg font-semibold">Business Hours</h2>
        <BusinessHoursEditor v-model:times="times" v-model:timezone="timezone" :validation="validation" />
      </div>
    `,
  }),
}
