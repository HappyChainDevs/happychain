# HappyChain Synchronous Randomness

Synchronous randomness enables getting verifiable onchain randomness by making a contract call.
No more need to make an onchain request and wait for a later transaction to proceed.

The randomness cannot be manipulated by construction, however the randomness service operator will know the randomness a
couple second before anyone else. If this property is bothersome, we also enable falling back to a fast request-response
mode.

More information soon (TM)