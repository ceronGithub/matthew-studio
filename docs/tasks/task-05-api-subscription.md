# Task 05 — Subscription API routes

**Fulfills:** buyer_account_specification.md Section 4.4 (Subscription Management)
**Phase:** PHASE 2 — BUYER ACCOUNT FEATURES
**Dependency:** task-04 [DONE]

> Back-filled 2026-09-07 per Rule 49.1 — code was built and Layer-3
> verified on 2026-09-06; this traceability file was never written at
> build time.

Three routes: `GET /api/buyer/subscription` (current plan/status,
null-safe), `POST .../cancel` (sets `cancelAtPeriodEnd`, never an
immediate cancel/delete), `GET .../invoices` (billing history, newest
first). Standard `getSessionUser()` + Rule 28 response shape + CSRF
check on the cancel mutation.
