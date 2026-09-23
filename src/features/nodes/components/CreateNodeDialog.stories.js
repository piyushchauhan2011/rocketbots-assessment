import { fn } from 'storybook/test'

import CreateNodeDialog from './CreateNodeDialog.vue'

export default {
  title: 'Flow/Create node dialog',
  component: CreateNodeDialog,
  args: {
    allowHours: true,
    hasChild: true,
    parentName: 'Welcome message',
    onClose: fn(),
    onCreate: fn(),
  },
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    components: { CreateNodeDialog },
    setup: () => ({ args }),
    template: `
      <div class="min-h-screen bg-muted/40 p-10">
        <p class="text-sm text-muted-foreground">The dialog is rendered over the flow canvas.</p>
        <CreateNodeDialog v-bind="args" />
      </div>
    `,
  }),
}

export const InsertBetweenNodes = {}

export const AddToEnd = {
  args: {
    hasChild: false,
    parentName: 'Notify support',
  },
}

export const WithoutBusinessHours = {
  args: {
    allowHours: false,
  },
}
