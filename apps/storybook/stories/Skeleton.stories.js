import { Skeleton } from '@rocketbots/ui/skeleton'

export default { title: 'UI/Skeleton', component: Skeleton }

export const LoadingCard = {
  render: () => ({
    components: { Skeleton },
    template: `<div class="grid w-80 gap-3"><Skeleton class="h-8 w-2/3" /><Skeleton class="h-24 w-full" /><Skeleton class="h-8 w-1/3" /></div>`,
  }),
}
