import { config, onModalUpdate, onUserUpdate } from '@happychain/core'
import { css, html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('happy-wallet')
export class HappyWallet extends LitElement {
    constructor() {
        super()

        this.classList.add('closed')
        this.classList.add('disconnected')

        onUserUpdate((user) => {
            if (user) {
                this.classList.add('connected')
                this.classList.remove('disconnected')
            } else {
                this.classList.add('disconnected')
                this.classList.remove('connected')
            }
        })

        onModalUpdate((isOpen) => {
            if (isOpen) {
                this.classList.add('open')
                this.classList.remove('closed')
            } else {
                this.classList.add('closed')
                this.classList.remove('open')
            }
        })
    }

    render() {
        return html`
            <iframe
                title="happy-iframe"
                src="${config.iframePath}/connect"
                style="width: 100%; height: 100%; border: none;"
            />
        `
    }

    // hc-fixed hc-top-0 hc-right-0 hc-h-20 hc-w-28 hc-rounded-lg hc-overflow-hidden
    static styles = css`
        :host {
            position: fixed;
            top: 0;
            right: 0;
        }

        :host(.disconnected.closed) {
            height: 5rem;
            width: 7rem;
            border-radius: 0.25rem;
            overflow: hidden;
        }

        :host(.disconnected.open) {
            bottom: 0;
            left: 0;
        }

        :host(.connected.closed) {
            height: 5rem;
            width: 13rem;
            border-radius: 0.5rem;
            overflow: hidden;
        }

        :host(.connected.open) {
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
