import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { ok, ResultAsync } from 'neverthrow'

import { nodeRepository } from '../api/nodeRepository'

/** @typedef {import('../lib/types.js').NodeId} NodeId */
/** @typedef {import('../lib/types.js').NodeRecord} NodeRecord */
/** @typedef {import('../api/nodeRepository.js').NodeRepositoryError} NodeRepositoryError */
/** @typedef {import('neverthrow').Result<NodeRecord[], NodeRepositoryError>} NodesResult */

/** @typedef {NodeRepositoryError | { type: 'mutation', message: string, cause?: unknown }} NodeMutationError */

/** @param {unknown} cause @returns {NodeMutationError} */
function mutationError(cause) {
  const message = cause instanceof Error ? cause.message : 'Unable to update flow'
  return { type: 'mutation', message, cause }
}

export const FLOW_NODES_QUERY_KEY = ['flow-nodes']

export function useNodesQuery() {
  return useQuery({
    queryKey: FLOW_NODES_QUERY_KEY,
    queryFn: async () => await nodeRepository.list(),
  })
}

/**
 * @template TVariables
 * @typedef {(nodes: NodeRecord[], variables: TVariables) => NodeRecord[]} NodesTransform
 */

/**
 * @template TVariables
 * @param {NodesTransform<TVariables>} transform
 */
function useReplaceMutation(transform) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async () => {
      const cached =
        /** @type {NodesResult | undefined} */ (queryClient.getQueryData(FLOW_NODES_QUERY_KEY)) ??
        ok([])
      const optimistic = cached.isOk() ? cached.value : []
      return await nodeRepository.replace(optimistic)
    },
    /** @param {TVariables} variables */
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: FLOW_NODES_QUERY_KEY })
      const previous =
        /** @type {NodesResult | undefined} */ (queryClient.getQueryData(FLOW_NODES_QUERY_KEY)) ??
        ok([])
      const nodes = previous.isOk() ? previous.value : []
      queryClient.setQueryData(FLOW_NODES_QUERY_KEY, ok(transform(nodes, variables)))
      return { previous }
    },
    onSuccess: (result, _variables, context) => {
      if (result.isErr() && context) {
        queryClient.setQueryData(FLOW_NODES_QUERY_KEY, context.previous)
      }
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(FLOW_NODES_QUERY_KEY, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FLOW_NODES_QUERY_KEY })
    },
  })
  return {
    ...mutation,
    /** @param {TVariables} variables */
    mutateResult(variables) {
      return ResultAsync.fromPromise(mutation.mutateAsync(variables), mutationError).andThen(
        (result) => result,
      )
    },
  }
}

export function useCreateNodeMutation() {
  return useReplaceMutation(
    /** @param {NodeRecord[]} nodes @param {NodeRecord[]} created */
    (nodes, created) => [...nodes, ...created],
  )
}

export function useUpdateNodeMutation() {
  return useReplaceMutation(
    /** @param {NodeRecord[]} nodes @param {NodeRecord} updated */
    (nodes, updated) =>
      nodes.map((node) => (String(node.id) === String(updated.id) ? updated : node)),
  )
}

export function useDeleteNodesMutation() {
  return useReplaceMutation(
    /** @param {NodeRecord[]} nodes @param {NodeId[]} ids */
    (nodes, ids) => {
      const removed = new Set(ids.map(String))
      return nodes.filter((node) => !removed.has(String(node.id)))
    },
  )
}

export function useReplaceNodesMutation() {
  return useReplaceMutation(
    /** @param {NodeRecord[]} _nodes @param {NodeRecord[]} replacement */
    (_nodes, replacement) => replacement,
  )
}
