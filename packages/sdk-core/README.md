# HappyChain SDK Core

This package provides core low level functionality.

## EIP1193ProviderProxy

The `EIP1193ProviderProxy` is a drop in EIP1193Provider to be used on the frontend which proxies all requests into the iframe to be processed. This can be used to initialize and use common libraries such as

-   [viem](https://viem.sh/docs/clients/transports/custom.html)
-   [ethers](https://docs.ethers.org/v6/api/providers/#BrowserProvider)
-   [web3](https://docs.web3js.org/guides/web3_providers_guide/#injected-provider-1)
-   [wagmi](https://wagmi.sh/core/api/connectors/injected)

For transactions which require a user signature, the request function of the Provider will first open a new popup directing to the user approval page for the request.

## EventBus

The `EventBus` creates cross-boundary event systems for communicating events between the dApp SDK and Iframe, and between the Iframe and approval popup window.

For messages between the dApp and Iframe, a [MessageChannel](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel) is used with Port1 being initialized first on the iframe, then transferring Port2 to the dApp for subsequent messages.

For messages between the approval popup and the iframe, a [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) is used as both origins are from the same domain
