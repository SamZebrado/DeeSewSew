# Pressure Experiment opt-in validation (2026-09-26)

Candidate: `feature/pressure-optin-20260926` based on `5040bd4`. Uncommitted review candidate; no push or release.

Scope: default-OFF public setting; active owned pen pressure maps only to transient loose-thread slack. The mapping and demo share `src/pressure-input.ts`. No canonical stitch topology or timing changes. Synthetic browser events do not validate Apple Pencil or other hardware feel.

Checks from the final source state:

- `npm run build`: PASS (TypeScript and Vite; 51 modules).
- `npm test`: PASS (37 files, 217 tests).
- `git diff --check`: PASS.
- `node experiments/pressure/optin-smoke.mjs` against Vite on `127.0.0.1:5302`: PASS. The script used a fresh headless Chrome context and labeled synthetic pointer events. `hardwareValidated` is false in the raw evidence.
- Existing native-input browser regressions against the same isolated server: `npx playwright test --config=experiments/pressure/optin.playwright.config.ts tests/e2e/recovery-cancel.spec.ts tests/e2e/recovery-geometry.spec.ts tests/e2e/recovery-storage.spec.ts tests/e2e/ux-c1-rotation.spec.ts`: PASS (14/14).

The browser smoke covers English/Chinese wording, default-off visuals and persistence, constant `.5` pen neutrality, a non-default owned pen sample, unrelated pointer cancellation, owned cancellation, rejected too-close release, disabling during a gesture, mouse/touch neutrality, and absence of pressure in artwork JSON. The rejected release kept artwork unchanged and returned the preview scale to 1. The non-default synthetic pen sample yielded scale ~0.48; this is mapping evidence, not hardware validation.

The smoke also repeats one identical two-puncture sequence in fresh contexts with Pressure Experiment OFF and ON (synthetic pen pressure `.9`). Persisted canonical artwork is byte-identical, not merely pressure-field-free: both files have SHA-256 `6e548f31cdcb84a57371a535f9c9e648d5ad6229edb85894d610c43ad041dec4` including the saved newline. `smoke.json` records the identical pre-newline string hash and two punctures. No metadata was ignored. The four EN/ZH 390px-phone and 768px-tablet checks show a reachable toggle, no horizontal document overflow, and no clipped caveat text; screenshots capture these viewport states, not physical devices.

The synthetic smoke stubs `setPointerCapture`, `releasePointerCapture`, and `hasPointerCapture` to dispatch deterministic pointer events. It therefore does not prove native browser capture semantics. The separate 14-test browser run exercises the existing native mouse/touch capture, recovery, cancellation, and rotation paths with the setting at its default OFF.

Evidence: `evidence/optin/smoke.json`, `canonical-off.json`, `canonical-on.json`, `off.png`, `on-variable-pen.png`, and four locale/viewport screenshots. Selected SHA-256:

```
caf321fb7547724c9b2de3418ece79847f2a655be9898c915a43a5e451060c1f  off.png
9f342dcb999e459496041325fa1a46e4bd7bf9f4dd6d660f00e9385334ab7d8b  on-variable-pen.png
a6e1e73f7318ff44a8a408d4b550154c9d452d08771e7c40b1dd642a47e0547e  smoke.json
3f28831fa7a3e9644a646169755e32e2d7802d65903d0bfbde4466c3ca303f18  src/main.ts
4b576fecae57e7aceae3009fe56f89455768d025245844bc7f9f4463c25eaf91  src/pressure-input.ts
81bb5c1fb88c780e509839626a2a40b6ac60f50c1ed922089952ee0fe78d6789  optin-smoke.mjs
```

Disposition: review candidate only. Real pen/device sensory validation remains pending and is nonblocking for the bounded experimental opt-in, not evidence for hardware support.
