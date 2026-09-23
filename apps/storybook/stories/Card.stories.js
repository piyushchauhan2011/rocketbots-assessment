import { Button } from '@rocketbots/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@rocketbots/ui/card'

export default { title: 'UI/Card', component: Card }

export const Composed = {
  render: () => ({
    components: { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle },
    template: `<Card class="w-96"><CardHeader><CardTitle>Flow step</CardTitle><CardDescription>A reusable composed card.</CardDescription></CardHeader><CardContent>Content follows the shared design tokens.</CardContent><CardFooter><Button size="sm">Continue</Button></CardFooter></Card>`,
  }),
}
