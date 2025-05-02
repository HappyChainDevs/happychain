import { Layout } from "./Layout"

export type RequestDisabledProps = {
    headline: string
    description?: string
    reject: () => void
}

export const RequestDisabled = ({ headline, description, reject }: RequestDisabledProps) => {
    return (
        <Layout
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
