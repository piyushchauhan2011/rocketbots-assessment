import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import Select from '@/components/ui/select/Select.vue'

const options = [
  { value: 'message', label: 'Send Message' },
  { value: 'comment', label: 'Add Comment' },
  { value: 'hours', label: 'Business Hours' },
]

/** @type {import('@vue/test-utils').VueWrapper | undefined} */
let wrapper

afterEach(() => wrapper?.unmount())

describe('Select', () => {
  it('opens at the selected option and commits keyboard navigation', async () => {
    wrapper = mount(Select, {
      attachTo: document.body,
      props: { id: 'node-type', modelValue: 'comment', options },
    })
    const trigger = wrapper.get('[role="combobox"]')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[role="option"][aria-selected="true"]').text()).toBe('Add Comment')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await trigger.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:modelValue')).toEqual([['hours']])
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
  })

  it('supports pointer selection and closes when focus moves outside', async () => {
    wrapper = mount(Select, {
      attachTo: document.body,
      props: { modelValue: '', options, placeholder: 'Choose a node type' },
    })
    const trigger = wrapper.get('[role="combobox"]')

    expect(trigger.text()).toContain('Choose a node type')
    await trigger.trigger('click')
    await wrapper.get('[role="option"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['message']])

    await trigger.trigger('click')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('closes with Escape without changing the value', async () => {
    wrapper = mount(Select, { props: { modelValue: 'message', options } })
    const trigger = wrapper.get('[role="combobox"]')

    await trigger.trigger('click')
    await trigger.trigger('keydown', { key: 'Escape' })

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
