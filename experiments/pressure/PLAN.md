# Pressure feasibility prototype

Question: can pen pressure give a perceptible sense of pulling loose thread taut while the needle is being positioned?

Scope: a separate Vite development page plus a small optional slack parameter in the transient active-thread model. This branch does not connect pressure to the studio's puncture handler, saved topology, or stitch timing.

Contract:

- Map one input, active pen pressure, to one effect, loose-thread slack. Light contact increases slack; firm contact reduces it. The neutral value reproduces the current model exactly.
- Mouse, touch, and an unchanging 0.5 pen stream use neutral slack. A non-default pen sample activates pressure response within that gesture, but does not prove hardware pressure capability.
- Clamp invalid and extreme samples; ignore other pointer IDs; preserve the last active pressure on `pointerup` because its specified pressure is zero; clear on cancel.
- The demonstration slider is synthetic and explicitly labeled. Browser tests are not Apple Pencil validation.
- No persistent artwork fields, canonical stitch coordinates, production entry point, or fixed stitch-motion duration change.

Evidence gate: unit tests for default equivalence, finite bounds and pointer lifecycle; build/typecheck; browser smoke test of the isolated page if available. Physical stylus feel remains HUMAN_DEVICE_VALIDATION_REQUIRED.

## Disposition after synthetic browser review

**Prototype only — HUMAN_DEVICE_VALIDATION_REQUIRED.** The initial standalone page drew an angular polyline and did not use the studio's thread renderer. The browser smoke shows one non-default coalesced sample activates the pen gesture; the latest dispatched 0.5 sample correctly restores neutral strength. That observation does not establish pressure hardware support or retained coalesced geometry. No production integration is part of this branch.

## Bounded curve-path successor (approved on base `b19c7f0`)

Replace only the demo's raw line segments with the studio's `looseThreadPath(state.points)` cubic path and scale each control/end point to the demo's 800 × 420 canvas before `bezierCurveTo`. Keep the exact same solver points, anchor and free endpoint, pressure mapping, pointer lifecycle, UI and production files. This makes the isolated demo use the same curve-path helper as the studio; it does **not** claim full material-renderer parity or stylus hardware validation.

Run typecheck/build and the existing synthetic browser smoke on port 5300. Preserve the original screenshots and write new `cubic-*` screenshots and a separate smoke JSON under `experiments/pressure/evidence`. Compare light, firm, and neutral renderings visually and hash the new images. No further solver tuning or production integration in this successor.

Outcome: the cubic demo now uses `looseThreadPath(state.points)` and `bezierCurveTo`, preserving the same points and endpoints. Side-by-side inspection of the original and `cubic-*` captures shows the sharp polyline corners replaced by continuous curves in light, firm and neutral states. This is **curve-path helper parity only**; studio material rendering and hardware feel remain unvalidated.
