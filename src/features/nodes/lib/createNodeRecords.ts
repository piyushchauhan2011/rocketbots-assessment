import type { NodeId, NodeRecord, Weekday } from './types'

const weekdays: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function businessHourTimes() {
  return weekdays.map((day) => ({ day, startTime: '09:00', endTime: '17:00' }))
}

export interface NodeDraft {
  title?: string
  description?: string
}

function drafted(fallbackName: string, fallbackDescription: string, draft?: NodeDraft) {
  return {
    name: draft?.title?.trim() || fallbackName,
    description: draft?.description?.trim() || fallbackDescription,
  }
}

function createSendMessage(parentId: NodeId, draft?: NodeDraft): NodeRecord[] {
  const content = drafted('New Message', 'Send a message to this path', draft)
  return [
    {
      id: crypto.randomUUID(),
      parentId,
      name: content.name,
      type: 'sendMessage',
      data: {
        description: content.description,
        payload: [{ type: 'text', text: content.description }],
      },
    },
  ]
}

function createComment(parentId: NodeId, draft?: NodeDraft): NodeRecord[] {
  const content = drafted('New Comment', 'Add an internal note', draft)
  return [
    {
      id: crypto.randomUUID(),
      parentId,
      name: content.name,
      type: 'addComment',
      data: {
        description: content.description,
        comment: content.description,
      },
    },
  ]
}

function createBusinessHours(parentId: NodeId, draft?: NodeDraft): NodeRecord[] {
  const nodeId = crypto.randomUUID()
  const successId = crypto.randomUUID()
  const failureId = crypto.randomUUID()
  const content = drafted('Business Hours', 'Route by business hours', draft)
  return [
    {
      id: nodeId,
      parentId,
      name: content.name,
      type: 'dateTime',
      data: {
        action: 'businessHours',
        description: content.description,
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
  draft?: NodeDraft,
): NodeRecord[] {
  if (type === 'sendMessage') return createSendMessage(parentId, draft)
  if (type === 'addComment') return createComment(parentId, draft)
  return createBusinessHours(parentId, draft)
}
