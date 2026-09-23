import { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow'

/** @typedef {import('../lib/types.js').NodeRecord} NodeRecord */
/**
 * @typedef {'invalid-payload' | 'network' | 'response' | 'parse' | 'storage'} NodeRepositoryErrorType
 * @typedef {{ type: NodeRepositoryErrorType, message: string, cause?: unknown }} NodeRepositoryError
 */

/**
 * @param {NodeRepositoryErrorType} type
 * @param {string} message
 * @param {unknown} [cause]
 * @returns {NodeRepositoryError}
 */
function repositoryError(type, message, cause) {
  return cause === undefined ? { type, message } : { type, message, cause }
}

/** @param {unknown} cause @param {string} fallback */
function errorMessage(cause, fallback) {
  return cause instanceof Error ? cause.message : fallback
}

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
 * @returns {import('neverthrow').Result<NodeRecord[], NodeRepositoryError>}
 */
export function validateNodes(value) {
  if (!Array.isArray(value)) {
    return err(repositoryError('invalid-payload', 'Flow payload must be an array'))
  }
  const ids = value.map((node) => String(/** @type {NodeRecord | undefined} */ (node)?.id))
  if (ids.some((id) => id === 'undefined')) {
    return err(repositoryError('invalid-payload', 'Every node must have an ID'))
  }
  if (new Set(ids).size !== ids.length) {
    return err(repositoryError('invalid-payload', 'Flow payload contains duplicate IDs'))
  }
  return ok(/** @type {NodeRecord[]} */ (value))
}

/**
 * @typedef {object} RepositoryOptions
 * @property {typeof fetch} [fetchImpl]
 * @property {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>} [storage]
 */

/** @param {RepositoryOptions} [options] */
export function createNodeRepository({ fetchImpl = fetch, storage = localStorage } = {}) {
  const readSaved = Result.fromThrowable(
    () => storage.getItem(FLOW_STORAGE_KEY),
    (cause) => repositoryError('storage', errorMessage(cause, 'Unable to read saved flow'), cause),
  )
  const parseSaved = Result.fromThrowable(
    (/** @type {string} */ serialized) => /** @type {unknown} */ (JSON.parse(serialized)),
    (cause) => repositoryError('parse', errorMessage(cause, 'Unable to parse saved flow'), cause),
  )
  const fetchPayload = ResultAsync.fromThrowable(
    () => fetchImpl(PAYLOAD_URL),
    (cause) => repositoryError('network', errorMessage(cause, 'Unable to load flow'), cause),
  )

  /**
   * @param {NodeRecord[]} nodes
   * @returns {import('neverthrow').Result<NodeRecord[], NodeRepositoryError>}
   */
  function persist(nodes) {
    return Result.fromThrowable(
      () => {
        const serialized = JSON.stringify(nodes)
        storage.setItem(FLOW_STORAGE_KEY, serialized)
        return /** @type {NodeRecord[]} */ (JSON.parse(serialized))
      },
      (cause) => repositoryError('storage', errorMessage(cause, 'Unable to save flow'), cause),
    )()
  }

  return {
    list() {
      const saved = readSaved()
      if (saved.isErr()) return errAsync(saved.error)
      if (saved.value !== null) {
        const nodes = parseSaved(saved.value).andThen(validateNodes).map(copy)
        return nodes.isErr() ? errAsync(nodes.error) : okAsync(nodes.value)
      }
      return fetchPayload()
        .andThen((response) =>
          response.ok
            ? ResultAsync.fromThrowable(
                () => response.json(),
                (cause) =>
                  repositoryError('parse', errorMessage(cause, 'Unable to parse flow'), cause),
              )()
            : errAsync(repositoryError('response', `Unable to load flow (${response.status})`)),
        )
        .andThen(validateNodes)
        .andThen(persist)
    },
    /** @param {NodeRecord[]} nodes */
    replace(nodes) {
      const validated = validateNodes(nodes).andThen(persist)
      return validated.isErr() ? errAsync(validated.error) : okAsync(validated.value)
    },
    clear() {
      const cleared = Result.fromThrowable(
        () => storage.removeItem(FLOW_STORAGE_KEY),
        (cause) =>
          repositoryError('storage', errorMessage(cause, 'Unable to clear saved flow'), cause),
      )()
      return cleared.isErr() ? errAsync(cleared.error) : okAsync(undefined)
    },
  }
}

export const nodeRepository = createNodeRepository()
