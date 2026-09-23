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
      return
    }
    const record = direction === 'before' ? command.beforeRecord : command.afterRecord
    await updateMutation.mutateAsync(record)
  }
  async function undo() {
    if (!canUndo.value) return null
    const command = store.takeUndo()
    if (!command) return null
    try {
      await apply(command, 'before')
      return command
    } catch (error) {
      store.redoStack.pop()
      store.undoStack.push(command)
      toast.error(error instanceof Error ? error.message : String(error))
      return null
    }
  }
  async function redo() {
    if (!canRedo.value) return null
    const command = store.takeRedo()
    if (!command) return null
    try {
      await apply(command, 'after')
      return command
    } catch (error) {
      store.undoStack.pop()
      store.redoStack.push(command)
      toast.error(error instanceof Error ? error.message : String(error))
      return null
    }
  }
  return { canUndo, canRedo, undo, redo }
}
