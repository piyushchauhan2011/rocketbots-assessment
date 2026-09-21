<script setup>
import { Save, Trash2 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { getDescendantIds, getNodeSummary } from '@/features/flow/lib/graph'
import {
  useDeleteNodesMutation,
  useUpdateNodeMutation,
} from '@/features/nodes/composables/useNodes'
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  validateBusinessHours,
  validateMessagePayload,
} from '@/features/nodes/lib/nodeSchemas'
import { useFlowUiStore } from '@/stores/flowUi'

import AddCommentEditor from './AddCommentEditor.vue'
import BusinessHoursEditor from './BusinessHoursEditor.vue'
import SendMessageEditor from './SendMessageEditor.vue'

const props = defineProps({ records: { type: Array, required: true } })
const emit = defineEmits(['closed'])
const route = useRoute()
const router = useRouter()
const store = useFlowUiStore()
const updateMutation = useUpdateNodeMutation()
const deleteMutation = useDeleteNodesMutation()
const draft = ref(null)
const originalDraft = ref('')
const confirmMode = ref(null)
const pendingRoute = ref(null)

const routeId = computed(() => (route.params.nodeId ? String(route.params.nodeId) : null))
const record = computed(() => props.records.find((item) => String(item.id) === routeId.value))
const open = computed(() => route.name === 'node-details')
const editable = computed(
  () => record.value && !['trigger', 'dateTimeConnector'].includes(record.value.type),
)
const dirty = computed(() => draft.value && JSON.stringify(draft.value) !== originalDraft.value)
const descendants = computed(() =>
  record.value ? getDescendantIds(props.records, record.value.id) : [],
)
const validationError = computed(() => validateDraft(draft.value))
const canSave = computed(
  () => dirty.value && !validationError.value && !updateMutation.isPending.value,
)

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function makeDraft(source) {
  const data = copy(source.data || {})
  data.description = data.description || getNodeSummary(source)
  if (source.type === 'sendMessage') data.payload = data.payload || []
  if (source.type === 'addComment') data.comment = data.comment || ''
  return { name: source.name || '', data }
}
function validateComment(value) {
  const comment = value.data.comment?.trim() || ''
  return comment.length >= 1 && comment.length <= 1000
    ? null
    : 'Comment must contain 1–1000 characters'
}

function validateHours(value) {
  const zones = new Set([
    'UTC',
    'Asia/Kuala_Lumpur',
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ])
  if (!zones.has(value.data.timezone)) return 'Choose an available timezone'
  return validateBusinessHours(value.data.times)
}

const TYPE_VALIDATORS = {
  sendMessage: (value) => validateMessagePayload(value.data.payload),
  addComment: validateComment,
  dateTime: validateHours,
}

function validateCommon(value) {
  const title = value.name.trim()
  const description = value.data.description?.trim() || ''
  if (!title || title.length > TITLE_MAX) return 'Title must contain 1–80 characters'
  if (!description || description.length > DESCRIPTION_MAX) {
    return 'Description must contain 1–240 characters'
  }
  return null
}

function validateDraft(value) {
  if (!value) return 'Node data is unavailable'
  const commonError = validateCommon(value)
  if (commonError) return commonError
  return TYPE_VALIDATORS[record.value?.type]?.(value) || null
}
function resetDraft() {
  if (!editable.value) {
    draft.value = null
    originalDraft.value = ''
    return
  }
  draft.value = makeDraft(record.value)
  originalDraft.value = JSON.stringify(draft.value)
}

watch(
  [record, open],
  () => {
    if (record.value && !editable.value && open.value) {
      router.replace({ name: 'flow' })
      return
    }
    resetDraft()
  },
  { immediate: true },
)

onBeforeRouteUpdate((to) => {
  if (!dirty.value || confirmMode.value === 'leaving') return true
  pendingRoute.value = to.fullPath
  confirmMode.value = 'dirty'
  return false
})

function requestClose() {
  if (dirty.value) {
    pendingRoute.value = '/'
    confirmMode.value = 'dirty'
  } else closeNow()
}
function closeNow() {
  router.push({ name: 'flow' })
  emit('closed', routeId.value)
}
function discardAndLeave() {
  const target = pendingRoute.value || '/'
  confirmMode.value = 'leaving'
  pendingRoute.value = null
  resetDraft()
  router.push(target).finally(() => {
    confirmMode.value = null
  })
}
async function save() {
  if (!canSave.value) return
  const beforeRecord = copy(record.value)
  const afterRecord = {
    ...beforeRecord,
    name: draft.value.name.trim(),
    data: copy(draft.value.data),
  }
  afterRecord.data.description = afterRecord.data.description.trim()
  if (afterRecord.type === 'addComment') afterRecord.data.comment = afterRecord.data.comment.trim()
  try {
    await updateMutation.mutateAsync(afterRecord)
    store.record({ kind: 'update', nodeId: String(afterRecord.id), beforeRecord, afterRecord })
    originalDraft.value = JSON.stringify(draft.value)
    toast.success('Node saved')
  } catch (error) {
    toast.error(error.message)
  }
}
function requestDelete() {
  confirmMode.value = 'delete'
}
async function deleteNode() {
  const ids = [String(record.value.id), ...descendants.value]
  try {
    await deleteMutation.mutateAsync(ids)
    store.removePositions(ids)
    confirmMode.value = null
    toast.success(`${record.value.name || 'Node'} deleted`)
    closeNow()
  } catch (error) {
    toast.error(error.message)
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="(nextOpen) => !nextOpen && requestClose()">
    <SheetContent
      side="right"
      class="sheet flex w-full flex-col gap-0 p-0 outline-none sm:max-w-[440px]"
      @escape-key-down.prevent="requestClose"
    >
      <template v-if="!record">
        <SheetHeader class="border-b p-6 pr-12 text-left">
          <Badge variant="secondary" class="w-fit">Unavailable</Badge>
          <SheetTitle>Node not found</SheetTitle>
          <SheetDescription>The requested node does not exist in this flow.</SheetDescription>
        </SheetHeader>
        <div class="flex-1 p-6" />
        <SheetFooter class="border-t p-4">
          <Button variant="outline" @click="requestClose">Close</Button>
        </SheetFooter>
      </template>
      <template v-else-if="draft">
        <SheetHeader class="border-b bg-muted/20 p-6 pr-12 text-left">
          <Badge variant="secondary" class="w-fit capitalize">{{ record.type }}</Badge>
          <SheetTitle class="truncate text-xl">{{ draft.name || 'Untitled node' }}</SheetTitle>
          <SheetDescription>Edit this node’s content and behavior.</SheetDescription>
        </SheetHeader>
        <ScrollArea class="min-h-0 flex-1">
          <div class="p-6">
            <div class="grid gap-5">
              <div class="grid gap-2">
                <Label for="node-title">Title</Label>
                <Input id="node-title" v-model="draft.name" maxlength="80" />
              </div>
              <div class="grid gap-2">
                <Label for="node-description">Description</Label>
                <Textarea
                  id="node-description"
                  v-model="draft.data.description"
                  maxlength="240"
                  class="min-h-24 resize-y"
                />
              </div>
            </div>
            <SendMessageEditor v-if="record.type === 'sendMessage'" v-model="draft.data.payload" />
            <AddCommentEditor
              v-else-if="record.type === 'addComment'"
              v-model="draft.data.comment"
            />
            <BusinessHoursEditor
              v-else-if="record.type === 'dateTime'"
              v-model:times="draft.data.times"
              v-model:timezone="draft.data.timezone"
            />
            <p
              v-if="validationError"
              class="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive"
              role="alert"
            >
              {{ validationError }}
            </p>
          </div>
        </ScrollArea>
        <SheetFooter class="flex-row items-center justify-between border-t bg-background p-4">
          <Button
            variant="ghost"
            class="text-destructive hover:bg-destructive/10 hover:text-destructive"
            :disabled="deleteMutation.isPending.value"
            @click="requestDelete"
          >
            <Trash2 /> Delete
          </Button>
          <Button :disabled="!canSave" @click="save"><Save /> Save changes</Button>
        </SheetFooter>
      </template>
    </SheetContent>
  </Sheet>

  <AlertDialog
    :open="confirmMode === 'dirty'"
    @update:open="(nextOpen) => !nextOpen && (confirmMode = null)"
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
        <AlertDialogDescription>Your edits have not been saved.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="confirmMode = null">Keep editing</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click="discardAndLeave"
        >
          Discard changes
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <AlertDialog
    :open="confirmMode === 'delete'"
    @update:open="(nextOpen) => !nextOpen && (confirmMode = null)"
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {{ record?.name || 'node' }}?</AlertDialogTitle>
        <AlertDialogDescription>
          This also deletes {{ descendants.length }} descendant{{
            descendants.length === 1 ? '' : 's'
          }}. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="confirmMode = null">Cancel</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          :disabled="deleteMutation.isPending.value"
          @click="deleteNode"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
