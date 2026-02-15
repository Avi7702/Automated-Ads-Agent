# SPEC: [Feature Name]

> Created by: spec-interviewer agent
> Date: [YYYY-MM-DD]
> Status: DRAFT / APPROVED / IMPLEMENTING / VERIFIED

## Objective

[One paragraph: What this feature does and WHY it exists. Not just "what"
but the business/user problem it solves.]

## Use Case / Intent

[The logic and reasoning behind this feature. Written so that someone
debugging this code 6 months from now understands what it was SUPPOSED
to do, not just what it currently does.]

## Constraints

- [ ] [Hard limit 1: e.g., "No new paid dependencies"]
- [ ] [Hard limit 2: e.g., "P95 response time < 200ms"]
- [ ] [Hard limit 3: e.g., "Must work with existing auth flow"]
- [ ] [Constraint: "Must follow existing pattern in [file]"]

## Acceptance Criteria

Numbered, checkable. Each item is a concrete, verifiable behavior.

- [ ] 1. [User can perform action X]
- [ ] 2. [System responds with Y within Z milliseconds]
- [ ] 3. [Error state A displays message B]
- [ ] 4. [Data persists across page refresh]

## Edge Cases

Specific scenarios that could cause failures if not handled:

- [ ] What happens when [input is empty / null / malformed]?
- [ ] What happens when [network drops mid-operation]?
- [ ] What happens when [storage quota exceeded]?
- [ ] What happens when [concurrent requests arrive]?
- [ ] What happens when [user has no permissions]?
- [ ] What happens when [token expires mid-request]?

## Integration Points

Exact files and systems this feature connects to:
| File/System | Relationship | Direction |
|-------------|-------------|-----------|
| [src/path/file.ts] | [What it does for this feature] | reads/writes/calls |
| [API endpoint] | [How this feature interacts] | consumes/provides |

Dependencies:

- Depends on: [other feature/system that must work first]
- Depended on by: [other feature/system that breaks if this breaks]

## Test Scenarios (BDD Format)

### Happy Path

**Scenario 1: [Primary success flow]**
Given: [precondition]
When: [user action]
Then: [expected result]
And: [additional assertion]

**Scenario 2: [Secondary success flow]**
Given: [precondition]
When: [user action]
Then: [expected result]

### Error Paths

**Scenario 3: [Primary error flow]**
Given: [precondition]
When: [error condition]
Then: [error handling behavior]

### Edge Cases

**Scenario 4: [Edge case from above]**
Given: [precondition]
When: [edge condition]
Then: [expected handling]

## Verification Steps

Commands and checks to prove the feature works:

- [ ] Run: `pnpm test [specific test path]`
- [ ] Run: `pnpm build` (no errors)
- [ ] Run: `pnpm typecheck` (no type errors)
- [ ] Manual: [step-by-step manual verification]
- [ ] Visual: [what the UI should look like]

## Technology Verification

Every dependency and pattern used in this feature MUST be verified as current.

| Technology         | Version Used  | Verified Latest? | Source                   |
| ------------------ | ------------- | ---------------- | ------------------------ |
| [e.g. Better Auth] | [e.g. 1.4.18] | [ ] Yes          | [link to docs/changelog] |
| [e.g. Drizzle ORM] | [e.g. 0.45.1] | [ ] Yes          | [link to docs/changelog] |

- [ ] Web-searched for latest versions of all dependencies
- [ ] No banned patterns used (see CLAUDE.md "Technology Currency Rule")
- [ ] Checked official docs for current API signatures (not assumed from training data)

## Implementation Notes

[Optional: Guidance for the implementer about approach,
existing patterns to follow, or technical decisions already made.
Added by spec-interviewer based on codebase exploration.]

## Revision History

| Date   | Change               | Author           |
| ------ | -------------------- | ---------------- |
| [date] | Initial spec created | spec-interviewer |
