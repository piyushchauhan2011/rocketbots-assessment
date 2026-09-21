<script setup>
import { computed } from 'vue'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps({
  times: { type: Array, required: true },
  timezone: { type: String, required: true },
})
const emit = defineEmits(['update:times', 'update:timezone'])
const labels = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
const timezones = computed(() => [
  ...new Set(['UTC', 'Asia/Kuala_Lumpur', browserTimezone].filter(Boolean)),
])

function update(index, field, value) {
  const next = props.times.map((time, itemIndex) =>
    itemIndex === index ? { ...time, [field]: value } : time,
  )
  emit('update:times', next)
}
</script>

<template>
  <section class="mt-6 grid gap-5 border-t pt-6">
    <div class="grid gap-2">
      <Label for="timezone">Timezone</Label>
      <Input
        id="timezone"
        list="timezone-list"
        :model-value="timezone"
        autocomplete="off"
        @update:model-value="emit('update:timezone', $event)"
      />
      <datalist id="timezone-list">
        <option v-for="zone in timezones" :key="zone" :value="zone" />
      </datalist>
    </div>
    <div class="overflow-hidden rounded-xl border bg-muted/20">
      <div
        v-for="(time, index) in times"
        :key="time.day"
        class="grid grid-cols-[3rem_1fr_1fr] items-end gap-2 border-b p-3 last:border-b-0"
      >
        <strong class="pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {{ labels[time.day] || time.day }}
        </strong>
        <div class="grid gap-1.5">
          <Label class="text-xs" :for="`start-${time.day}`">Start</Label>
          <Input
            :id="`start-${time.day}`"
            type="time"
            :model-value="time.startTime"
            @update:model-value="update(index, 'startTime', $event)"
          />
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs" :for="`end-${time.day}`">End</Label>
          <Input
            :id="`end-${time.day}`"
            type="time"
            :model-value="time.endTime"
            @update:model-value="update(index, 'endTime', $event)"
          />
        </div>
      </div>
    </div>
  </section>
</template>
