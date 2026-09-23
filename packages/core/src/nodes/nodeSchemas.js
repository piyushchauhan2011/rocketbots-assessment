import { z } from 'zod'

/** @typedef {import('./types').BusinessHoursValidation} BusinessHoursValidation */
/** @typedef {import('./types').BusinessHourRowErrors} BusinessHourRowErrors */
/** @typedef {import('./types').BusinessHourTime} BusinessHourTime */
/** @typedef {import('./types').MessagePayloadItem} MessagePayloadItem */

export const TITLE_MAX = 80
export const DESCRIPTION_MAX = 240
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const MAX_ATTACHMENT_BYTES = 750 * 1024
export const MAX_ATTACHMENTS = 4
export const MAX_ENCODED_BYTES = 3 * 1024 * 1024

export const createNodeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(TITLE_MAX, 'Title must be 80 characters or less'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(DESCRIPTION_MAX, 'Description must be 240 characters or less'),
  type: z.enum(['sendMessage', 'addComment', 'businessHours'], {
    error: 'Choose a node type',
  }),
})

/**
 * @param {MessagePayloadItem[]} payload
 * @returns {string | null}
 */
export function validateMessagePayload(payload) {
  const hasContent = payload.some(
    (item) => item.type === 'attachment' || (item.type === 'text' && item.text?.trim()),
  )
  return hasContent ? null : 'Add at least one message or attachment'
}

/**
 * @param {{ type: string, size: number }} file
 * @param {MessagePayloadItem[]} payload
 * @returns {string | null}
 */
export function validateUpload(file, payload) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Use a JPEG, PNG, WebP, or GIF image'
  if (file.size > MAX_ATTACHMENT_BYTES) return 'Each attachment must be 750 KiB or smaller'
  const attachments = payload.filter((item) => item.type === 'attachment')
  if (attachments.length >= MAX_ATTACHMENTS) return 'A message can contain at most four attachments'
  const encodedSize = attachments.reduce(
    (total, item) => total + (item.attachment?.startsWith('data:') ? item.attachment.length : 0),
    0,
  )
  if (encodedSize + Math.ceil((file.size * 4) / 3) > MAX_ENCODED_BYTES) {
    return 'Local attachments must total 3 MiB or less'
  }
  return null
}

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

/**
 * @param {BusinessHourTime[]} times
 * @returns {BusinessHoursValidation}
 */
export function getBusinessHoursValidation(times) {
  if (!Array.isArray(times)) {
    const formError = 'Business hours require seven weekdays'
    return { formError, rowErrors: [], firstError: formError }
  }

  /** @type {string[]} */
  const messages = []
  /** @type {string | undefined} */
  let formError
  if (times.length !== 7) {
    formError = 'Business hours require seven weekdays'
    messages.push(formError)
  }

  const days = new Set()
  const rowErrors = times.map((time) => {
    /** @type {BusinessHourRowErrors} */
    const errors = {}
    const validStart = TIME_PATTERN.test(time.startTime || '')
    const validEnd = TIME_PATTERN.test(time.endTime || '')

    if (!validStart) {
      errors.startTime = 'Enter a valid start time'
      messages.push(errors.startTime)
    }
    if (!validEnd) {
      errors.endTime = 'Enter a valid end time'
      messages.push(errors.endTime)
    }
    if (validStart && validEnd && time.startTime >= time.endTime) {
      errors.range = 'Start time must be earlier than end time'
      messages.push(errors.range)
    }
    if (days.has(time.day)) {
      const duplicateError = 'Each weekday must appear once'
      formError ||= duplicateError
      messages.push(duplicateError)
    }
    days.add(time.day)
    return errors
  })

  return { formError, rowErrors, firstError: messages[0] ?? null }
}

/**
 * @param {BusinessHourTime[]} times
 * @returns {string | null}
 */
export function validateBusinessHours(times) {
  return getBusinessHoursValidation(times).firstError
}
