import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/request')({
  component: () => <div>Hello /request!</div>
})