### Linked Issues

- closes #XXX
- closes <linear issue URL>

### Description

< DESCRIPTION GOES HERE >

- Include all relevant context (but no need to repeat the issue's content).
- Draw attention to new, noteworthy & unintuitive elements.

<details open>
<summary>Toggle Checklist</summary>

## Checklist

### Basics

- [ ] B1. I have applied the proper label & proper branch name (e.g. `norswap/build-system-caching`).
- [ ] B2. This PR is not so big that it should be split & addresses only one concern.
- [ ] B3. The PR targets the lowest branch it can (ideally master).

Reminder: [PR review guidelines][guidelines]

[guidelines]: https://www.notion.so/happychain/PR-Process-12404b72a585807bb8bce20783acf631

### Correctness

- [ ] C1. Builds and passes tests.
- [ ] C2. The code is properly parameterized & compatible with different environments (e.g. local,
      testnet, mainnet, standalone wallet, ...).
- [ ] C3. I have manually tested my changes & connected features.

< INDICATE BROWSER, DEMO APP & OTHER ENV DETAILS USED FOR TESTING HERE >

< INDICATE TESTED SCENARIOS (USER INTERFACE INTERACTION, CODE FLOWS) HERE >

- [ ] C4. I have performed a thorough self-review of my code after submitting the PR,
      and have updated the code & comments accordingly.

### Architecture & Documentation

- [ ] D1. I made it easy to reason locally about the code, by (1) using proper abstraction boundaries,
      (2) commenting these boundaries correctly, (3) adding inline comments for context when needed.
- [ ] D2. All public-facing APIs & meaningful (non-local) internal APIs are properly documented in code
      comments.
- [ ] D3. If appropriate, the general architecture of the code is documented in a code comment or
      in a Markdown document.
- [ ] D4. An appropriate Changeset has been generated (and committed) for changes that touch npm published packages (currently `pacakges/core` and `packages/react`), see [here](https://github.com/HappyChainDevs/happychain/tree/master/.changeset) for more info.

</details>
