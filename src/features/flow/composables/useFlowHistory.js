import { computed } from 'vue'
import { toast } from 'vue-sonner'

import { useUpdateNodeMutation } from '@/features/nodes/composables/useNodes'
import { useFlowUiStore } from '@/stores/flowUi'

export function useFlowHistory() {
  const store = useFlowUiStore()
  const updateMutation = useUpdateNodeMutation()
  const canUndo = computed(() => store.undoStack.length > 0 && !updateMutation.isPending.value)
  const canRedo = computed(() => store.redoStack.length > 0 && !updateMutation.isPending.value)

  async function apply(command, direction) {
    if (command.kind === 'move') {
      store.setPosition(command.nodeId, command[direction])
      return
    }
    const record = direction === 'before' ? command.beforeRecord : command.afterRecord
    await updateMutation.mutateAsync(record)
  }
  async function undo() {
    if (!canUndo.value) return
    const command = store.takeUndo()
    try {
      await apply(command, 'before')
    } catch (error) {
      store.redoStack.pop()
      store.undoStack.push(command)
      toast.error(error.message)
    }
  }
  async function redo() {
    if (!canRedo.value) return
    const command = store.takeRedo()
    try {
      await apply(command, 'after')
    } catch (error) {
      store.undoStack.pop()
      store.redoStack.push(command)
      toast.error(error.message)
    }
  }
  return { canUndo, canRedo, undo, redo }
}
