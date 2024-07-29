import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/connect')({
  component: () => <div>Hello /connect!</div>
})