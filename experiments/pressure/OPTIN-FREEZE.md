# Pressure opt-in candidate freeze proposal (2026-09-26)

> Historical prototype proposal, not the 2026-09-27 release identity. The release is integrated on published Touch `1a78fed651196a4f98874ea9ba1b53c806e82f6f`. Its complete delta includes the earlier Pressure changes to `src/active-thread.ts` and its tests; the statement below about no changes to that file applied only to the incremental prototype step. Prior results below are not exact-release-candidate results. See `RELEASE-CONTRACT.md` for current scope; the candidate is not frozen by this document.

Branch `feature/pressure-optin-20260926`, base `5040bd4`; no commit/push. Root owns any integration/rebase/release decision. Candidate keeps Pressure Experiment default OFF and explicitly labels real-device feel untested.

## Exact intended source and tests

- `src/main.ts`, `src/settings.ts`, `src/settings.test.ts`, `src/i18n.ts`, `src/style.css`: one localized public opt-in, transient owned-pen routing, settings default/normalization, visible caveat.
- `src/pressure-input.ts`: pure shared gesture/mapping helper, moved verbatim from `experiments/pressure/pressure-model.ts` (delete old path, update imports in `experiments/pressure/main.ts` and `experiments/pressure/pressure-model.test.ts`).
- `experiments/pressure/OPTIN-PLAN.md`, `OPTIN-VALIDATION.md`, `OPTIN-FREEZE.md`, `optin-smoke.mjs`, `optin.playwright.config.ts`, and `evidence/optin/*`: plan and reproducible candidate evidence. These are experiment/review artifacts, not app entry points.

No changes to `src/active-thread.ts`, production topology or timing, build configuration, or the canonical artwork schema are in this candidate.

## Verification and disposition

- TypeScript/Vite build PASS; Vitest 37 files/217 tests PASS from the final source state.
- Synthetic Chrome smoke PASS, including exact OFF/ON canonical artwork equality for the same two punctures and EN/ZH 390/768 viewport reachability. Capture is stubbed in this deterministic smoke; no physical pen validation.
- Native-input browser recovery/cancel/geometry/storage/rotation subset PASS 14/14.
- Full development browser regression run **once** against isolated port 5302: **93 passed, 1 failed (94 total, 4.6m)**. Raw console log: `evidence/optin/full-dev-e2e.log`, SHA-256 `d93c99e36f89b46c9fbf8b266367a86e1567fdf69403dd51ec4a1003efaca9f4`.
- The failure is `tests/e2e/node2-convergence.spec.ts:242`, whose pre-opt-in no-public-experiments assertion forbids the word `pressure` anywhere in public text or controls. That assertion now conflicts with the approved visible, default-OFF Pressure Experiment control. It is a test-contract update candidate, not a product/source failure observed by the other 93 cases. Do not silently waive it; root should approve a narrow assertion change after Touch P0 review/rebase, preserving all other forbidden controls, query inertness, and same-origin network checks. Then rerun the changed test and final full gates on the merged candidate.
- `git diff --check` PASS. Current tracked binary diff SHA-256 (`git diff --binary HEAD | shasum -a 256`): `d661612d06a12c91c511188b0445f30c65ca041ec91f8be0d3f1ae659063c234`. This tracked diff hash excludes the listed untracked files; their source hashes are in the worktree/tool handoff and evidence hashes in `OPTIN-VALIDATION.md`.
- Port 5302 stopped; no release action.
