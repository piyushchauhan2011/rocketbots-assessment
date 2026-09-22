import { describe, expect, it } from 'vitest'

import { createNodeRecords } from '@/features/nodes/lib/createNodeRecords'

describe('createNodeRecords', () => {
  it('creates each supported node shape and links business-hour branches', () => {
    const [message] = createNodeRecords('parent', 'sendMessage', {
      title: '  Greeting  ',
      description: '  Hello there  ',
    })
    expect(message).toMatchObject({
      parentId: 'parent',
      name: 'Greeting',
      type: 'sendMessage',
      data: {
        description: 'Hello there',
        payload: [{ type: 'text', text: 'Hello there' }],
      },
    })

    const [comment] = createNodeRecords('parent', 'addComment')
    expect(comment).toMatchObject({
      parentId: 'parent',
      name: 'New Comment',
      type: 'addComment',
      data: { description: 'Add an internal note', comment: 'Add an internal note' },
    })

    const [hours, success, failure] = createNodeRecords('parent', 'businessHours', {
      title: 'Office Hours',
      description: 'Route by schedule',
    })
    expect(hours).toMatchObject({
      parentId: 'parent',
      name: 'Office Hours',
      type: 'dateTime',
      data: {
        action: 'businessHours',
        description: 'Route by schedule',
        timezone: 'UTC',
        connectors: [success.id, failure.id],
      },
    })
    expect(hours.data.times).toEqual([
      { day: 'mon', startTime: '09:00', endTime: '17:00' },
      { day: 'tue', startTime: '09:00', endTime: '17:00' },
      { day: 'wed', startTime: '09:00', endTime: '17:00' },
      { day: 'thu', startTime: '09:00', endTime: '17:00' },
      { day: 'fri', startTime: '09:00', endTime: '17:00' },
      { day: 'sat', startTime: '09:00', endTime: '17:00' },
      { day: 'sun', startTime: '09:00', endTime: '17:00' },
    ])
    expect(success).toMatchObject({
      parentId: hours.id,
      name: 'Success',
      type: 'dateTimeConnector',
      data: { connectorType: 'success' },
    })
    expect(failure).toMatchObject({
      parentId: hours.id,
      name: 'Failure',
      type: 'dateTimeConnector',
      data: { connectorType: 'failure' },
    })
  })
})
