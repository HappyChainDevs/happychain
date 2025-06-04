import { Layout } from "./Layout"

export type RequestDisabledProps = {
    requestCount: number
    headline: string
    description?: string
    reject: () => void
}

export const RequestDisabled = ({ requestCount, headline, description, reject }: RequestDisabledProps) => {
    return (
        <Layout
            requestCount={requestCount}
            headline={headline}
            description={description}
            actions={{
                reject: {
                    children: "Go back",
                    onClick: reject,
                },
            }}
        />
    )
}
