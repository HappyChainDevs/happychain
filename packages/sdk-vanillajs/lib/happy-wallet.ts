import { config, onModalUpdate, onUserUpdate } from '@happychain/sdk-shared'
import { css, html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

@customElement('happy-wallet')
export class HappyWallet extends LitElement {
    @state()
    classes = {
        open: false,
        closed: true,
        connected: false,
        disconnected: true,
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
        return html`
            <iframe
                title="happy-iframe"
                src="${config.iframePath}/connect"
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
        'happy-wallet': HappyWallet
    }
}
