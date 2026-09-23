import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import AddCommentEditor from '@/features/node-details/components/AddCommentEditor.vue'
import BusinessHoursEditor from '@/features/node-details/components/BusinessHoursEditor.vue'
import SendMessageEditor from '@/features/node-details/components/SendMessageEditor.vue'
import { getBusinessHoursValidation } from '@/features/nodes/lib/nodeSchemas'

/** @typedef {import('@/features/nodes/lib/types.js').BusinessHourTime} BusinessHourTime */
/** @typedef {import('@/features/nodes/lib/types.js').Weekday} Weekday */
/** @typedef {import('@/features/nodes/lib/types.js').MessagePayloadItem} MessagePayloadItem */

/** @type {Weekday[]} */
const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
/** @returns {BusinessHourTime[]} */
const hours = () => weekdays.map((day) => ({ day, startTime: '09:00', endTime: '17:00' }))

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => vi.unstubAllGlobals())

describe('AddCommentEditor', () => {
  it('reports length, validation, and edited content', async () => {
    const wrapper = mount(AddCommentEditor, {
      props: { modelValue: 'Needs review', error: 'Comment is required' },
    })

    expect(wrapper.text()).toContain('12/1000')
    expect(wrapper.get('[role="alert"]').text()).toBe('Comment is required')
    await wrapper.get('textarea').setValue('Escalate this contact')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Escalate this contact']])
  })
})

describe('SendMessageEditor', () => {
  it('edits, appends, and removes ordered message items', async () => {
    /** @type {MessagePayloadItem[]} */
    const payload = [
      { type: 'text', text: 'Hello' },
      { type: 'attachment', attachment: 'data:image/png;base64,eA==' },
    ]
    const wrapper = mount(SendMessageEditor, { props: { modelValue: payload } })

    await wrapper.get('textarea').setValue('Welcome')
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([
      { type: 'text', text: 'Welcome' },
      payload[1],
    ])

    const buttons = wrapper.findAll('button')
    await buttons.find((button) => button.text().includes('Add text'))?.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[1]?.[0]).toEqual([
      ...payload,
      { type: 'text', text: '' },
    ])

    await buttons.find((button) => button.text().includes('Remove'))?.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[2]?.[0]).toEqual([payload[1]])
  })
})

describe('SendMessageEditor uploads', () => {
  it('rejects unsupported uploads without changing the payload', async () => {
    const wrapper = mount(SendMessageEditor, { props: { modelValue: [] } })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [new File(['text'], 'note.txt', { type: 'text/plain' })],
    })

    await input.trigger('change')

    expect(wrapper.get('[role="alert"]').text()).toContain('JPEG')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('appends accepted images as data URLs', async () => {
    vi.stubGlobal(
      'FileReader',
      class {
        result = ''
        onload = () => {}
        onerror = () => {}
        readAsDataURL() {
          this.result = 'data:image/png;base64,aW1hZ2U='
          queueMicrotask(() => this.onload())
        }
      },
    )
    const wrapper = mount(SendMessageEditor, { props: { modelValue: [] } })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [new File(['image'], 'image.png', { type: 'image/png' })],
    })

    await input.trigger('change')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]?.[0]).toMatchObject({
      type: 'attachment',
      attachment: expect.stringMatching(/^data:image\/png;base64,/),
    })
  })
})

describe('SendMessageEditor read failures', () => {
  it('surfaces image read failures without changing the payload', async () => {
    vi.stubGlobal(
      'FileReader',
      class {
        result = ''
        onload = () => {}
        onerror = () => {}
        error = new DOMException('Read failed')
        readAsDataURL() {
          queueMicrotask(() => this.onerror())
        }
      },
    )
    const wrapper = mount(SendMessageEditor, { props: { modelValue: [] } })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [new File(['image'], 'image.png', { type: 'image/png' })],
    })

    await input.trigger('change')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Could not read this image')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('BusinessHoursEditor', () => {
  it('updates one schedule row without mutating the supplied records', async () => {
    const times = hours()
    const wrapper = mount(BusinessHoursEditor, {
      props: {
        times,
        timezone: 'UTC',
        validation: getBusinessHoursValidation(times),
      },
    })

    const start = wrapper.get('#start-mon')
    await start.trigger('click')
    await wrapper.get('[role="option"][aria-label="10:00 AM"]').trigger('click')

    const emitted = wrapper.emitted('update:times')?.[0]?.[0]
    expect(emitted?.[0]).toEqual({ day: 'mon', startTime: '10:00', endTime: '17:00' })
    expect(emitted?.[1]).toEqual(times[1])
    expect(times[0].startTime).toBe('09:00')
  })

  it('renders row errors and emits timezone changes', async () => {
    const times = hours()
    times[0].endTime = '09:00'
    const wrapper = mount(BusinessHoursEditor, {
      props: {
        times,
        timezone: 'UTC',
        validation: getBusinessHoursValidation(times),
        timezoneError: 'Choose an available timezone',
      },
    })

    expect(wrapper.text()).toContain('Start time must be earlier than end time')
    expect(wrapper.text()).toContain('Choose an available timezone')
    await wrapper.get('#timezone').trigger('click')
    const option = wrapper
      .findAll('[role="option"]')
      .find((item) => item.text().includes('Asia/Kuala Lumpur'))
    await option?.trigger('click')
    expect(wrapper.emitted('update:timezone')).toEqual([['Asia/Kuala_Lumpur']])
  })
})
