---
name: poke-holes
description: Principal engineer review of recent changes — validate approach, find holes, catch missed edge cases. Use after implementing a feature or before merging.
user_invocable: true
---

## Instructions

Review the most recent changes from the perspective of a principal engineer specializing in the relevant domain(s). Your job is to stress-test the approach, not rubber-stamp it.

### Steps

1. **Identify what changed** — Use `git diff dev...HEAD` (or `git diff HEAD~1` if already on dev) and read the feature spec if one exists. Understand the full scope: new files, modified files, migrations, tests.

2. **Read every changed file in full** — Don't skim. Read the actual implementation, not just the diff. Understand how it integrates with surrounding code.

3. **Review as a principal engineer** — Evaluate across these dimensions:

   **Correctness**
   - Does the implementation actually do what the spec/plan says?
   - Are there logic errors, off-by-one issues, or incorrect assumptions?
   - Are race conditions possible (concurrent updates, async gaps, stale closures)?

   **Edge cases & failure modes**
   - What happens when things go wrong? (network failure, empty state, null user, missing data)
   - What happens at boundaries? (first use, last item, max values, rapid toggling)
   - Are there states the UI can get into that weren't considered?

   **Architecture & integration**
   - Does this fit the existing patterns, or does it introduce unnecessary divergence?
   - Are there existing utilities or abstractions that should have been reused?
   - Does it create coupling that will cause pain later?
   - Will this break or conflict with other in-progress features?

   **Data & persistence**
   - Are migrations correct and safe to run on existing data?
   - Is there data that could get out of sync between storage layers (DB, localStorage, in-memory state)?
   - Are there missing indexes, missing RLS policies, or incorrect defaults?

   **Security**
   - Any new attack surface? (XSS, injection, unauthorized access, data leakage)
   - Are permissions checked correctly?
   - Is user input validated at the boundary?

   **Performance**
   - Will this cause unnecessary re-renders, extra network calls, or memory leaks?
   - Are there N+1 query patterns or missing memoization?
   - Could this degrade under load or with large datasets?

   **Testing gaps**
   - What isn't tested that should be?
   - Are the tests actually testing meaningful behavior, or just confirming the code runs?
   - Are there integration boundaries that need coverage?

   **What's missing entirely**
   - Are there requirements from the spec/plan that weren't implemented?
   - Are there obvious user expectations that aren't met?
   - Is anything left in an inconsistent state? (partial migration, half-wired feature flag, etc.)

4. **Be specific and actionable** — Don't say "consider error handling." Say exactly what error case is unhandled and what the consequence is. Reference specific files and line numbers.

### Output Format

```
## Principal Engineer Review: <feature/change name>

### Verdict: <APPROVE / CONCERNS / BLOCK>

### What's solid
- Brief bullets on what's done well (keep short)

### Issues

#### Critical (blocks merge)
- **[File:line]** Description of the issue, why it matters, and what to do about it

#### Significant (should fix)
- **[File:line]** Description and recommendation

#### Minor (nice to have)
- **[File:line]** Description

### Missing
- Things that weren't implemented but should have been
- Edge cases with no coverage
- Tests that should exist

### Questions for the author
- Anything where intent is unclear and the answer affects the review
```

Use the **Critical / Significant / Minor** tiers honestly:
- **Critical** = will cause bugs, data loss, security issues, or breaks existing behavior. Must fix before merge.
- **Significant** = won't break things immediately but creates real risk, tech debt, or poor UX. Should fix now.
- **Minor** = style, naming, small improvements. Fine to defer.

If the changes look solid, say so clearly and keep the review short. Don't manufacture issues to seem thorough. An honest "this looks good, ship it" with 1-2 minor notes is more valuable than a padded review.
