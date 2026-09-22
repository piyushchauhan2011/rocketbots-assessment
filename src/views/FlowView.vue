<script setup lang="ts">
import { Redo2, RotateCcw, Undo2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import FlowCanvas from '@/features/flow/components/FlowCanvas.vue'
import { useFlowHistory } from '@/features/flow/composables/useFlowHistory'
import { useFlowShortcuts } from '@/features/flow/composables/useFlowShortcuts'
import {
  missingLayoutPositions,
  positionsForAddedNodes,
  spliceNodes,
} from '@/features/flow/lib/graph'
import NodeDetailsSheet from '@/features/node-details/components/NodeDetailsSheet.vue'
import CreateNodeDialog from '@/features/nodes/components/CreateNodeDialog.vue'
import { useNodesQuery, useReplaceNodesMutation } from '@/features/nodes/composables/useNodes'
import { createNodeRecords, type NodeDraft } from '@/features/nodes/lib/createNodeRecords'
import type { FlowNodeCommand, NodeRecord } from '@/features/nodes/lib/types'
import { useFlowUiStore } from '@/stores/flowUi'

const route = useRoute()
const router = useRouter()
const canvas = ref(null)
const canvasElement = ref(null)
const createParentId = ref<string | null>(null)
const store = useFlowUiStore()
const { canUndo, canRedo, undo, redo } = useFlowHistory()

async function runHistory(action: () => Promise<FlowNodeCommand | null>) {
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
const records = computed<NodeRecord[]>(() => query.data.value || [])

function openNode(nodeId: string) {
  const sameNode = route.name === 'node-details' && String(route.params.nodeId) === String(nodeId)
  router.push(
    sameNode ? { name: 'flow' } : { name: 'node-details', params: { nodeId: String(nodeId) } },
  )
}
function restoreFocus(nodeId: string | null) {
  if (records.value.some((record) => String(record.id) === String(nodeId))) {
    canvas.value?.focusNode(nodeId)
  } else {
    canvasElement.value?.focus()
  }
}

function openCreate(parentId: string) {
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

async function createNode(
  parentId: string,
  type: 'sendMessage' | 'addComment' | 'businessHours',
  draft?: NodeDraft,
) {
  const created = createNodeRecords(parentId, type, draft)
  const previous = { ...store.positions }
  store.setPositions(missingLayoutPositions(records.value, store.positions))
  const next = spliceNodes(records.value, parentId, created)
  store.setPositions(positionsForAddedNodes(next, store.positions))
  try {
    await replaceMutation.mutateAsync(next)
    closeCreate()
    openNode(String(created[0].id))
    await canvas.value?.revealNode(String(created[0].id))
    toast.success(`${created[0].name || 'Node'} created`)
  } catch (error) {
    store.removePositions(created.map((record) => record.id))
    store.setPositions(previous)
    toast.error((error as Error).message)
  }
}

function submitCreate(draft: NodeDraft & { type: 'sendMessage' | 'addComment' | 'businessHours' }) {
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
      <FlowCanvas
        v-if="query.isSuccess.value && records.length"
        ref="canvas"
        :records="records"
        @open-node="openNode"
        @add-node="openCreate"
      />
      <div v-else-if="query.isPending.value" class="absolute inset-0 grid place-items-center p-6">
        <Card class="w-full max-w-md border-border/70 shadow-xl shadow-slate-950/5">
          <CardHeader>
            <Skeleton class="h-5 w-36" />
            <Skeleton class="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent class="grid grid-cols-2 gap-3" aria-label="Loading flow">
            <Skeleton class="h-24 rounded-xl" />
            <Skeleton class="h-24 rounded-xl" />
          </CardContent>
        </Card>
      </div>
      <div v-else-if="query.isError.value" class="absolute inset-0 grid place-items-center p-6">
        <Card class="w-full max-w-md border-destructive/20 shadow-xl" role="alert">
          <CardHeader>
            <CardTitle>Could not load the flow</CardTitle>
            <CardDescription>{{ query.error.value?.message }}</CardDescription>
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
    <NodeDetailsSheet v-if="query.isSuccess.value" :records="records" @closed="restoreFocus" />
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
