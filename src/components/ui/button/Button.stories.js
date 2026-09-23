import { ArrowRight, Plus } from '@lucide/vue'

import { Button } from '.'

const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']
const sizes = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-sm', 'icon-lg']

export default {
  title: 'UI/Button',
  component: Button,
  args: {
    label: 'Continue',
    variant: 'default',
    size: 'default',
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: variants },
    size: { control: 'select', options: sizes },
  },
  parameters: { layout: 'centered' },
}

export const Playground = {
  render: ({ label, ...args }) => ({
    components: { ArrowRight, Button },
    setup: () => ({ args, label }),
    template:
      '<Button v-bind="args">{{ label }} <ArrowRight v-if="args.size !== \'icon\'" /></Button>',
  }),
}

export const Variants = {
  render: () => ({
    components: { Button },
    setup: () => ({ variants }),
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <Button v-for="variant in variants" :key="variant" :variant="variant">
          {{ variant }}
        </Button>
      </div>
    `,
  }),
}

export const Sizes = {
  render: () => ({
    components: { Button, Plus },
    setup: () => ({ sizes }),
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <Button v-for="size in sizes" :key="size" :size="size" :aria-label="size.startsWith('icon') ? 'Add' : undefined">
          <Plus v-if="size.startsWith('icon')" />
          <template v-else>{{ size }}</template>
        </Button>
      </div>
    `,
  }),
}
