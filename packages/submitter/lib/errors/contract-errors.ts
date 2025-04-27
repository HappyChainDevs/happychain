import { HappyBaseError } from "./happy-base-error"

export class UnknownError extends HappyBaseError {
    constructor(public message: string) {
        super()
    }

    getResponseData() {
        return { status: "Unknown", message: this.message }
    }
}
