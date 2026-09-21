import { onBeforeUnmount, onMounted } from 'vue'

export function useFlowShortcuts({ undo, redo }: { undo: () => void; redo: () => void }) {
  function isEditing(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      Boolean(target.closest('input, textarea, select, [contenteditable], [role="dialog"], .sheet'))
    )
  }
  function onKeydown(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || isEditing(event.target)) return
    const key = event.key.toLowerCase()
    if (key === 'z' && event.shiftKey) {
      event.preventDefault()
      redo()
    } else if (key === 'z') {
      event.preventDefault()
      undo()
    } else if (key === 'y' && event.ctrlKey) {
      event.preventDefault()
      redo()
    }
  }
  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
