import { createLazyFileRoute } from "@tanstack/react-router"
import { FormSend } from "#src/components/interface/send-tx/FormSend.tsx"

export const Route = createLazyFileRoute("/embed/send")({
    component: Send,
})

function Send() {
    return (
        <div className="max-w-prose mx-auto w-full py-4 px-2">
            <FormSend />
        </div>
    )
}
