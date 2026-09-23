import { onBeforeUnmount, onMounted } from 'vue'

/**
 * @param {{ undo: () => void, redo: () => void }} callbacks
 */
export function useFlowShortcuts({ undo, redo }) {
  /** @param {EventTarget | null} target */
  function isEditing(target) {
    return (
      target instanceof Element &&
      Boolean(target.closest('input, textarea, select, [contenteditable], [role="dialog"], .sheet'))
    )
  }
  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    if (!(event.metaKey || event.ctrlKey) || isEditing(event.target)) return
    const key = event.key.toLowerCase()
    if (key === 'z' && event.shiftKey) {
      event.preventDefault()
      redo()
    } else if (key === 'z') {
      event.preventDefault()
      undo()
    } else if (key === 'y') {
      event.preventDefault()
      redo()
    }
  }
  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
