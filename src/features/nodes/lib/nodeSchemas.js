import { z } from 'zod'

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

export function validateMessagePayload(payload) {
  const hasContent = payload.some(
    (item) => item.type === 'attachment' || (item.type === 'text' && item.text?.trim()),
  )
  return hasContent ? null : 'Add at least one message or attachment'
}

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

export function validateBusinessHours(times) {
  if (!Array.isArray(times) || times.length !== 7) return 'Business hours require seven weekdays'
  const days = new Set()
  for (const time of times) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time.startTime || '')) return 'Enter a valid start time'
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time.endTime || '')) return 'Enter a valid end time'
    if (time.startTime >= time.endTime) return 'Start time must be earlier than end time'
    if (days.has(time.day)) return 'Each weekday must appear once'
    days.add(time.day)
  }
  return null
}
