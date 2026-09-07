# Task 08 — Support ticket API routes

**Fulfills:** buyer_account_specification.md Section 4.5 (Support Tickets)
**Phase:** PHASE 2 — BUYER ACCOUNT FEATURES
**Dependency:** task-07 [DONE]

> Back-filled 2026-09-07 per Rule 49.1 — code was built and Layer-3
> verified on 2026-09-06; this traceability file was never written at
> build time.

Four routes under `app/api/buyer/support/`: list+create, detail+thread,
reply (auto-reopens a closed ticket), standalone reopen (idempotent).
All CSRF-validated on mutations, session-scoped ownership baked into
the query (404 not 403 on mismatch), forbidden-character sanitization
on subject/message (Rule 18.1), Rule 28 response shape.
