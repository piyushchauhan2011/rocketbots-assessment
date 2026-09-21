import { describe, expect, it, vi } from 'vitest'

import { createNodeRepository, FLOW_STORAGE_KEY } from '@/features/nodes/api/nodeRepository'

function storage(initial) {
  const values = new Map(initial ? [[FLOW_STORAGE_KEY, initial]] : [])
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn((key) => values.delete(key)),
  }
}

describe('node repository', () => {
  it('seeds from the remote payload once and returns defensive copies', async () => {
    const store = storage()
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [{ id: 1 }] }))
    const repository = createNodeRepository({ storage: store, fetchImpl })
    const first = await repository.list()
    first[0].id = 2
    expect(await repository.list()).toEqual([{ id: 1 }])
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(fetchImpl).toHaveBeenCalledWith('/api/payload')
  })

  it('reads persisted JSON without fetching', async () => {
    const fetchImpl = vi.fn()
    const repository = createNodeRepository({ storage: storage('[{"id":"saved"}]'), fetchImpl })
    expect(await repository.list()).toEqual([{ id: 'saved' }])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it.each([
    ['not an array', { value: {}, message: 'array' }],
    ['duplicate IDs', { value: [{ id: 1 }, { id: '1' }], message: 'duplicate' }],
    ['missing ID', { value: [{}], message: 'ID' }],
  ])('rejects %s', async (_name, scenario) => {
    const repository = createNodeRepository({
      storage: storage(),
      fetchImpl: async () => ({ ok: true, json: async () => scenario.value }),
    })
    await expect(repository.list()).rejects.toThrow(scenario.message)
  })

  it('surfaces fetch, parse, and quota failures', async () => {
    const failed = createNodeRepository({
      storage: storage(),
      fetchImpl: async () => ({ ok: false, status: 503 }),
    })
    await expect(failed.list()).rejects.toThrow('503')
    await expect(createNodeRepository({ storage: storage('{bad') }).list()).rejects.toThrow()
    const full = storage()
    full.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }
    await expect(createNodeRepository({ storage: full }).replace([{ id: 1 }])).rejects.toThrow(
      'Quota',
    )
  })

  it('replaces and clears snapshots', async () => {
    const store = storage('[]')
    const repository = createNodeRepository({ storage: store })
    await expect(repository.replace([{ id: 'next' }])).resolves.toEqual([{ id: 'next' }])
    await repository.clear()
    expect(store.removeItem).toHaveBeenCalledWith(FLOW_STORAGE_KEY)
  })
})
