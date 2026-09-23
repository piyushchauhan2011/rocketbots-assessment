/** @typedef {import('./types').NodeDraft} NodeDraft */
/** @typedef {import('./types').NodeId} NodeId */
/** @typedef {import('./types').NodeRecord} NodeRecord */
/** @typedef {import('./types').Weekday} Weekday */

function randomId() {
  return /** @type {{ crypto: { randomUUID(): string } }} */ (
    /** @type {unknown} */ (globalThis)
  ).crypto.randomUUID()
}

/** @type {Weekday[]} */
const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** @returns {import('./types').BusinessHourTime[]} */
function businessHourTimes() {
  return weekdays.map((day) => ({ day, startTime: '09:00', endTime: '17:00' }))
}

/**
 * @param {string} fallbackName
 * @param {string} fallbackDescription
 * @param {NodeDraft} [draft]
 */
function drafted(fallbackName, fallbackDescription, draft) {
  return {
    name: draft?.title?.trim() || fallbackName,
    description: draft?.description?.trim() || fallbackDescription,
  }
}

/**
 * @param {NodeId} parentId
 * @param {NodeDraft} [draft]
 * @returns {NodeRecord[]}
 */
function createSendMessage(parentId, draft) {
  const content = drafted('New Message', 'Send a message to this path', draft)
  return [
    {
      id: randomId(),
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

/**
 * @param {NodeId} parentId
 * @param {NodeDraft} [draft]
 * @returns {NodeRecord[]}
 */
function createComment(parentId, draft) {
  const content = drafted('New Comment', 'Add an internal note', draft)
  return [
    {
      id: randomId(),
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

/**
 * @param {NodeId} parentId
 * @param {NodeDraft} [draft]
 * @returns {NodeRecord[]}
 */
function createBusinessHours(parentId, draft) {
  const nodeId = randomId()
  const successId = randomId()
  const failureId = randomId()
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

/**
 * @param {NodeId} parentId
 * @param {'sendMessage' | 'addComment' | 'businessHours'} type
 * @param {NodeDraft} [draft]
 * @returns {NodeRecord[]}
 */
export function createNodeRecords(parentId, type, draft) {
  if (type === 'sendMessage') return createSendMessage(parentId, draft)
  if (type === 'addComment') return createComment(parentId, draft)
  return createBusinessHours(parentId, draft)
}
