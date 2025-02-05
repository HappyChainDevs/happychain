# HappyAA Submitter Design Notes

## Vocabulary

### Pending HappyTx

Pending HappyTx are those submitted via `submitter_execute` or `submitter_submit` that have not
yet been included onchain.

## Submitter Configuration

Submitter have large lattitude for the policies they want to implement. Each submitter should document
its policy choices.

### HappyTx Buffering Strategy

It is desirable for submitters to be nonce-aware, such that they can buffer HappyTx with future
nonces and submit them whenever ready. This consumes resources, and so a buffering policy must
be in place for determining when a HappyTx is accepted or rejected.

We suggest implementing a fixed buffer size per `(account, nonceTrack)` pair and a total buffer
limit per account.

If the submitter rejects a request on buffering grounds, it should return a status of
"bufferExceeded".

It's possible to implement different policies for `submitter_execute` and `submitter_submit`, as the
former consumes more resources in the form of needing an HTTP connection to remain open.

### Capacity Management

Beyond buffer size, a submitter generally has capacity limitations to service any request.

In the spirit of failing early instead of offering a degraded service to everyone, the submitter
should proactively reject requests (with the "submitterCapacityExceeded" status) if it is at
capacity.

We suggest trying to offer some account continued service while some others receive no service. This
is a better outcome than everyone receiving service that fails 50% of the time. It's a good idea to
boot account that use a disproportional share of resources in these scenarios.

### HappyTx State Retention

The `submitter_execute` and `submitter_submit` request lead to the creation of a HappyTx state that
needs to be tracked.

HappyTx's state (as returned by `submitter_state` and `submitter_receipt`) cannot in general be
queried directly from an RPC node for two reasons:

1. There might not be a 1-1 mapping between a HappyTx hash and a transaction hash (i.e. the
   submitter transaction can potentially perform other onchain calls, or submit multiple HappyTx at
   once)
2. Even in the case of a 1-1 mapping, that mapping is non-deterministic and needs to be stored.
3. Simulated but not included HappyTx's state never makes it onchain.

When a request for the state of a HappyTx comes in, a submitter may thus not be able to service it.
The submitter must thus define a policy for HappyTx state retention.

For submitters that perform 1-1 mapping between a submitter tx and a HappyTx, we suggest the
following policy:

- Persist the (submitter tx hash, HappyTx hash) mapping in a database for included HappyTx.
- Persist the HappyTx state for non-included to database (for resiliency) for a set duration, along
  with a per-account limit.
- Cache all recent HappyTx state in a per-account LRU cache with additional time-based pruning.

Submitter that do not maintain a 1-1 mapping can either persist all onchain-included HappyTx state,
or map HappyTx to their submitter tx and implement use a custom trace in conjunction with
`debug_traceCall` to retrieve the HappyTx state from an RPC node.

### Trust Policy

A submitter generally needs to protect itself from DOS and griefing attacks.

For that purpose, it may impose restriction on who can send it HappyTxs, which entrypoints,
paymasters, and account implementations are eligible.

It may want to impose rate limits, or use reputation / throttling / banning algorithms.

A submitter can also quote increasingly high submitter fees (in `submitter_estimateGas`) to
"problematic" accounts to compensate itself for the work done or loss incurred (in onchain reverted
execution) on their behalf. It should reject HappyTx that don't pay sufficient fees (TODO).