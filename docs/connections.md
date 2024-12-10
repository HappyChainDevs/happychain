# Connection Flow

When accessing the wallet directly via its standalone interface, the available authentication 
methods (social logins and detected injected wallets) and no other actions can be taken until they 
have connected successfully.

When accessing from an app via the Happy Wallet orb), the orb will indicate it is not connected, and 
only public actions such as `eth_getBlock` will be processed immediately. If a wallet action such as
`personal_sign`, `eth_requestAccounts`, or `eth_sendTransaction` is requested from the app, a
`WalletVisibility` message is sent via the event bus to signal to the wallet that it should 'open'.
This message forwards to the wallet web-component which expands to display the authentication methods 
described above when viewing the wallet directly as a standalone.

When a Social Wallet selection is made (either embedded through an app or direct wallet access) the 
wallet initiates a standard oauth flow, and receives a JWT from the login provider, which is then 
used to instantiate a Web3Auth provider instance. This provider will be used to process and sign all 
future RPC requests until logout or disconnect.

When an Injected Wallet is selected while accessed through an app, the wallet will emit the [rdns](https://eips.ethereum.org/EIPS/eip-6963#rdns)
of the chosen wallet to the `InjectedWalletWrapper` app-side, where the appropriate EIP-1193 Provider 
will be detected using [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) and stored for future use. 
Once this provider is connected and saved, the iframe will use the `InjectedWalletProxy` to execute 
any future requests by forwarding them to `InjectedWalletWrapper`. If the iframe was being accessed 
directly and not through an app, then the original users selected provider will simply be used to 
execute requests directly.

When no selection is made and the user instead closes the popup, or fails to login, a 
UserRejectionException is thrown and if the prompt was initiated by a protected RPC request, this
request will be rejected. If the prompt was simply initiated via the user opening the wallet, then 
the wallet will close and no actions need to be taken.

Once the authentication is successful, a message is sent from the iframe to the app (if available) 
to close the wallet, and if the original request requires signing (e.g. `personal_sign` or
`eth_sendTransaction`) then the connected wallet will prompt for user confirmation. If the request
results can be derived without a user signature (such as for `eth_requestAccounts`) then the results
will be responded with directly.
