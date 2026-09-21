import type { NodeId, NodeRecord, Weekday } from './types'

const weekdays: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function businessHourTimes() {
  return weekdays.map((day) => ({ day, startTime: '09:00', endTime: '17:00' }))
}

function createSendMessage(parentId: NodeId): NodeRecord[] {
  return [
    {
      id: crypto.randomUUID(),
      parentId,
      name: 'New Message',
      type: 'sendMessage',
      data: {
        description: 'Send a message to this path',
        payload: [{ type: 'text', text: '' }],
      },
    },
  ]
}

function createComment(parentId: NodeId): NodeRecord[] {
  return [
    {
      id: crypto.randomUUID(),
      parentId,
      name: 'New Comment',
      type: 'addComment',
      data: {
        description: 'Add an internal note',
        comment: '',
      },
    },
  ]
}

function createBusinessHours(parentId: NodeId): NodeRecord[] {
  const nodeId = crypto.randomUUID()
  const successId = crypto.randomUUID()
  const failureId = crypto.randomUUID()
  return [
    {
      id: nodeId,
      parentId,
      name: 'Business Hours',
      type: 'dateTime',
      data: {
        action: 'businessHours',
        description: 'Route by business hours',
        timezone: 'UTC',
        times: businessHourTimes(),
        connectors: [successId, failureId],
      },
    },
    {
      id: successId,
      parentId: nodeId,
      type: 'dateTimeConnector',
      name: 'Success',
      data: { connectorType: 'success' },
    },
    {
      id: failureId,
      parentId: nodeId,
      type: 'dateTimeConnector',
      name: 'Failure',
      data: { connectorType: 'failure' },
    },
  ]
}

export function createNodeRecords(
  parentId: NodeId,
  type: 'sendMessage' | 'addComment' | 'businessHours',
): NodeRecord[] {
  if (type === 'sendMessage') return createSendMessage(parentId)
  if (type === 'addComment') return createComment(parentId)
  return createBusinessHours(parentId)
}
