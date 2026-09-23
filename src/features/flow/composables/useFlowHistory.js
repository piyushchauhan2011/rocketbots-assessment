import { ok } from 'neverthrow'
import { computed } from 'vue'
import { toast } from 'vue-sonner'

import { useUpdateNodeMutation } from '@/features/nodes/composables/useNodes'
import { useFlowUiStore } from '@/stores/flowUi'

/** @typedef {import('@/features/nodes/lib/types.js').FlowNodeCommand} FlowNodeCommand */

export function useFlowHistory() {
  const store = useFlowUiStore()
  const updateMutation = useUpdateNodeMutation()
  const canUndo = computed(() => store.undoStack.length > 0 && !updateMutation.isPending.value)
  const canRedo = computed(() => store.redoStack.length > 0 && !updateMutation.isPending.value)

  /**
   * @param {FlowNodeCommand} command
   * @param {'before' | 'after'} direction
   */
  async function apply(command, direction) {
    if (command.kind === 'move') {
      store.setPosition(command.nodeId, command[direction])
      return ok(undefined)
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
