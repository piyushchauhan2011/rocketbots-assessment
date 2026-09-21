<script setup lang="ts">
import { Redo2, RotateCcw, Undo2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import FlowCanvas from '@/features/flow/components/FlowCanvas.vue'
import { useFlowHistory } from '@/features/flow/composables/useFlowHistory'
import { useFlowShortcuts } from '@/features/flow/composables/useFlowShortcuts'
import { X_GAP, Y_GAP, layoutGraph } from '@/features/flow/lib/graph'
import NodeDetailsSheet from '@/features/node-details/components/NodeDetailsSheet.vue'
import { useCreateNodeMutation, useNodesQuery } from '@/features/nodes/composables/useNodes'
import { createNodeRecords } from '@/features/nodes/lib/createNodeRecords'
import type { NodeRecord, Position } from '@/features/nodes/lib/types'
import { useFlowUiStore } from '@/stores/flowUi'

const router = useRouter()
const canvas = ref(null)
const canvasElement = ref(null)
const store = useFlowUiStore()
const { canUndo, canRedo, undo, redo } = useFlowHistory()
useFlowShortcuts({ undo, redo })
const query = useNodesQuery()
const createMutation = useCreateNodeMutation()
const records = computed<NodeRecord[]>(() => query.data.value || [])

function openNode(nodeId: string) {
  router.push({ name: 'node-details', params: { nodeId: String(nodeId) } })
}
function restoreFocus(nodeId: string | null) {
  if (records.value.some((record) => String(record.id) === String(nodeId))) {
    canvas.value?.focusNode(nodeId)
  } else {
    canvasElement.value?.focus()
  }
}

function getCreatePositions(
  existing: NodeRecord[],
  parentId: string,
  created: NodeRecord[],
): Record<string, Position> {
  const fallback = layoutGraph(existing)
  const parentPosition = store.positions[parentId] || fallback[parentId] || { x: 0, y: 0 }
  const root = created[0]
  const base = { x: parentPosition.x, y: parentPosition.y + Y_GAP }
  const next: Record<string, Position> = { [String(root.id)]: base }
  if (created.length === 3) {
    next[String(created[1].id)] = { x: base.x - X_GAP / 2, y: base.y + Y_GAP }
    next[String(created[2].id)] = { x: base.x + X_GAP / 2, y: base.y + Y_GAP }
  }
  return next
}

async function createNode(parentId: string, type: 'sendMessage' | 'addComment' | 'businessHours') {
  const created = createNodeRecords(parentId, type)
  const positions = getCreatePositions(records.value, parentId, created)
  try {
    await createMutation.mutateAsync(created)
    store.setPositions(positions)
    openNode(String(created[0].id))
    toast.success(`${created[0].name || 'Node'} created`)
  } catch (error) {
    store.removePositions(Object.keys(positions))
    toast.error((error as Error).message)
  }
}
</script>

<template>
  <div class="relative h-full bg-background">
    <div
      class="absolute top-3 left-3 z-30 flex items-center gap-2 rounded-lg bg-background/85 p-1.5 shadow-md backdrop-blur"
    >
      <Button variant="ghost" size="icon" aria-label="Undo" :disabled="!canUndo" @click="undo">
        <Undo2 />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Redo" :disabled="!canRedo" @click="redo">
        <Redo2 />
      </Button>
    </div>
    <main
      ref="canvasElement"
      class="relative h-full min-h-0 overflow-hidden bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      aria-label="Flow chart canvas"
      tabindex="-1"
    >
      <FlowCanvas
        v-if="query.isSuccess.value && records.length"
        ref="canvas"
        :records="records"
        @open-node="openNode"
        @create-node="createNode"
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
  </div>
</template>
