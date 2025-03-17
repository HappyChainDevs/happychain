import { Alert } from "@happy.tech/uikit-react"

export const ScreenLoading = () => {
    return (
        <Alert.Gui.Root intent="info" className="row-span-full cursor-progress justify-center">
            <div
                aria-hidden="true"
                className="h-11.25 aspect-square [mask-position:center] [mask-size:contain] [mask-repeat:no-repeat] mask-icon-hds-system-gui-mascot-happychain bg-current"
            />
            <Alert.Gui.Title>Loading</Alert.Gui.Title>
            <Alert.Gui.Description className="sr-only">
                Please wait while the wallet loads. This may take a few moments.
            </Alert.Gui.Description>
        </Alert.Gui.Root>
    )
}
