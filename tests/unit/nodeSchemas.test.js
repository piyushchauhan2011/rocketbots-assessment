import { describe, expect, it } from 'vitest'

import {
  createNodeSchema,
  MAX_ATTACHMENT_BYTES,
  validateBusinessHours,
  validateMessagePayload,
  validateUpload,
} from '@/features/nodes/lib/nodeSchemas'

const hours = () =>
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => ({
    day,
    startTime: '09:00',
    endTime: '17:00',
  }))

describe('node validation', () => {
  it('accepts trimmed boundary values and rejects blank or overlong fields', () => {
    expect(
      createNodeSchema.safeParse({ title: ' A ', description: ' B ', type: 'sendMessage' }).success,
    ).toBe(true)
    expect(
      createNodeSchema.safeParse({ title: ' ', description: 'B', type: 'sendMessage' }).success,
    ).toBe(false)
    expect(
      createNodeSchema.safeParse({ title: 'A'.repeat(81), description: 'B', type: 'sendMessage' })
        .success,
    ).toBe(false)
    expect(
      createNodeSchema.safeParse({ title: 'A', description: 'B'.repeat(241), type: 'bad' }).success,
    ).toBe(false)
  })

  it('requires message content', () => {
    expect(validateMessagePayload([{ type: 'text', text: ' ' }])).toContain('at least one')
    expect(validateMessagePayload([{ type: 'attachment', attachment: 'x' }])).toBeNull()
  })

  it('validates upload type, size, count, and encoded total', () => {
    expect(validateUpload(new File(['x'], 'x.txt', { type: 'text/plain' }), [])).toContain('JPEG')
    expect(
      validateUpload(
        new File([new Uint8Array(MAX_ATTACHMENT_BYTES + 1)], 'x.png', { type: 'image/png' }),
        [],
      ),
    ).toContain('750')
    const four = Array.from({ length: 4 }, () => ({ type: 'attachment', attachment: 'https://x' }))
    expect(validateUpload(new File(['x'], 'x.png', { type: 'image/png' }), four)).toContain('four')
    const huge = [
      { type: 'attachment', attachment: `data:image/png;base64,${'a'.repeat(3 * 1024 * 1024)}` },
    ]
    expect(validateUpload(new File(['x'], 'x.png', { type: 'image/png' }), huge)).toContain('3 MiB')
  })

  it('validates all business hour invariants', () => {
    expect(validateBusinessHours(hours())).toBeNull()
    const equal = hours()
    equal[0].endTime = '09:00'
    expect(validateBusinessHours(equal)).toContain('earlier')
    const invalid = hours()
    invalid[0].startTime = '25:00'
    expect(validateBusinessHours(invalid)).toContain('valid')
    const duplicate = hours()
    duplicate[1].day = 'mon'
    expect(validateBusinessHours(duplicate)).toContain('once')
    expect(validateBusinessHours(hours().slice(1))).toContain('seven')
  })
})
