# CI history repair — 2026-09-07

Run 34127012125 stopped during Playwright test collection: the palette comparison
reads `44f55c1107223fa3c7d247f862accf0b4b9a684c:src/style.css`, but checkout's default
shallow history omitted that source. No browser test ran in that failed CI step.

Plan before repair:

1. Keep the baseline comparison and all tests intact; do not replace missing history
   with the candidate CSS or skip the visual test.
2. Configure checkout with `fetch-depth: 0` so the explicit historical baseline is
   available. No application, dependency, test or rendering changes.
3. Reproduce the failure in a temporary shallow clone, fetch full history and verify
   that the baseline CSS becomes available and exactly matches the local baseline.
   Check test collection and existing local validation on unchanged source.
4. Obtain a fresh exact-SHA High approval for this workflow-only repair, then
   fast-forward main and verify the replacement Pages run and public smoke test.

The original d4b07dd application review and browser evidence remain applicable only
to byte-identical application/test source; this document does not claim a CI PASS.
