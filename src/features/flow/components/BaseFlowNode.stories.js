import { Background } from '@vue-flow/background'
import { VueFlow } from '@vue-flow/core'
import { fn } from 'storybook/test'

import BaseFlowNode from './BaseFlowNode.vue'

const actions = {
  onAdd: fn(),
  onMove: fn(),
  onOpen: fn(),
}

const nodes = [
  {
    id: 'trigger',
    type: 'trigger',
    position: { x: 300, y: 0 },
    data: {
      ...actions,
      record: {
        id: 'trigger',
        parentId: -1,
        type: 'trigger',
        name: 'Conversation opened',
        data: {},
      },
      summary: 'Starts when a contact opens a conversation',
      hasChildren: true,
    },
  },
  {
    id: 'message',
    type: 'sendMessage',
    position: { x: 300, y: 190 },
    data: {
      ...actions,
      record: {
        id: 'message',
        parentId: 'trigger',
        type: 'sendMessage',
        name: 'Welcome message',
        data: {},
      },
      summary: 'Thanks for reaching out. How can we help?',
      hasChildren: true,
    },
  },
  {
    id: 'hours',
    type: 'businessHours',
    position: { x: 300, y: 380 },
    data: {
      ...actions,
      record: {
        id: 'hours',
        parentId: 'message',
        type: 'dateTime',
        name: 'Business hours',
        data: {},
      },
      summary: 'Route contacts using the Kuala Lumpur schedule',
      hasChildren: true,
    },
  },
  {
    id: 'success',
    type: 'dateTimeConnector',
    position: { x: 120, y: 570 },
    data: {
      ...actions,
      record: {
        id: 'success',
        parentId: 'hours',
        type: 'dateTimeConnector',
        name: 'Success',
        data: { connectorType: 'success' },
      },
      summary: '',
      hasChildren: true,
    },
  },
  {
    id: 'failure',
    type: 'dateTimeConnector',
    position: { x: 480, y: 570 },
    data: {
      ...actions,
      record: {
        id: 'failure',
        parentId: 'hours',
        type: 'dateTimeConnector',
        name: 'Failure',
        data: { connectorType: 'failure' },
      },
      summary: '',
      hasChildren: false,
    },
  },
  {
    id: 'comment',
    type: 'addComment',
    position: { x: 120, y: 720 },
    data: {
      ...actions,
      record: {
        id: 'comment',
        parentId: 'success',
        type: 'addComment',
        name: 'Notify support',
        data: {},
      },
      summary: 'Add an internal note for the assigned agent',
      hasChildren: false,
    },
  },
]

const edges = [
  { id: 'trigger-message', source: 'trigger', target: 'message', type: 'smoothstep' },
  { id: 'message-hours', source: 'message', target: 'hours', type: 'smoothstep' },
  { id: 'hours-success', source: 'hours', target: 'success', type: 'smoothstep' },
  { id: 'hours-failure', source: 'hours', target: 'failure', type: 'smoothstep' },
  { id: 'success-comment', source: 'success', target: 'comment', type: 'smoothstep' },
]

export default {
  title: 'Flow/Nodes',
  component: BaseFlowNode,
  parameters: { layout: 'fullscreen' },
}

export const Workflow = {
  render: () => ({
    components: { Background, BaseFlowNode, VueFlow },
    setup: () => ({ edges, nodes }),
    template: `
      <div class="h-[760px] bg-background">
        <VueFlow :nodes="nodes" :edges="edges" :nodes-draggable="false" fit-view-on-init>
          <Background :gap="20" :size="1" />
          <template #node-trigger="props"><BaseFlowNode v-bind="props" node-type="trigger" /></template>
          <template #node-sendMessage="props"><BaseFlowNode v-bind="props" node-type="sendMessage" /></template>
          <template #node-addComment="props"><BaseFlowNode v-bind="props" node-type="addComment" /></template>
          <template #node-businessHours="props"><BaseFlowNode v-bind="props" node-type="businessHours" /></template>
          <template #node-dateTimeConnector="props"><BaseFlowNode v-bind="props" node-type="dateTimeConnector" /></template>
        </VueFlow>
      </div>
    `,
  }),
}
