/** @typedef {import('../lib/types.js').NodeRecord} NodeRecord */

export const FLOW_STORAGE_KEY = 'rocketbots-flow:v1'
export const PAYLOAD_URL = '/api/payload'

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function copy(value) {
  return structuredClone(value)
}

/**
 * @param {unknown} value
 * @returns {NodeRecord[]}
 */
export function validateNodes(value) {
  if (!Array.isArray(value)) throw new Error('Flow payload must be an array')
  const ids = value.map((node) => String(/** @type {NodeRecord | undefined} */ (node)?.id))
  if (ids.some((id) => id === 'undefined')) throw new Error('Every node must have an ID')
  if (new Set(ids).size !== ids.length) throw new Error('Flow payload contains duplicate IDs')
  return /** @type {NodeRecord[]} */ (value)
}

/**
 * @typedef {object} RepositoryOptions
 * @property {typeof fetch} [fetchImpl]
 * @property {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>} [storage]
 */

/** @param {RepositoryOptions} [options] */
export function createNodeRepository({ fetchImpl = fetch, storage = localStorage } = {}) {
  return {
    async list() {
      const saved = storage.getItem(FLOW_STORAGE_KEY)
      if (saved !== null) return copy(validateNodes(/** @type {unknown} */ (JSON.parse(saved))))
      const response = await fetchImpl(PAYLOAD_URL)
      if (!response.ok) throw new Error(`Unable to load flow (${response.status})`)
      const nodes = validateNodes(await response.json())
      storage.setItem(FLOW_STORAGE_KEY, JSON.stringify(nodes))
      return copy(nodes)
    },
    /** @param {NodeRecord[]} nodes */
    async replace(nodes) {
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
