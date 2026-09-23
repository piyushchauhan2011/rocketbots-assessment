import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import { createNodeRepository, FLOW_STORAGE_KEY } from '@/features/nodes/api/nodeRepository'

/** @param {string | number} id @returns {import('@rocketbots/core/types').NodeRecord} */
function node(id) {
  return { id, parentId: -1, type: 'trigger', data: {} }
}

/** @param {string} [initial] */
function storage(initial) {
  /** @type {Map<string, string>} */
  const values = new Map(initial ? [[FLOW_STORAGE_KEY, initial]] : [])
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => {
      values.set(key, value)
    }),
    removeItem: vi.fn((key) => {
      values.delete(key)
    }),
  }
}

describe('node repository', () => {
  it('seeds from the remote payload once and returns defensive copies', async () => {
    const store = storage()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([node(1)]), { status: 200 }))
    const repository = createNodeRepository({ storage: store, fetchImpl })
    const first = await repository.list()
    expect(first.isOk()).toBe(true)
    if (first.isErr()) return
    first.value[0].id = 2
    const second = await repository.list()
    expect(second.isOk() && second.value).toEqual([node(1)])
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(fetchImpl).toHaveBeenCalledWith('/api/payload')
  })

  it('reads persisted JSON without fetching', async () => {
    const fetchImpl = vi.fn()
    const repository = createNodeRepository({ storage: storage('[{"id":"saved"}]'), fetchImpl })
    const result = await repository.list()
    expect(result.isOk() && result.value).toEqual([{ id: 'saved' }])
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('node repository results', () => {
  it.each([
    ['not an array', { value: {}, message: 'array' }],
    ['duplicate IDs', { value: [{ id: 1 }, { id: '1' }], message: 'duplicate' }],
    ['missing ID', { value: [{}], message: 'ID' }],
  ])('returns an error result for %s', async (_name, scenario) => {
    const repository = createNodeRepository({
      storage: storage(),
      fetchImpl: async () => new Response(JSON.stringify(scenario.value), { status: 200 }),
    })
    const result = await repository.list()
    expect(result.isErr() && result.error.message).toContain(scenario.message)
  })

  it('surfaces fetch, parse, and quota failures', async () => {
    const failed = createNodeRepository({
      storage: storage(),
      fetchImpl: async () => new Response(null, { status: 503 }),
    })
    const failedResult = await failed.list()
    expect(failedResult.isErr() && failedResult.error).toMatchObject({
      type: 'response',
      message: expect.stringContaining('503'),
    })
    const parseResult = await createNodeRepository({ storage: storage('{bad') }).list()
    expect(parseResult.isErr() && parseResult.error.type).toBe('parse')
    const full = storage()
    full.setItem.mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    const quotaResult = await createNodeRepository({ storage: full }).replace([node(1)])
    expect(quotaResult.isErr() && quotaResult.error).toMatchObject({
      type: 'storage',
      message: expect.stringContaining('Quota'),
    })
  })

  it('replaces and clears snapshots', async () => {
    const store = storage('[]')
    const repository = createNodeRepository({ storage: store })
    const replaced = await repository.replace([node('next')])
    expect(replaced.isOk() && replaced.value).toEqual([node('next')])
    const cleared = await repository.clear()
    expect(cleared.isOk()).toBe(true)
    expect(store.removeItem).toHaveBeenCalledWith(FLOW_STORAGE_KEY)
  })

  it('persists reactive query snapshots as plain records', async () => {
    const store = storage('[]')
    const repository = createNodeRepository({ storage: store })
    const result = await repository.replace(reactive([node('reactive')]))
    expect(result.isOk() && result.value).toEqual([node('reactive')])
  })
})
