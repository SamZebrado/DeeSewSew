# PNG bounded acceptance gaps

Base2054b4f; isolated test-only branch. Plan before implementation:

1. Reuse canonical ThreadRun construction and actual download byte checks. Import using the real file input, reload, and compare clean images and canonical JSON.
2. Delay native toBlob callback delivery only, edit the real artwork while export is pending, then release encoding. Compare downloaded pixels/bytes to the captured pre-edit image and preserve the newer canonical state.
3. Inject one null encoding result, assert temporary canvases are detached and controls unlock, then retry with the original encoder and verify a real PNG.
4. Build an accepted count-limit legacy fixture through the actual parser/serializer; import it and measure pair export elapsed time as observation only. Assert actual count and byte budgets, no invented latency threshold.

No product changes or browser execution until main grants the slot. Tests exercise mocked failure scheduling but native PNG encoding/download. Main owns candidate integration, review and publication.

Prepared four tests; Playwright listing resolves all five including the existing acceptance, typecheck and diff whitespace check pass. No browser ran. Node fixture verification showed 8,000 raw legacy stitches are NOT accepted: migration serialization reaches its existing size guard first. Therefore the test binary-searches the largest accepted prefix of this exact fixture and asserts the next prefix fails. Actual Node result:6,337 stitches,997,933 normalized v4 characters, exact serialize/parse roundtrip. This is an ingestion-capacity boundary for this fixture, not a claim of reaching the v4 two-million-character ceiling. Vite SSR attempted an HMR listener denied by sandbox; computation completed and server was closed without escalation.
