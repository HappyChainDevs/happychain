# RPC Calls

Wallet RPC requests can be originated either from a third-party app (such as the 'demos' found in this 
repo) or from the iframe/wallet directly. In addition to this, there are 3 main ways these requests 
can be executed. Regardless of the source of the request, all processing & execution occurs within 
the iframe/wallet.

- publicClient
    - This is a viem public client initialized using an `http` transport when no user is connected
      or initialized using a `custom` transport using the connected users preferred EIP-1193 provider
      if available.
    - This is responsible for executing requests which do not require user confirmations.
- walletClient
    - This is undefined if no user is connected, or initialized using the users selected provider
      (see [Connections](./connections.md))
    - This is responsible for executing requests which require a signature, or user confirmations.
- injectedClient
    - This is a combination of both of the above, however it strictly passes all requests to a third 
      party injected wallet such as Metamask, so the confirmation security can be relaxed as Metamask
      (or the users preferred wallet) will handle this and have its own rules.

When a call originates from an app, it is done so by sending the request to `happyProvider` which
is a standard EIP-1193 Provider and can be used directly, or to initialize libraries such as viem, 
ethers, or web3. HappyProvider will first check if a user is connected or not, then if the request
itself requires user confirmation. If the request does require confirmation, and no user is 
connected, it will prompt the user to do so (see [Connections](./connections.md)). If a user is 
connected via an injected wallet, the request will be forwarded to the iframe where it can pass 
through the injected middleware stack, before being forwarded back to the app to be executed by the 
connected injected wallet. If there is no user, but the call does not require confirmation, it will 
be passed to the iframe to be sent through the publicClient middleware and finally be executed by 
the publicClient in most cases. Lastly if the request requires confirmation and the user has 
connected via a social wallet, it will be sent through the walletClient stack, and finally be 
executed by the walletClient (which has been initialized using web3auth as the provider).

When a call originates from the iframe itself and the user has accessed the wallet directly and not
through an app, the process is much the same, with the exception of injected wallets being handled 
slightly differently. Injected wallets will not be forwarded to the app as previously mentioned, but
instead will be sent directly to the injected wallet provider to be executed
