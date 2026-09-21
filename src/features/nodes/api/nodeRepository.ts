import type { NodeRecord } from '../lib/types'

export const FLOW_STORAGE_KEY = 'rocketbots-flow:v1'
export const PAYLOAD_URL = '/api/payload'

function copy<T>(value: T): T {
  return structuredClone(value)
}

export function validateNodes(value: unknown): NodeRecord[] {
  if (!Array.isArray(value)) throw new Error('Flow payload must be an array')
  const ids = value.map((node) => String((node as NodeRecord | undefined)?.id))
  if (ids.some((id) => id === 'undefined')) throw new Error('Every node must have an ID')
  if (new Set(ids).size !== ids.length) throw new Error('Flow payload contains duplicate IDs')
  return value as NodeRecord[]
}

interface RepositoryOptions {
  fetchImpl?: typeof fetch
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

export function createNodeRepository({
  fetchImpl = fetch,
  storage = localStorage,
}: RepositoryOptions = {}) {
  return {
    async list() {
      const saved = storage.getItem(FLOW_STORAGE_KEY)
      if (saved !== null) return copy(validateNodes(JSON.parse(saved)))
      const response = await fetchImpl(PAYLOAD_URL)
      if (!response.ok) throw new Error(`Unable to load flow (${response.status})`)
      const nodes = validateNodes(await response.json())
      storage.setItem(FLOW_STORAGE_KEY, JSON.stringify(nodes))
      return copy(nodes)
    },
    async replace(nodes: NodeRecord[]) {
      validateNodes(nodes)
      storage.setItem(FLOW_STORAGE_KEY, JSON.stringify(nodes))
      return copy(nodes)
    },
    async clear() {
      storage.removeItem(FLOW_STORAGE_KEY)
    },
  }
}

export const nodeRepository = createNodeRepository()
