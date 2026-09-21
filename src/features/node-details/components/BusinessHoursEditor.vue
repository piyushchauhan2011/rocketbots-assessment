<script setup lang="ts">
import { CalendarDays, Clock3 } from 'lucide-vue-next'
import { computed } from 'vue'

import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import TimeField from '@/components/ui/time-picker/TimeField.vue'
import type { BusinessHourTime } from '@/features/nodes/lib/types'

const props = defineProps<{ times: BusinessHourTime[]; timezone: string }>()
const emit = defineEmits<{
  'update:times': [value: BusinessHourTime[]]
  'update:timezone': [value: string]
}>()
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

function formatTimezone(zone: string) {
  let offset = 'GMT+00:00'
  try {
    const raw =
      new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
        .formatToParts(new Date())
        .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
    const match = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
    if (match) {
      offset = `GMT${match[1]}${match[2].padStart(2, '0')}:${match[3] ?? '00'}`
    }
  } catch {
    offset = 'GMT+00:00'
  }
  const name = zone === 'UTC' ? 'UTC' : zone.replaceAll('_', ' ')
  return `(${offset}) ${name}`
}

const timezoneOptions = computed(() =>
  timezones.value.map((zone) => ({ value: zone, label: formatTimezone(zone) })),
)

function update(index: number, field: 'startTime' | 'endTime', value: string) {
  const next = props.times.map((time, itemIndex) =>
    itemIndex === index ? { ...time, [field]: value } : time,
  )
  emit('update:times', next)
}
</script>

<template>
  <section class="mt-6 grid gap-4 border-t pt-6">
    <div class="grid grid-cols-[4.5rem_1fr] items-center px-1 text-xs font-medium text-slate-500">
      <span class="inline-flex items-center gap-1.5">
        <CalendarDays :size="14" />
        Day
      </span>
      <span class="inline-flex items-center gap-1.5">
        <Clock3 :size="14" />
        Time
      </span>
    </div>
    <div class="overflow-hidden rounded-xl border bg-white">
      <div
        v-for="(time, index) in times"
        :key="time.day"
        class="grid grid-cols-[4.5rem_1fr] items-center gap-2 border-b px-3 py-2.5 last:border-b-0"
      >
        <span class="text-sm font-medium text-slate-700">
          {{ labels[time.day] || time.day }}
        </span>
        <div class="flex min-w-0 items-center gap-2">
          <TimeField
            :id="`start-${time.day}`"
            label="Start"
            :model-value="time.startTime"
            @update:model-value="update(index, 'startTime', $event)"
          />
          <span class="shrink-0 text-sm text-slate-400">to</span>
          <TimeField
            :id="`end-${time.day}`"
            label="End"
            :model-value="time.endTime"
            @update:model-value="update(index, 'endTime', $event)"
          />
        </div>
      </div>
    </div>
    <div class="grid gap-2">
      <Label for="timezone">Timezone</Label>
      <Select
        id="timezone"
        :model-value="timezone"
        :options="timezoneOptions"
        @update:model-value="emit('update:timezone', $event)"
      />
    </div>
  </section>
</template>
