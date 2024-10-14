import { atom } from "jotai"

const secondaryMenuState = atom({
    visibilityMenu: false,
    visibilityDialogPermissions: false,
    visibilityDialogSignOutConfirmation: false,
})

export { secondaryMenuState }
