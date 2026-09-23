import { Button } from '@rocketbots/ui/button'

export default { title: 'UI/Button', component: Button }

export const Variants = {
  render: () => ({
    components: { Button },
    template: `<div class="flex flex-wrap gap-3"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="outline">Outline</Button><Button variant="destructive">Delete</Button><Button disabled>Disabled</Button></div>`,
  }),
}
