import { AuthState, type UUID, config } from "@happychain/sdk-shared"
import { LitElement, css, html } from "lit"
import { customElement } from "lit/decorators.js"
import { classMap } from "lit/directives/class-map.js"

import { onAuthStateUpdate, onModalUpdate } from "./happyProvider/initialize"

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
        authState: { state: true },
    }

    private authState = AuthState.Connecting

    private classes = {
        open: false,
    }

    constructor(
        private windowId: UUID,
        /** Stringified {@link AddEthereumChainParameter} */
        private chain: string,
        /** Stringified rpc url array string[] */
        private rpcUrl: string | undefined,
    ) {
        super()
    }

    connectedCallback(): void {
        super.connectedCallback()

        onAuthStateUpdate((state) => {
            this.authState = state
            this.requestUpdate()
        })

        onModalUpdate((isOpen) => {
            this.classes.open = isOpen
            this.requestUpdate()
        })

        document.addEventListener("click", () => {
            if (this.classes.open) {
                this.classes.open = false
                this.requestUpdate()
            }
        })
    }

    #onError() {
        console.error("HappyChain SDK failed to initialize")
    }

    render() {
        const url = new URL("embed", config.iframePath)

        const searchParams = new URLSearchParams(
            filterUndefinedValues({
                windowId: this.windowId,
                chain: this.chain,
                "rpc-urls": this.rpcUrl,
            }),
        ).toString()

        const connected = this.authState === AuthState.Connected
        const connecting = this.authState === AuthState.Connecting
        const disconnected = this.authState === AuthState.Disconnected

        const cssClasses = classMap({
            open: this.classes.open,
            closed: !this.classes.open || connecting,
            connected: connected,
            disconnected: disconnected,
            connecting: connecting,
            loginModal: !connected && this.classes.open,
        })

        return html`
            <iframe
                title="happy-iframe"
                @error="${this.#onError}"
                src="${url.href}?${searchParams}"
                class=${cssClasses}
                style="border: none;"
                allow="clipboard-read; clipboard-write"
            />
        `
    }

    static styles = css`
        :host { all: initial !important }

        iframe {
            position: fixed;
            top: 0;
            right: 0;
            margin: 1rem;
            overflow: hidden;
            transition: 0.3s;
        }

        iframe.loginModal {
            padding: 0;
            margin:0;
            right: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            transition: 0s;
        }

        iframe.disconnected.closed {
            transition: 0s;
        }

        iframe.connecting {
            margin: 1rem;
            height: 4rem;
            width: 12rem;
            right: 0;
            transition: 0s;
        }

        /* Common closed width/height */
        iframe.closed {
            height: 4rem;
            width: 12rem;
        }

        iframe.connected.open {
            height: 32rem;
            width: 24rem;
        }
    `
}

declare global {
    interface HTMLElementTagNameMap {
        "happy-wallet": HappyWallet
    }
}
