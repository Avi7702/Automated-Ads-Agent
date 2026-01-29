# 3. Storage Decomposition via Domain Repositories

Date: 2026-01-29
Status: Accepted

## Context

`server/storage.ts` grew to 2,198 lines containing 130 methods across 15 business domains (generation, product, user, template, copywriting, knowledge, quota, pattern, planning, approval, usage, API keys, and more). It is consumed by 36 files and mocked in 9 test suites via the `export const storage` singleton.

Key observations from code analysis:

- **No transactions** -- grep for `transaction`, `begin`, `commit`, `rollback` returned 0 results. Methods are independent.
- **No circular dependencies** -- `storage.ts` imports only `db`, `logger`, and `encryptionService`.
- **Single responsibility violation** -- a 2,198-line file covering 15 domains is a maintenance burden. Finding a method requires searching through unrelated code. Code review diffs are noisy.

## Decision

Split `storage.ts` into 12 domain repository modules behind a backward-compatible facade. The `export const storage` singleton remains unchanged -- `DbStorage` delegates to repository functions internally. Zero changes to the 36 consuming files.

Structure:

```
server/repositories/
  generationRepository.ts    # Ad generation CRUD
  productRepository.ts       # Product library
  userRepository.ts          # User accounts, preferences
  templateRepository.ts      # Template patterns
  copywritingRepository.ts   # Ad copy operations
  knowledgeRepository.ts     # Knowledge base / RAG
  quotaRepository.ts         # Usage quotas
  patternRepository.ts       # Pattern extraction
  planningRepository.ts      # Campaign planning
  approvalRepository.ts      # Approval queue
  usageRepository.ts         # Usage tracking / analytics
  apiKeyRepository.ts        # API key management
  index.ts                   # Barrel export
```

Each repository exports named functions (not classes) that accept a database connection and return results. `storage.ts` shrinks to ~200 lines as a thin delegation layer.

## Consequences

**Positive:**

- Each domain is independently readable, reviewable, and testable
- `storage.ts` drops from 2,198 lines to ~200 lines of delegation
- New developers can find methods by domain folder instead of searching a monolithic file
- Repository-level tests (`server/__tests__/repositories/`) can run in isolation
- 36 consuming files require zero changes -- `storage.method()` calls work identically
- 9 test suite mocks continue to work via the same `storage` interface

**Negative:**

- 12 new files to maintain instead of 1
- Cross-domain queries (if they emerge in the future) would need explicit coordination
- Initial migration effort to move methods without introducing regressions
- IDE "Go to Definition" on `storage.method()` now resolves to the facade, requiring one more hop to reach the implementation

**Mitigations:**

- Barrel export (`server/repositories/index.ts`) keeps imports clean
- The absence of transactions means methods can be moved independently with no cross-method concerns
- Comprehensive test suite (80%+ coverage) catches any regression during migration
- TypeScript ensures the facade correctly delegates every method (compile-time verification)
