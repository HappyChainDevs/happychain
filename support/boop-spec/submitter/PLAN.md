# Happy AA Submitter Implementation Plan

1. implement submitter_estimateGas + submitter_execute first
    - no persistence at first
    - simple Viem implem, no transaction manager yet
    - do not support entrypoint selection
    - one HappyTx = one submitter transaction (batching is not currently on the roadmap)
    - wait for a tx to be included to submit subsequent ones
2. do *not* wait for a tx to be included to submit subsequent ones
    - note: this gets pretty messy if transactions revert onchain, but don't handle this now
3. add multiple wallets, map each account to be serviced by a single wallet
4. integrate transaction manager (as an alternative implem at first)
   - will require supporting multiple sender wallets
   - investigate retry policy (must not retry HappyTx that revert onchain)
5. implement remaining endpoints