import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/request')({
  component: () => <div>Hello /request!</div>
})