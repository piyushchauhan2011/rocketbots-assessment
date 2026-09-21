import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import { nodeRepository } from '../api/nodeRepository'

export const FLOW_NODES_QUERY_KEY = ['flow-nodes']

export function useNodesQuery() {
  return useQuery({ queryKey: FLOW_NODES_QUERY_KEY, queryFn: () => nodeRepository.list() })
}

function useReplaceMutation(transform) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const optimistic = queryClient.getQueryData(FLOW_NODES_QUERY_KEY) ?? []
      return nodeRepository.replace(optimistic)
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: FLOW_NODES_QUERY_KEY })
      const previous = queryClient.getQueryData(FLOW_NODES_QUERY_KEY) ?? []
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
  return useReplaceMutation((nodes, created) => [...nodes, ...created])
}

export function useUpdateNodeMutation() {
  return useReplaceMutation((nodes, updated) =>
    nodes.map((node) => (String(node.id) === String(updated.id) ? updated : node)),
  )
}

export function useDeleteNodesMutation() {
  return useReplaceMutation((nodes, ids) => {
    const removed = new Set(ids.map(String))
    return nodes.filter((node) => !removed.has(String(node.id)))
  })
}

export function useReplaceNodesMutation() {
  return useReplaceMutation((_nodes, replacement) => replacement)
}
