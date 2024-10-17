import { atom } from "jotai"

const secondaryMenuState = atom({
    visibilityMenu: false,
    visibilityDialogSignOutConfirmation: false,
})

export { secondaryMenuState }
