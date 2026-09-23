<script setup>
import { Redo2, RotateCcw, Undo2 } from '@lucide/vue'
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useFlowHistory } from '@/features/flow/composables/useFlowHistory'
import { useFlowShortcuts } from '@/features/flow/composables/useFlowShortcuts'
import {
  missingLayoutPositions,
  positionsForAddedNodes,
  spliceNodes,
} from '@/features/flow/lib/graph'
import { useNodesQuery, useReplaceNodesMutation } from '@/features/nodes/composables/useNodes'
import { createNodeRecords } from '@/features/nodes/lib/createNodeRecords'
import { useFlowUiStore } from '@/stores/flowUi'
const FlowCanvas = defineAsyncComponent(() => import('@/features/flow/components/FlowCanvas.vue'))
const NodeDetailsSheet = defineAsyncComponent(
  () => import('@/features/node-details/components/NodeDetailsSheet.vue'),
)
const CreateNodeDialog = defineAsyncComponent(
  () => import('@/features/nodes/components/CreateNodeDialog.vue'),
)

/** @typedef {import('@/features/nodes/lib/createNodeRecords.js').NodeDraft} NodeDraft */
/** @typedef {import('@/features/nodes/lib/types.js').FlowNodeCommand} FlowNodeCommand */
/** @typedef {import('@/features/nodes/lib/types.js').NodeRecord} NodeRecord */
/** @typedef {'sendMessage' | 'addComment' | 'businessHours'} CreateNodeType */
/** @typedef {{ focusNode: (nodeId: string) => Promise<void>, revealNode: (nodeId: string) => Promise<void> }} FlowCanvasSurface */

const route = useRoute()
const router = useRouter()
const canvas = ref(/** @type {FlowCanvasSurface | null} */ (null))
const canvasElement = ref(/** @type {HTMLElement | null} */ (null))
const createParentId = ref(/** @type {string | null} */ (null))
const shouldLoadCanvas = ref(false)
const shouldLoadNodeDetails = ref(route.name === 'node-details')
watch(
  () => route.name,
  (name) => {
    if (name === 'node-details') shouldLoadNodeDetails.value = true
  },
)
/** @type {IntersectionObserver | null} */
let canvasObserver = null
let cancelCanvasLoad = () => {}
const store = useFlowUiStore()
const { canUndo, canRedo, undo, redo } = useFlowHistory()

/** @param {() => Promise<FlowNodeCommand | null>} action */
async function runHistory(action) {
  const command = await action()
  if (command?.kind !== 'move') return
  store.focusNode(command.nodeId)
  await canvas.value?.focusNode(command.nodeId)
  await canvas.value?.revealNode(command.nodeId)
}
function undoHistory() {
  return runHistory(undo)
}
function redoHistory() {
  return runHistory(redo)
}
useFlowShortcuts({ undo: undoHistory, redo: redoHistory })
const query = useNodesQuery()
const replaceMutation = useReplaceNodesMutation()
const queryFailure = computed(() => {
  const result = query.data.value
  if (result?.isErr()) return result.error
  const unexpected = query.error.value
  if (!unexpected) return null
  return { message: unexpected instanceof Error ? unexpected.message : String(unexpected) }
})
const records = computed(
  /** @returns {NodeRecord[]} */ () => {
    const result = query.data.value
    return result?.isOk() ? result.value : []
  },
)
function scheduleCanvasLoad() {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(() => (shouldLoadCanvas.value = true), {
      timeout: 1000,
    })
    cancelCanvasLoad = () => window.cancelIdleCallback(handle)
    return
  }
  const handle = setTimeout(() => (shouldLoadCanvas.value = true), 0)
  cancelCanvasLoad = () => clearTimeout(handle)
}

onMounted(() => {
  if (!canvasElement.value || typeof IntersectionObserver === 'undefined') {
    shouldLoadCanvas.value = true
    return
  }
  canvasObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      scheduleCanvasLoad()
      canvasObserver?.disconnect()
      canvasObserver = null
    },
    { rootMargin: '160px' },
  )
  canvasObserver.observe(canvasElement.value)
})
onBeforeUnmount(() => {
  canvasObserver?.disconnect()
  cancelCanvasLoad()
})

/** @param {string} nodeId */
function openNode(nodeId) {
  const sameNode = route.name === 'node-details' && String(route.params.nodeId) === String(nodeId)
  router.push(
    sameNode ? { name: 'flow' } : { name: 'node-details', params: { nodeId: String(nodeId) } },
  )
}
/** @param {string | null} nodeId */
function restoreFocus(nodeId) {
  if (records.value.some((record) => String(record.id) === String(nodeId))) {
    if (nodeId !== null) canvas.value?.focusNode(nodeId)
  } else {
    canvasElement.value?.focus()
  }
}

/** @param {string} parentId */
function openCreate(parentId) {
  createParentId.value = parentId
}
function closeCreate() {
  createParentId.value = null
}

const insertParent = computed(() =>
  records.value.find((record) => String(record.id) === createParentId.value),
)
const parentHasChild = computed(() =>
  records.value.some((record) => String(record.parentId) === String(insertParent.value?.id)),
)

/**
 * @param {string} parentId
 * @param {CreateNodeType} type
 * @param {NodeDraft} [draft]
 */
async function createNode(parentId, type, draft) {
  const created = createNodeRecords(parentId, type, draft)
  const previous = { ...store.positions }
  store.setPositions(missingLayoutPositions(records.value, store.positions))
  const next = spliceNodes(records.value, parentId, created)
  store.setPositions(positionsForAddedNodes(next, store.positions))
  const result = await replaceMutation.mutateResult(next)
  if (result.isErr()) {
    store.removePositions(created.map((record) => record.id))
    store.setPositions(previous)
    toast.error(result.error.message)
    return
  }
  closeCreate()
  openNode(String(created[0].id))
  await canvas.value?.revealNode(String(created[0].id))
  toast.success(`${created[0].name || 'Node'} created`)
}

/** @param {NodeDraft & { type: CreateNodeType }} draft */
function submitCreate(draft) {
  const parent = insertParent.value
  if (!parent) return
  createNode(String(parent.id), draft.type, draft)
}
</script>

<template>
  <div class="relative h-full bg-background">
    <div
      class="absolute top-3 left-3 z-30 flex items-center gap-2 rounded-lg bg-background/85 p-1.5 shadow-md backdrop-blur"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Undo"
        :disabled="!canUndo"
        @click="undoHistory"
      >
        <Undo2 />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Redo"
        :disabled="!canRedo"
        @click="redoHistory"
      >
        <Redo2 />
      </Button>
    </div>
    <main
      ref="canvasElement"
      class="relative h-full min-h-0 overflow-hidden bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      aria-label="Flow chart canvas"
      aria-describedby="flow-keyboard-help"
      tabindex="-1"
    >
      <p id="flow-keyboard-help" class="sr-only">
        Arrow keys move between steps. Enter opens the selected step.
      </p>
      <Suspense v-if="query.isSuccess.value && !queryFailure && records.length && shouldLoadCanvas">
        <FlowCanvas ref="canvas" :records="records" @open-node="openNode" @add-node="openCreate" />
        <template #fallback>
          <div
            class="absolute inset-0 grid place-items-center"
            aria-label="Loading flow visualization"
          >
            <Skeleton class="h-24 w-64 rounded-xl" />
          </div>
        </template>
      </Suspense>
      <div
        v-else-if="
          query.isPending.value ||
          (query.isSuccess.value && !queryFailure && records.length && !shouldLoadCanvas)
        "
        class="absolute inset-0 grid place-items-center p-6"
      >
        <Card class="w-full max-w-md border-border/70 shadow-xl shadow-slate-950/5">
          <CardHeader>
            <CardTitle>Loading your flow</CardTitle>
            <CardDescription>Preparing the canvas and saved positions.</CardDescription>
          </CardHeader>
          <CardContent class="grid grid-cols-2 gap-3" aria-label="Loading flow">
            <Skeleton class="h-24 rounded-xl" />
            <Skeleton class="h-24 rounded-xl" />
          </CardContent>
        </Card>
      </div>
      <div v-else-if="queryFailure" class="absolute inset-0 grid place-items-center p-6">
        <Card class="w-full max-w-md border-destructive/20 shadow-xl" role="alert">
          <CardHeader>
            <CardTitle>Could not load the flow</CardTitle>
            <CardDescription>{{ queryFailure.message }}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" @click="query.refetch()"><RotateCcw /> Retry</Button>
          </CardContent>
        </Card>
      </div>
      <div v-else class="absolute inset-0 grid place-items-center p-6">
        <Card class="w-full max-w-md text-center shadow-xl shadow-slate-950/5">
          <CardHeader>
            <CardTitle>Your flow is empty</CardTitle>
            <CardDescription>
              We couldn’t find nodes in local storage or the payload response.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" @click="query.refetch()"><RotateCcw /> Reload flow</Button>
          </CardContent>
        </Card>
      </div>
    </main>
    <NodeDetailsSheet
      v-if="query.isSuccess.value && shouldLoadNodeDetails"
      :records="records"
      @closed="restoreFocus"
    />
    <CreateNodeDialog
      v-if="insertParent"
      :allow-hours="insertParent.type !== 'dateTime'"
      :parent-name="insertParent.type === 'trigger' ? 'Trigger' : insertParent.name || 'this step'"
      :has-child="parentHasChild"
      @close="closeCreate"
      @create="submitCreate"
    />
  </div>
</template>
