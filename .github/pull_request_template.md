## Not ready for review

- [ ] My branch is named `<my-prefix>/<short-descriptor>` (e.g. `aryan/paymaster-gas`).
- [ ] I have prefixed my PR title with “\[draft\] “ (keep this checked after the review is ready
       for PR)
- [ ] This PR will not end up being too big.
- [ ] This PR addresses only one concern and not unrelated concerns that could be handled in
       separate PRs.
- [ ] This PR is targetted correctly (it is stacked onto `master` or the lowest PR whose
       functionality it absolutely needs or would cause lots of conflicts with)

## After a review

- [ ]  I am well-aware of the [PR review guidelines][guidelines]

[guidelines]: https://www.notion.so/happychain/PR-Process-12404b72a585807bb8bce20783acf631 

---

Please make sure you tick off everything below (except when there is multi-choice selection) before
requesting a review.

---

## General Checks

- [ ] I have run `make build` & `make check` (this should done be the `push` hook)
    - If not, explain what the issue is.
- [ ] I have run `make test`
- [ ] The feature I have added/modified works.
- [ ] Features even remotely connected to what I changed still work
      (e.g. if you change a utility function's logic).
- [ ] I have thought of the various relevant flows (fill the subsections belows)
- [ ] I have filled the PR description section below.
- Documentation
    - [ ] All public-facing APIs are properly documented in code comments.
    - [ ] “General” internal APIs are properly documented in code comments  
          (APIs that are expected to be called from a few different places)
    - [ ] Any expected questions that someone reading the code are answered in inline comments.
        - Don't go overboard, don't document stuff that is general knowledge about the framework
          and tools we use.
        - Make local reasoning easy: if getting an answer to a reasonable question
          (e.g. “is it safe to call this here?”, “what if this happens at the same time?”)
          requires spelunking in the code, it probably deserves a comment (or a refactor).
    - [ ] I have skipped valueless comments (e.g. documenting `grantPermission(permission, user)`
          with “Grants the given permission to the given user”)
        - Exception: public APIs should always have a comment even if redundant.
    - [ ] I checked my spelling and remembered that if using multiple sentences I should start them
          with a capital letter and end them with a dot.
- [ ] I have performed a thorough self-review of my code after submitting the PR,
      and have updated the code accordingly.
     - [ ] I have added PR comments on things that deserved special notice...
     - [ ] ... and thought **really hard** about whether that should be a code comment instead.
     - [ ] I have asked myself “What would Norswap say?” and reached out when I had a doubt.
- [ ] I have made sure my code passes the GitHub CI check.
- [ ] I have marked by PR ready for review by removing “\[draft\] “ and explicitly requesting a review.

## Frontend Only

**Delete this section if your code does not affect the frontend whatsoever.**

- I have tested things with the following demo (select at least one):
    - [ ] JS
    - [ ] React
    - [ ] Vue

- On the following browsers (select at least one):
    - [ ] Chrome
    - [ ] Firefox
    - [ ] Safari
    - [ ] Mobile (specify)

## Backend

**Delete this section if your code does not affect the backend whatsoever.**

- [ ] I made sure my code is parameterized so that it can run locally / on testnet / on mainnet 
       / on the server. (If relevant to the scope of this PR.)
- [ ] I have thought of the various relevant flows (fill the subsection below).

## User Interfaction Flows

- [ ] List below the user interaction flows your have considered. 
      It's fine if there are none (e.g. a lot of backend work)

## Code Flows

- [ ] List below the code flows you have considered (code running with various underlying states,
       things updating while the new/modified code is running).

## PR Description

### Relevant Context

- [ ] List relevant issues with a #-reference for Github and a URL for Linear.  
       If this PR closes an issue, pleasing add a bullet item.
    - “closes #999999” for Github
    - “closes <linear issue URL>” for Linear
- [ ] List other non-trivial links or documentation.  
      e.g. a guide you consulted on a particular technology or flow.
- [ ] Write down relevant context not present in the issues.

### PR Content

- If the fix is entirely described in the relevant issue, just “see issue”.
- If not, a very brief summary and expand on what's different from the proposed fix in the PR, if any.
- Noteworthy mechanics involved in achieving the PR's goal.
- Things that are worth paying attention to / are controversial / are not intuitive.
- The more involved your PR is, the more you should write here!
- [ ]  If there's a significant explanation here, did you make sure these explanation is available
       in code comments or documentation?