import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import { nodeRepository } from '../api/nodeRepository'

/** @typedef {import('../lib/types.js').NodeId} NodeId */
/** @typedef {import('../lib/types.js').NodeRecord} NodeRecord */

export const FLOW_NODES_QUERY_KEY = ['flow-nodes']

export function useNodesQuery() {
  return useQuery({ queryKey: FLOW_NODES_QUERY_KEY, queryFn: () => nodeRepository.list() })
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
  return useMutation({
    mutationFn: async () => {
      const optimistic =
        /** @type {NodeRecord[] | undefined} */ (queryClient.getQueryData(FLOW_NODES_QUERY_KEY)) ??
        []
      return nodeRepository.replace(optimistic)
    },
    /** @param {TVariables} variables */
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: FLOW_NODES_QUERY_KEY })
      const previous =
        /** @type {NodeRecord[] | undefined} */ (queryClient.getQueryData(FLOW_NODES_QUERY_KEY)) ??
        []
      queryClient.setQueryData(FLOW_NODES_QUERY_KEY, transform(previous, variables))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(FLOW_NODES_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: FLOW_NODES_QUERY_KEY }),
  })
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
