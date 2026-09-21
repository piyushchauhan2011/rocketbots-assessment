import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import { nodeRepository } from '../api/nodeRepository'
import type { NodeRecord } from '../lib/types'

export const FLOW_NODES_QUERY_KEY = ['flow-nodes']

export function useNodesQuery() {
  return useQuery({ queryKey: FLOW_NODES_QUERY_KEY, queryFn: () => nodeRepository.list() })
}

type NodesTransform<TVariables> = (nodes: NodeRecord[], variables: TVariables) => NodeRecord[]

function useReplaceMutation<TVariables>(transform: NodesTransform<TVariables>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const optimistic = (queryClient.getQueryData(FLOW_NODES_QUERY_KEY) ?? []) as NodeRecord[]
      return nodeRepository.replace(optimistic)
    },
    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey: FLOW_NODES_QUERY_KEY })
      const previous = (queryClient.getQueryData(FLOW_NODES_QUERY_KEY) ?? []) as NodeRecord[]
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
  return useReplaceMutation<NodeRecord[]>((nodes, created) => [...nodes, ...created])
}

export function useUpdateNodeMutation() {
  return useReplaceMutation<NodeRecord>((nodes, updated) =>
    nodes.map((node) => (String(node.id) === String(updated.id) ? updated : node)),
  )
}

export function useDeleteNodesMutation() {
  return useReplaceMutation<Array<string | number>>((nodes, ids) => {
    const removed = new Set(ids.map(String))
    return nodes.filter((node) => !removed.has(String(node.id)))
  })
}

export function useReplaceNodesMutation() {
  return useReplaceMutation<NodeRecord[]>((_nodes, replacement) => replacement)
}
