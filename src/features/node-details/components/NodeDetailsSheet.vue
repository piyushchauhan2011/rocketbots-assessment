<script setup>
import { Clock3, MessageSquare, MessageSquareText, Save, Trash2 } from '@lucide/vue'
import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue'
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getNodeSummary, missingLayoutPositions, removeNode } from '@/features/flow/lib/graph'
import {
  useReplaceNodesMutation,
  useUpdateNodeMutation,
} from '@/features/nodes/composables/useNodes'
import {
  DESCRIPTION_MAX,
  getBusinessHoursValidation,
  TITLE_MAX,
  validateMessagePayload,
} from '@/features/nodes/lib/nodeSchemas'
import { useFlowUiStore } from '@/stores/flowUi'

const AddCommentEditor = defineAsyncComponent(() => import('./AddCommentEditor.vue'))
const BusinessHoursEditor = defineAsyncComponent(() => import('./BusinessHoursEditor.vue'))
const SendMessageEditor = defineAsyncComponent(() => import('./SendMessageEditor.vue'))

/** @typedef {import('@/features/nodes/lib/nodeSchemas.js').BusinessHoursValidation} BusinessHoursValidation */
/** @typedef {import('@/features/nodes/lib/types.js').NodeKind} NodeKind */
/** @typedef {import('@/features/nodes/lib/types.js').NodeRecord} NodeRecord */
/** @typedef {{ name: string, data: NodeRecord['data'] }} DraftValue */
/**
 * @typedef {object} DraftValidation
 * @property {string} [form]
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [message]
 * @property {string} [comment]
 * @property {string} [timezone]
 * @property {BusinessHoursValidation} businessHours
 */

const props = /** @type {{ records: NodeRecord[] }} */ (
  defineProps({ records: { type: Array, required: true } })
)
const emit = defineEmits(['closed'])
const route = useRoute()
const router = useRouter()
const store = useFlowUiStore()
const updateMutation = useUpdateNodeMutation()
const replaceMutation = useReplaceNodesMutation()
const draft = ref(/** @type {DraftValue | null} */ (null))
const originalDraft = ref('')
const confirmMode = ref(/** @type {'dirty' | 'delete' | 'leaving' | null} */ (null))
const pendingRoute = ref(/** @type {string | null} */ (null))

const routeId = computed(() => (route.params.nodeId ? String(route.params.nodeId) : null))
const record = computed(() => props.records.find((item) => String(item.id) === routeId.value))
const open = computed(() => route.name === 'node-details')
const editable = computed(
  () => record.value && !['trigger', 'dateTimeConnector'].includes(record.value.type),
)
const dirty = computed(() => draft.value && JSON.stringify(draft.value) !== originalDraft.value)
const deleteHint = computed(() =>
  record.value?.type === 'dateTime'
    ? 'Success and Failure are removed with this step. Nodes on those paths stay in the flow.'
    : 'Only this step is removed. Nodes below it stay connected to the step above.',
)
const validationErrors = computed(() => validateDraft(draft.value))
const hasValidationErrors = computed(() => {
  const errors = validationErrors.value
  return Boolean(
    errors.form ||
    errors.title ||
    errors.description ||
    errors.message ||
    errors.comment ||
    errors.timezone ||
    errors.businessHours.firstError,
  )
})
const canSave = computed(
  () => dirty.value && !hasValidationErrors.value && !updateMutation.isPending.value,
)
const headerMeta = computed(() => {
  const type = record.value?.type
  if (type === 'dateTime') {
    return {
      label: 'Business Hours',
      helper:
        'Assign a period to be considered based on date & time condition. Use business hours or date range condition.',
      color: '#ef4444',
      icon: Clock3,
    }
  }
  if (type === 'sendMessage') {
    return {
      label: 'Send Message',
      helper: 'Edit the message sent on this path.',
      color: '#22c55e',
      icon: MessageSquare,
    }
  }
  if (type === 'addComment') {
    return {
      label: 'Add Comment',
      helper: 'Edit the internal note left on this path.',
      color: '#64748b',
      icon: MessageSquareText,
    }
  }
  return {
    label: 'Node',
    helper: 'Edit this node’s content and behavior.',
    color: '#64748b',
    icon: MessageSquare,
  }
})

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function copy(value) {
  return /** @type {T} */ (JSON.parse(JSON.stringify(value)))
}

/** @param {NodeRecord} source @returns {DraftValue} */
function makeDraft(source) {
  const data = copy(source.data || {})
  data.description = data.description || getNodeSummary(source)
  if (source.type === 'sendMessage') data.payload = data.payload || []
  if (source.type === 'addComment') data.comment = data.comment || ''
  return { name: source.name || '', data }
}

/**
 * @param {DraftValue} value
 * @returns {Pick<DraftValidation, 'title' | 'description'>}
 */
function validateCommonDraft(value) {
  /** @type {Pick<DraftValidation, 'title' | 'description'>} */
  const errors = {}
  const title = value.name.trim()
  const description = String(value.data.description || '').trim()
  if (!title) errors.title = 'Title is required'
  else if (title.length > TITLE_MAX) errors.title = 'Title must be 80 characters or less'
  if (!description) errors.description = 'Description is required'
  else if (description.length > DESCRIPTION_MAX) {
    errors.description = 'Description must be 240 characters or less'
  }
  return errors
}

/** @type {Partial<Record<NodeKind, (value: DraftValue) => Partial<DraftValidation>>>} */
const TYPE_VALIDATORS = {
  sendMessage: (value) => ({
    message: validateMessagePayload(value.data.payload || []) || undefined,
  }),
  addComment: (value) => {
    const comment = String(value.data.comment || '').trim()
    if (!comment) return { comment: 'Comment is required' }
    if (comment.length > 1000) return { comment: 'Comment must be 1000 characters or less' }
    return {}
  },
  dateTime: (value) => {
    const zones = new Set([
      'UTC',
      'Asia/Kuala_Lumpur',
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ])
    return {
      timezone: zones.has(String(value.data.timezone)) ? undefined : 'Choose an available timezone',
      businessHours: getBusinessHoursValidation(value.data.times || []),
    }
  },
}

/** @param {DraftValue | null} value @returns {DraftValidation} */
function validateDraft(value) {
  if (!value) {
    return {
      form: 'Node data is unavailable',
      businessHours: { rowErrors: [], firstError: null },
    }
  }
  const validator = record.value ? TYPE_VALIDATORS[record.value.type] : undefined
  return {
    businessHours: { rowErrors: [], firstError: null },
    ...validateCommonDraft(value),
    ...validator?.(value),
  }
}
function resetDraft() {
  if (!editable.value || !record.value) {
    draft.value = null
    originalDraft.value = ''
    return
  }
  draft.value = makeDraft(record.value)
  originalDraft.value = JSON.stringify(draft.value)
}

watch(open, (isOpen) => {
  if (!isOpen) return
  nextTick(() => document.getElementById('node-title')?.focus())
})

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
  if (!canSave.value || !record.value || !draft.value) return
  const beforeRecord = copy(record.value)
  const afterRecord = {
    ...beforeRecord,
    name: draft.value.name.trim(),
    data: copy(draft.value.data),
  }
  afterRecord.data.description = String(afterRecord.data.description).trim()
  if (afterRecord.type === 'addComment') {
    afterRecord.data.comment = String(afterRecord.data.comment).trim()
  }
  const result = await updateMutation.mutateAsync(afterRecord)
  if (result.isErr()) {
    toast.error(result.error.message)
    return
  }
  store.record({ kind: 'update', nodeId: String(afterRecord.id), beforeRecord, afterRecord })
  originalDraft.value = JSON.stringify(draft.value)
  toast.success('Node saved')
}
function requestDelete() {
  confirmMode.value = 'delete'
}
async function deleteNode() {
  const current = record.value
  if (!current) return
  const name = current.name || 'Node'
  const nodeId = String(current.id)
  const next = removeNode(props.records, current.id)
  confirmMode.value = 'leaving'
  await router.push({ name: 'flow' })
  emit('closed', nodeId)
  store.setPositions(missingLayoutPositions(props.records, store.positions))
  const result = await replaceMutation.mutateAsync(next.records)
  if (result.isErr()) {
    toast.error(result.error.message)
  } else {
    store.removePositions(next.removedIds)
    toast.success(`${name} deleted`)
  }
  confirmMode.value = null
}
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-40">
    <Transition name="flow-sheet-backdrop" appear>
      <button
        v-if="open"
        class="pointer-events-auto absolute inset-0 bg-black/35"
        aria-label="Dismiss details overlay"
        @click="requestClose"
      />
    </Transition>
    <Transition name="flow-sheet-panel" appear>
      <aside
        v-if="open"
        class="sheet pointer-events-auto absolute top-0 right-0 flex h-full w-full max-w-[520px] flex-col gap-0 border-l bg-background p-0 shadow-2xl outline-none"
        tabindex="-1"
        @keydown.escape.prevent="requestClose"
      >
        <button
          aria-label="Close details"
          class="absolute top-4 right-4 rounded-md border px-2 py-1 text-xs hover:bg-muted"
          @click="requestClose"
        >
          Close
        </button>
        <template v-if="!record">
          <header class="border-b p-6 pr-12 text-left">
            <Badge variant="secondary" class="w-fit">Unavailable</Badge>
            <h2 class="mt-2 text-xl font-semibold">Node not found</h2>
            <p class="text-sm text-muted-foreground">
              The requested node does not exist in this flow.
            </p>
          </header>
          <div class="flex-1 p-6" />
          <footer class="border-t p-4">
            <Button variant="outline" @click="requestClose">Close</Button>
          </footer>
        </template>
        <template v-else-if="draft">
          <header class="border-b bg-card p-6 pr-16 text-left">
            <div class="flex items-start gap-3">
              <span
                class="grid size-9 shrink-0 place-items-center rounded-lg text-white shadow-sm"
                :style="{ backgroundColor: headerMeta.color }"
              >
                <component :is="headerMeta.icon" :size="18" />
              </span>
              <span class="min-w-0">
                <h2 class="truncate text-lg font-semibold text-card-foreground">
                  {{ draft.name || headerMeta.label }}
                </h2>
                <p class="mt-1 text-sm leading-5 text-muted-foreground">{{ headerMeta.helper }}</p>
              </span>
            </div>
          </header>
          <div class="min-h-0 flex-1 overflow-y-auto">
            <div class="p-6">
              <div class="grid gap-5">
                <div class="grid gap-2">
                  <Label for="node-title">Title</Label>
                  <Input
                    id="node-title"
                    v-model="draft.name"
                    maxlength="80"
                    :aria-invalid="Boolean(validationErrors.title)"
                    :aria-describedby="validationErrors.title ? 'node-title-error' : undefined"
                  />
                  <FieldError id="node-title-error" :message="validationErrors.title" />
                </div>
                <div class="grid gap-2">
                  <Label for="node-description">Description</Label>
                  <Textarea
                    id="node-description"
                    v-model="draft.data.description"
                    maxlength="240"
                    class="min-h-24 resize-y"
                    :aria-invalid="Boolean(validationErrors.description)"
                    :aria-describedby="
                      validationErrors.description ? 'node-description-error' : undefined
                    "
                  />
                  <FieldError id="node-description-error" :message="validationErrors.description" />
                </div>
              </div>
              <SendMessageEditor
                v-if="record.type === 'sendMessage'"
                v-model="draft.data.payload"
                :error="validationErrors.message"
              />
              <AddCommentEditor
                v-else-if="record.type === 'addComment'"
                v-model="draft.data.comment"
                :error="validationErrors.comment"
              />
              <BusinessHoursEditor
                v-else-if="record.type === 'dateTime'"
                v-model:times="draft.data.times"
                v-model:timezone="draft.data.timezone"
                :validation="validationErrors.businessHours"
                :timezone-error="validationErrors.timezone"
              />
            </div>
          </div>
          <footer class="flex flex-row items-center justify-between border-t bg-background p-4">
            <Button
              variant="ghost"
              class="text-destructive hover:bg-destructive/10 hover:text-destructive"
              :disabled="replaceMutation.isPending.value"
              @click="requestDelete"
            >
              <Trash2 /> Delete
            </Button>
            <Button :disabled="!canSave" @click="save"><Save /> Save changes</Button>
          </footer>
        </template>
      </aside>
    </Transition>
  </div>

  <div
    v-if="confirmMode === 'dirty'"
    class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
  >
    <div role="alertdialog" class="w-full max-w-sm rounded-lg border bg-background p-5 shadow-xl">
      <h3 class="text-lg font-semibold">Discard unsaved changes?</h3>
      <p class="mt-1 text-sm text-muted-foreground">Your edits have not been saved.</p>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="outline" @click="confirmMode = null">Keep editing</Button>
        <Button variant="destructive" @click="discardAndLeave">Discard changes</Button>
      </div>
    </div>
  </div>

  <div
    v-if="confirmMode === 'delete'"
    class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
  >
    <div role="alertdialog" class="w-full max-w-sm rounded-lg border bg-background p-5 shadow-xl">
      <h3 class="text-lg font-semibold">Delete {{ record?.name || 'node' }}?</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ deleteHint }}
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="outline" @click="confirmMode = null">Cancel</Button>
        <Button
          variant="destructive"
          :disabled="replaceMutation.isPending.value"
          @click="deleteNode"
        >
          Delete
        </Button>
      </div>
    </div>
  </div>
</template>
