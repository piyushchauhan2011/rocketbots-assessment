import { ok } from 'neverthrow'
import { computed } from 'vue'
import { toast } from 'vue-sonner'

import {
  useReplaceNodesMutation,
  useUpdateNodeMutation,
} from '@/features/nodes/composables/useNodes'
import { useFlowUiStore } from '@/stores/flowUi'

/** @typedef {import('@/features/nodes/lib/types.js').FlowNodeCommand} FlowNodeCommand */

export function useFlowHistory() {
  const store = useFlowUiStore()
  const updateMutation = useUpdateNodeMutation()
  const replaceMutation = useReplaceNodesMutation()
  const busy = computed(() => updateMutation.isPending.value || replaceMutation.isPending.value)
  const canUndo = computed(() => store.undoStack.length > 0 && !busy.value)
  const canRedo = computed(() => store.redoStack.length > 0 && !busy.value)

  /**
   * @param {FlowNodeCommand} command
   * @param {'before' | 'after'} direction
   */
  async function apply(command, direction) {
    if (command.kind === 'move') {
      store.setPosition(command.nodeId, command[direction])
      return ok(undefined)
    }
    if (command.kind === 'graph') {
      const records = direction === 'before' ? command.beforeRecords : command.afterRecords
      const positions = direction === 'before' ? command.beforePositions : command.afterPositions
      const result = await replaceMutation.mutateResult(records)
      if (result.isOk()) store.replacePositions(positions)
      return result
    }
    const record = direction === 'before' ? command.beforeRecord : command.afterRecord
    return updateMutation.mutateResult(record)
  }
  async function undo() {
    if (!canUndo.value) return null
    const command = store.takeUndo()
    if (!command) return null
    const result = await apply(command, 'before')
    if (result.isErr()) {
      store.redoStack.pop()
      store.undoStack.push(command)
      toast.error(result.error.message)
      return null
    }
    return command
  }
  async function redo() {
    if (!canRedo.value) return null
    const command = store.takeRedo()
    if (!command) return null
    const result = await apply(command, 'after')
    if (result.isErr()) {
      store.undoStack.pop()
      store.redoStack.push(command)
      toast.error(result.error.message)
      return null
    }
    return command
  }
  return { canUndo, canRedo, undo, redo }
}
