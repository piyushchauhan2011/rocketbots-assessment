import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import CreateNodeDialog from '@/features/nodes/components/CreateNodeDialog.vue'

/** @type {import('@vue/test-utils').VueWrapper | undefined} */
let wrapper

afterEach(() => wrapper?.unmount())

function render(props = {}) {
  wrapper = mount(CreateNodeDialog, {
    attachTo: document.body,
    props: {
      allowHours: true,
      hasChild: true,
      parentName: 'Welcome message',
      ...props,
    },
  })
  return wrapper
}

describe('CreateNodeDialog', () => {
  it('shows validation errors and emits a trimmed valid node draft', async () => {
    const view = render()

    await view.get('form').trigger('submit')
    expect(view.text()).toContain('Title is required')
    expect(view.text()).toContain('Description is required')
    expect(view.emitted('create')).toBeUndefined()

    await view.get('#create-title').setValue('  Office hours  ')
    await view.get('#create-description').setValue('  Route contacts by schedule  ')
    await view.get('#create-type').trigger('click')
    await view.findAll('[role="option"]')[2].trigger('click')
    await view.get('form').trigger('submit')

    expect(view.emitted('create')).toEqual([
      [
        {
          title: 'Office hours',
          description: 'Route contacts by schedule',
          type: 'businessHours',
        },
      ],
    ])
  })

  it('describes insertion position and removes unavailable node types', async () => {
    const view = render({ allowHours: false, hasChild: false, parentName: 'Final note' })

    expect(view.text()).toContain('Adds this step after Final note.')
    await view.get('#create-type').trigger('click')
    expect(view.text()).not.toContain('Business Hours')
  })

  it('closes with Escape and restores the previously focused element', async () => {
    const returnTarget = document.createElement('button')
    document.body.append(returnTarget)
    returnTarget.focus()
    const view = render()

    await view.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })

    expect(view.emitted('close')).toHaveLength(1)
    expect(document.activeElement).toBe(returnTarget)
  })
  it('cycles focus within the modal in both directions', async () => {
    const view = render()
    const first = view.get('#create-title')
    const last = view.findAll('button').at(-1)
    if (!last) throw new Error('Missing create button')

    ;/** @type {HTMLElement} */ (first.element).focus()
    await view.get('[role="dialog"]').trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last.element)

    await view.get('[role="dialog"]').trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(first.element)
  })
})
