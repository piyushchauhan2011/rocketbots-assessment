import { Badge } from '@rocketbots/ui/badge'

export default { title: 'UI/Badge', component: Badge }

export const Variants = {
  render: () => ({
    components: { Badge },
    template: `<div class="flex gap-3"><Badge>Default</Badge><Badge variant="secondary">Secondary</Badge><Badge variant="outline">Outline</Badge><Badge variant="destructive">Error</Badge></div>`,
  }),
}
