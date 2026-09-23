<script setup>
import { CalendarDays, Clock3 } from '@lucide/vue'
import { FieldError } from '@rocketbots/ui/field-error'
import { Label } from '@rocketbots/ui/label'
import { Select } from '@rocketbots/ui/select'
import { TimeField } from '@rocketbots/ui/time-field'
import { Result } from 'neverthrow'
import { computed } from 'vue'

/** @typedef {import('@rocketbots/core/types').BusinessHoursValidation} BusinessHoursValidation */
/** @typedef {import('@rocketbots/core/types').BusinessHourTime} BusinessHourTime */
/** @typedef {import('@rocketbots/core/types').Weekday} Weekday */
/** @typedef {import('vue').PropType<BusinessHourTime[]>} BusinessHourTimesProp */
/** @typedef {import('vue').PropType<BusinessHoursValidation>} BusinessHoursValidationProp */

const props =
  /** @type {{ times: BusinessHourTime[], timezone: string, validation: BusinessHoursValidation, timezoneError?: string }} */ (
    defineProps({
      times: { type: /** @type {BusinessHourTimesProp} */ (Array), required: true },
      timezone: { type: String, required: true },
      validation: { type: /** @type {BusinessHoursValidationProp} */ (Object), required: true },
      timezoneError: { type: String, default: undefined },
    })
  )
const emit = defineEmits(['update:times', 'update:timezone'])
/** @type {Record<Weekday, string>} */
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

/** @param {string} zone */
function formatTimezone(zone) {
  const offset = Result.fromThrowable(
    () => {
      const raw =
        new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
          .formatToParts(new Date())
          .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
      const match = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
      return match ? `GMT${match[1]}${match[2].padStart(2, '0')}:${match[3] ?? '00'}` : 'GMT+00:00'
    },
    () => 'GMT+00:00',
  )().unwrapOr('GMT+00:00')
  const name = zone === 'UTC' ? 'UTC' : zone.replaceAll('_', ' ')
  return `(${offset}) ${name}`
}

const timezoneOptions = computed(() =>
  timezones.value.map((zone) => ({ value: zone, label: formatTimezone(zone) })),
)

/**
 * @param {number} index
 * @param {'startTime' | 'endTime'} field
 * @param {string} value
 */
function update(index, field, value) {
  const next = props.times.map((time, itemIndex) =>
    itemIndex === index ? { ...time, [field]: value } : time,
  )
  emit('update:times', next)
}
</script>

<template>
  <section class="mt-6 grid gap-4 border-t pt-6">
    <div
      class="grid grid-cols-[4.5rem_1fr] items-center px-1 text-xs font-medium text-muted-foreground"
    >
      <span class="inline-flex items-center gap-1.5">
        <CalendarDays :size="14" />
        Day
      </span>
      <span class="inline-flex items-center gap-1.5">
        <Clock3 :size="14" />
        Time
      </span>
    </div>
    <div class="overflow-hidden rounded-xl border bg-card">
      <div
        v-for="(time, index) in times"
        :key="time.day"
        class="grid grid-cols-[4.5rem_1fr] items-start gap-2 border-b px-3 py-2.5 last:border-b-0"
      >
        <span class="pt-2 text-sm font-medium text-card-foreground">
          {{ labels[time.day] || time.day }}
        </span>
        <div class="grid min-w-0 gap-1.5">
          <div class="flex min-w-0 items-center gap-2">
            <TimeField
              :id="`start-${time.day}`"
              label="Start"
              :model-value="time.startTime"
              :invalid="
                Boolean(
                  validation.rowErrors[index]?.startTime || validation.rowErrors[index]?.range,
                )
              "
              :described-by="
                validation.rowErrors[index]?.startTime || validation.rowErrors[index]?.range
                  ? `hours-${time.day}-error`
                  : undefined
              "
              @update:model-value="update(index, 'startTime', $event)"
            />
            <span class="shrink-0 text-sm text-muted-foreground">to</span>
            <TimeField
              :id="`end-${time.day}`"
              label="End"
              :model-value="time.endTime"
              :invalid="
                Boolean(validation.rowErrors[index]?.endTime || validation.rowErrors[index]?.range)
              "
              :described-by="
                validation.rowErrors[index]?.endTime || validation.rowErrors[index]?.range
                  ? `hours-${time.day}-error`
                  : undefined
              "
              @update:model-value="update(index, 'endTime', $event)"
            />
          </div>
          <FieldError
            :id="`hours-${time.day}-error`"
            :message="
              validation.rowErrors[index]?.startTime ||
              validation.rowErrors[index]?.endTime ||
              validation.rowErrors[index]?.range
            "
          />
        </div>
      </div>
    </div>
    <FieldError id="business-hours-error" :message="validation.formError" />
    <div class="grid gap-2">
      <Label for="timezone">Timezone</Label>
      <Select
        id="timezone"
        :model-value="timezone"
        :options="timezoneOptions"
        :invalid="Boolean(timezoneError)"
        :described-by="timezoneError ? 'timezone-error' : undefined"
        @update:model-value="emit('update:timezone', $event)"
      />
      <FieldError id="timezone-error" :message="timezoneError" />
    </div>
  </section>
</template>
