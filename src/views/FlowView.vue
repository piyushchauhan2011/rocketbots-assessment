<script setup>
import { GitBranch, Plus, Redo2, RotateCcw, Undo2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import FlowCanvas from '@/features/flow/components/FlowCanvas.vue'
import { useFlowHistory } from '@/features/flow/composables/useFlowHistory'
import { useFlowShortcuts } from '@/features/flow/composables/useFlowShortcuts'
import NodeDetailsSheet from '@/features/node-details/components/NodeDetailsSheet.vue'
import CreateNodeDialog from '@/features/nodes/components/CreateNodeDialog.vue'
import { useNodesQuery } from '@/features/nodes/composables/useNodes'

const router = useRouter()
const createOpen = ref(false)
const canvas = ref(null)
const canvasElement = ref(null)
const { canUndo, canRedo, undo, redo } = useFlowHistory()
useFlowShortcuts({ undo, redo })
const query = useNodesQuery()
const records = computed(() => query.data.value || [])

function openNode(nodeId) {
  router.push({ name: 'node-details', params: { nodeId: String(nodeId) } })
}

function created(nodeId) {
  createOpen.value = false
  openNode(nodeId)
}

function restoreFocus(nodeId) {
  if (records.value.some((record) => String(record.id) === String(nodeId))) {
    canvas.value?.focusNode(nodeId)
  } else {
    canvasElement.value?.focus()
  }
}
</script>

<template>
  <div class="grid h-full grid-rows-[4rem_minmax(0,1fr)] bg-background">
    <header
      class="relative z-20 flex items-center justify-between border-b bg-background/90 px-3 shadow-sm backdrop-blur-xl sm:px-6"
    >
      <div class="flex items-center gap-3">
        <span
          class="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-600/20"
        >
          <GitBranch :size="19" />
        </span>
        <div class="hidden sm:block">
          <p class="text-sm font-semibold tracking-tight">Flow Builder</p>
          <p class="text-xs text-muted-foreground">Customer automation workspace</p>
        </div>
      </div>
      <TooltipProvider>
        <div class="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Undo"
                :disabled="!canUndo"
                @click="undo"
              >
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo · Cmd/Ctrl+Z</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Redo"
                :disabled="!canRedo"
                @click="redo"
              >
                <Redo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo · Cmd/Ctrl+Shift+Z</TooltipContent>
          </Tooltip>
          <div class="mx-1 h-6 w-px bg-border" />
          <Button
            aria-label="Create New Node"
            class="shadow-md shadow-primary/20"
            @click="createOpen = true"
          >
            <Plus />
            <span class="hidden sm:inline">Create New Node</span>
          </Button>
        </div>
      </TooltipProvider>
    </header>
    <main
      ref="canvasElement"
      class="relative min-h-0 overflow-hidden bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      aria-label="Flow chart canvas"
      tabindex="-1"
    >
      <FlowCanvas
        v-if="query.isSuccess.value && records.length"
        ref="canvas"
        :records="records"
        @open-node="openNode"
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
            <CardDescription>Create the first node to start your automation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button @click="createOpen = true"><Plus /> Create New Node</Button>
          </CardContent>
        </Card>
      </div>
    </main>
    <CreateNodeDialog
      :open="createOpen"
      :records="records"
      @close="createOpen = false"
      @created="created"
    />
    <NodeDetailsSheet v-if="query.isSuccess.value" :records="records" @closed="restoreFocus" />
  </div>
</template>
