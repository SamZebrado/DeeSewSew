# Pressure prototype validation — 2026-09-26

Disposition: isolated prototype; HUMAN_DEVICE_VALIDATION_REQUIRED and studio
renderer parity pending. No production entry point, storage, or puncture wiring.

Final coordinator gates: 37 files / 216 tests PASS, including four pressure-model
tests; TypeScript plus production build PASS. Independent source review accepted
after pointer-owner cancellation guards and live reduced-motion updates. Root
compared the unchanged default path with frozen 084cf2b: exact full-state equality
at every frame in 18 three-second cases (30/60/120 Hz, two motion modes, 6/10/16
samples). This is default compatibility, not pressure-device validation.

The synthetic Chrome smoke in `smoke.mjs` records light versus firm slack,
last-active pressure on release, owned versus unrelated cancellation/capture
loss, neutral mouse fallback, and live reduced-motion changes. Coalesced samples
prove activation followed by latest-sample precedence only. It stubs pointer
capture because synthetic events are not native hardware contacts; it does not
validate native capture, Apple Pencil, latency or physical feel.

Root inspected light/firm screenshots: sag differs visibly, but the demonstration
draws a visibly angular polyline, unlike the studio renderer. Do not present it
as tactile-ready. Browser and dedicated port 5300 server were closed after tests.

Follow-up on base b19c7f0: the demo now reuses the studio's `looseThreadPath`
cubic helper with the same solver points. Typecheck/build and the same synthetic
smoke PASS; original screenshots are retained alongside `cubic-*` captures. Root
inspected both light/firm pairs and confirmed removal of sharp corners while
preserving the pressure contrast. This supersedes only the angular-path issue,
not the remaining material-rendering or physical-stylus validation limitations.
