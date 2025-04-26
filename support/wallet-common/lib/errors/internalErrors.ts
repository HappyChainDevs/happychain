class BaseError extends Error {
    constructor() {
        super()
        // extends normal error, except updates name to match class name
        this.name = this.constructor.name
    }
}

export class LoginRequiredError extends BaseError {}
