/** @typedef {import('./types.js').NodeId} NodeId */
/** @typedef {import('./types.js').NodeRecord} NodeRecord */
/** @typedef {import('./types.js').Weekday} Weekday */

/** @type {Weekday[]} */
const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** @returns {import('./types.js').BusinessHourTime[]} */
function businessHourTimes() {
  return weekdays.map((day) => ({ day, startTime: '09:00', endTime: '17:00' }))
}

/**
 * @typedef {object} NodeDraft
 * @property {string} [title]
 * @property {string} [description]
 */

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

/**
 * @param {NodeId} parentId
 * @param {NodeDraft} [draft]
 * @returns {NodeRecord[]}
 */
function createComment(parentId, draft) {
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

/**
 * @param {NodeId} parentId
 * @param {NodeDraft} [draft]
 * @returns {NodeRecord[]}
 */
function createBusinessHours(parentId, draft) {
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
