# Gas Design

The plan is to replace the current way of doing things, which relies heavily on measuring the
gas cost of snippets in the code. This is very very complicated to understand, brittle (changes
often, depending on tooling, conditions (memory use), and adds a lot of ugly comments in the code.

What are the goals? i.e. things we try to solve with the current solution and want a new solution to solve.

1. Estimating the gas limit for the execute call (could also be for the inner call).
    - A major challenge here is that we can't cleanly estimate the gas limit to pass to an external call.
      At least not without relying on a tracing RPC, but that is not great (e.g. not portable between nodes).
      We might however have to go there at some point if we want to migrate to EOF (assuming it passes...)
      which will kill the GAS (gasleft()) opcode.
    - It's difficult to get a clean estimate with gasleft() because we can't inject it *right* before the call
      (well I guess we could if we pieced the whole thing in assembly, but we ain't going there).
2. Alleviating the need for the payout call to know its own cost. This makes implementation of that
   function quite technical. Also alleviate the need for execute to meter its own execution.
3. Better metering of actual gas cost. The gas limit is usually an overestimation (because of the aforementioned uncertainty / dynamicity of the gas cost).
   We want to charge the paymaster only the consumed gas however (or close enough).
4. (Not super important / not currently handled) Better protection against accidental griefing.
   The biggest (only?) example here is a validate function whose gas usage is (against the spec!) highly variable.
   Since we don't currently have a gas limit for it, it can succeed while consuming too much gas compared to the gas limit,
   which causes an OOG revert down the line. That OOG is not attributable easy (account? paymaster?),
   and causes more gas consumption for the submitter than if we had bailed after we saw that validate
   consumed too much gas.
5. (optional) Remove the janky call cost estimation logic that estimates total tx calldata size etc.

## Sketch of a Plan

1. Meter execute from EntryPoint, including the call overhead. Use that as an overestimated executeGasLimit.
    - Gas limits need overestimation anyway, we can apply a lower multiplier to the executeGasLimit than to the general gasLimit because of this.
2. Meter the entire execution from the top of the Entrypoint to the payout call, return it in SubmitOutput, and add it to the Boop in a new field.
    - During the actual run, we compare the boop value to the current value, and we know we can discount any savings on that to the paymaster.
    - This would still leave the paymaster paying the safety margin on the intrinsic (21k + data) gas, on his own execution, and on the post-payout execution.
      Not ideal, but simple (and the submitterFee can be modulated lower to compensate).
    - Alternatively, we go with staking, then the payment can be a single statement at the bottom, and we can credit the whole discount.
       - Also enables moving the payout check first, including a balance check to see if the paymaster is solvent and is staked up to the gasLimit (pre-discout).
       - We could still use the discount plan actually, as that still gets rid of the janky call estimation part.
3. (optional) Add gas limits to validate and payout (similar idea as for execute).
   Doesn't matter much for payout in its current form (since it's last in the execution), but
   would matter (as much as for validate) if we move it up with staking.

Processing this... I actually think I like the staking idea a lot. It avoids the extra weird
metering and partial refund, and mitigates paymaster-induced griefing/losses by moving the check
upfront.

Question: how do we know the gasLimit chosen by the submitter is not bogus? Currently we do a hard calculation.
But with the discount plan, that goes away... One solution is the paymaster can validate this, but that would just put the onus of the computation on him.
Seems frankly cleaner to keep the computation we have at the moment, and not do the discount.

Actually that issue was also why the paymaster had to know the cost of its own execution... But with staking plan and final debit, we can actually take care of that!

## Implementation plan

1. Meter all the current calls, and add validate and payout gas limits to the boop struct.
    - Temporarily charge the entire gasLimit to the paymaster.
    - Get rid of any other gas metering.
2. Implement paymaster staking in the entrypoint (just a balance w/ a deposit + withdraw time w/ a minimum of one minute (to avoid just-in-time withdrawals)).
3. Rename `payout` to `validatePayment`, move it right after the validate call. Before even that, check the paymaster balance at the top.
   At the very end of the function, debit the paymaster balance based on actual gas computation.
