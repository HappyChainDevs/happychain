import { config } from "@happychain/sdk-shared"
import { LitElement, css, html } from "lit"
import { customElement } from "lit/decorators.js"
import { classMap } from "lit/directives/class-map.js"

import { onModalUpdate, onUserUpdate } from "./happyProvider/initialize"

function filterUndefinedValues(obj: { [k: string]: string | undefined }): { [k: string]: string } {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v)) as { [k: string]: string }
}

/**
 * {@link !HTMLElement}
 */
@customElement("happy-wallet")
export class HappyWallet extends LitElement {
    static properties = {
        classes: { state: true },
    }

    private classes: {
        open: boolean
        closed: boolean
        connected: boolean
        disconnected: boolean
    }

    constructor(
        private uuid: ReturnType<typeof crypto.randomUUID>,
        /** Stringified {@link AddEthereumChainParameter} */
        private chain: string,
        /** Stringified rpc url array string[] */
        private rpcUrl: string | undefined,
    ) {
        super()

        this.classes = {
            open: false,
            closed: true,
            connected: false,
            disconnected: true,
        }
    }

    connectedCallback(): void {
        super.connectedCallback()

        onUserUpdate((user) => {
            this.classes.connected = Boolean(user)
            this.classes.disconnected = !user
            this.requestUpdate()
        })

        onModalUpdate((isOpen) => {
            this.classes.open = isOpen
            this.classes.closed = !isOpen
            this.requestUpdate()
        })
    }

    render() {
        const url = new URL("connect", config.iframePath)

        const searchParams = new URLSearchParams(
            filterUndefinedValues({
                uuid: this.uuid,
                chain: this.chain,
                "rpc-urls": this.rpcUrl,
            }),
        ).toString()

        return html`
            <iframe
                title="happy-iframe"
                src="${url.href}?${searchParams}"
                class=${classMap(this.classes)}
                style="border: none;"
            />
        `
    }

    static styles = css`
        iframe {
            position: fixed;
            top: 0;
            right: 0;
        }

        iframe.disconnected.closed {
            height: 5rem;
            width: 7rem;
            border-radius: 0.25rem;
            overflow: hidden;
        }

        iframe.disconnected.open {
            bottom: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
        }

        iframe.closed.connected {
            height: 5rem;
            width: 13rem;
            border-radius: 0.5rem;
            overflow: hidden;
        }

        iframe.connected.open {
            height: 20rem;
            width: 20rem;
            border-radius: 0.5rem;
            overflow: hidden;
        }
    `
}

declare global {
    interface HTMLElementTagNameMap {
        "happy-wallet": HappyWallet
    }
}
