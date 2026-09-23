import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import TimeField from '@/components/ui/time-picker/TimeField.vue'

/** @type {import('@vue/test-utils').VueWrapper | undefined} */
let wrapper

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => wrapper?.unmount())

describe('TimeField', () => {
  it('formats the current time and emits the selected half-hour value', async () => {
    wrapper = mount(TimeField, {
      attachTo: document.body,
      props: { id: 'start', label: 'Start', modelValue: '13:30' },
    })
    const trigger = wrapper.get('[role="combobox"]')

    expect(trigger.text()).toContain('01:30 PM')
    await trigger.trigger('click')
    expect(wrapper.get('[role="option"][aria-selected="true"]').attributes('aria-label')).toBe(
      '01:30 PM',
    )

    await wrapper.get('[role="option"][aria-label="02:00 PM"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['14:00']])
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
  })

  it('closes with Escape and preserves accessibility relationships', async () => {
    wrapper = mount(TimeField, {
      attachTo: document.body,
      props: {
        id: 'end',
        label: 'End',
        modelValue: '17:00',
        invalid: true,
        describedBy: 'end-error',
      },
    })
    const trigger = wrapper.get('[role="combobox"]')

    expect(trigger.attributes()).toMatchObject({
      'aria-invalid': 'true',
      'aria-describedby': 'end-error',
      'aria-label': 'End: 05:00 PM',
    })
    await trigger.trigger('click')
    await wrapper.get('div').trigger('keydown', { key: 'Escape' })

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('closes when a pointer event occurs outside the picker', async () => {
    wrapper = mount(TimeField, {
      attachTo: document.body,
      props: { id: 'outside', label: 'Start', modelValue: '09:00' },
    })
    const trigger = wrapper.get('[role="combobox"]')
    await trigger.trigger('click')

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(trigger.attributes('aria-expanded')).toBe('false')
  })
})
