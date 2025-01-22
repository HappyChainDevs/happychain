import { FirebaseError } from "firebase/app"

export function isFirebaseError(error: unknown, code: FirebaseErrorCode): error is FirebaseError {
    return error instanceof FirebaseError && error.code === code
}

export enum FirebaseErrorCode {
    PopupBlocked = "auth/popup-blocked",
    PopupClosed = "auth/popup-closed-by-user",
}
