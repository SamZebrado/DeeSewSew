# 3D Lab Phase 1 proof — FIX_FIRST for publication

## Current handoff: localized UX slice

See `3D-LAB-UX-RESULT.md` for the current source-bound UX result (runtime candidate
84fa39f). The sections below preserve the earlier c982503 geometry proof and must
not be read as final UX or release approval. Full 92/65/2 inherited regression
passed at frozen c982503; the localized follow-up has its own 8 focused browser
tests and still requires main integration/full final gates on the Pattern base.

Local-only isolated candidate. No Bridge, push, production migration or approval.

## Final follow-up validation — 2026-09-12

Current follow-up supersedes the historical static/sentinel-only notes below.
Final build/typecheck and 203 unit tests / 34 files pass. Focused production Chrome
continuous interaction and actual-v4 offline tests pass on final runtime sources.
Additional real keyboard/mouse checks: Escape cancels pending click, changing tool
via keyboard while held cancels, undo while held cannot create a stale release
anchor, wheel while held never edits. Canonical changes and hidden state cancel
pending gestures. Controlled delayed File.text proves older A cannot overwrite B
or edits made during reading. Ownership covers errors too; stale errors are silent.

Final isolated CPU profile (5 warmups, 21 samples; headless installed Chrome,
1200×960; 32 anchors): actual pointerup picking+commit+canvas submission median
1.1 ms / p95 1.4 ms / max 1.5 ms; synthetic wheel+draw median 1.2 ms / p95 1.4 ms /
max 1.5 ms. Raw `profile.json`. Includes serialization/debug data attributes and
CPU command submission; NOT GPU/compositor completion, mobile, FPS or power.
Display frame counter stops after 1.2 seconds and remains unchanged for 400 ms;
reduced-motion removal produces no ongoing frames. Canonical equality verified.

Final continuous recording: `review/lab3d-phase1/page@b9723dcdc508fec784620295b6afa793.webm`.
Final installed screenshot visually inspected; sparse spatial thread bends around
the sphere and changes projection under orbit. This is still an experimental
geometry study, not final embroidery material styling or physical silk dynamics.
`result.json`, `offline-result.json`, PNGs and `profile.json` are the final evidence.
All owned browsers closed and preview 4194 stopped. No user browser disturbed.

Remaining before public experimental release: integrator independent review,
full applicable 2D regression at constructed release SHA, chosen discovery/link,
accessibility/localization/product-polish judgment and High exact-SHA approval.
No new production topology/schema changes. No claim that this subtask independently
authorizes publication. Recommended classification: coherent Phase-1 proof ready
for integrator review; FIX_FIRST for a public release package.

## Follow-up implementation (supersedes static-display limitations below)

The follow-up introduces a 1.2-second analytical artistic radial response only
after removal. Amplitude <=0.07 support units, endpoint/material weighting,
exponential damping, exact rest at time endpoints. Actual envelope is much
smaller than the bound. No canonical mutation, solver integration, per-node state
or frame-rate dependence; reduced-motion skips, hidden/pagehide cancels.

Camera has explicit world-space `target`; UI targets canonical support origin,
projects local→world anchors, and converts ray intersections world→support local.
Nonidentity ray correspondence and exact transform preservation are unit tested.
Independent review caught two additional issues now fixed: wheel during held
pointer suppresses click edits, and permanent+removed import fails closed.
Permanent support action is disabled and no-op commits do not add undo entries.

First-entry production lab now registers the existing generated worker. The
generator already precaches lab HTML and assets; worker policy is unchanged.
Focused offline browser passed first-entry lab→offline reload→actual production
two-puncture v4 artwork→lab save/load→invalid v4 into lab rejection→production
reload with byte-identical v4. This replaces the earlier sentinel-only boundary.
Final follow-up build and 202 units / 34 files pass. Final browser rerun and CPU
profile are queued behind the main integrator's exclusive browser validation.

The initial profile used synthetic PointerEvents and is INVALID because capture
requires an active pointer. `profile-invalid-synthetic-pointer.json` is preserved
but is not performance evidence. Corrected harness measures real pointerup handler
CPU using capture/bubble timestamps, with 5 warmups and 21 measured samples;
wheel CPU uses explicitly synthetic wheel events. Never infer GPU/mobile/power.
ADR committed first at 7543300. The lab uses one sphere, one ordered contact run,
32 anchor maximum, 24 sampled edges per span. Every anchor is a unit local Vec3;
its world position is local + canonical support translation. Camera orbits the
support origin (translation therefore cancels when constructing camera-relative
coordinates); transform is never rewritten by camera/removal. This first shape
is rotationally symmetric and has no orientation/scale editing.

`/DeeSewSew/lab3d.html`: camera-only by default; explicit Thread tool click starts
or extends a surface-laid run. Drag always orbits, never edits; zoom is 2–7 radii.
Analytic ray/sphere intersection, perspective projection, front-surface occlusion
and depth sorting all use spatial geometry. Great-circle spans are intentionally
supported surface paths, not fake projected 2D artwork or straight fabric stitches.

Removal hides the support and deactivates contact editing without deleting support
or attachments. Reinstallation is exact. The artistic rest pose is currently
static; no material stiffness or real-silk equilibrium is asserted. No transient
solver, oscillation, 3D puncture penetration, cut UI, knots or free-space physics.
These distinctions are visible on the page. This is a coherent small geometry /
interaction proof, not "3D embroidery complete".

## Verified locally

- Typecheck, build: PASS. 201 unit tests / 34 files PASS, including five new lab
  tests. Parser rejects lab/public cross-format input, invalid vectors/transforms,
  large files, coincident/antipodal adjacent anchors and >32-anchor runs.
- Real installed Chrome headless interaction recording via
  `node scripts/lab3d-evidence.mjs`, own server 4193: PASS. Default clicks do not
  edit; four clicks produce four spatial anchors; real drag does not change
  canonical state; removed support cannot receive edits; orbit after removal;
  reinstall equality; local save/reload equality; malformed load preserves state;
  nonidentity [2,-3,4] support remove/reinstall/save/reload equality; no page errors.
- Normal storage isolation browser check is a separate sentinel only, NOT a real
  v4 production UI roundtrip. Source imports/storage keys are separate and unit
  boundary test proves existing public parser rejects the lab format.
- Evidence: `review/lab3d-phase1/{installed,orbit,removed,restored}.png`, continuous
  WebM and result.json. Removed screenshot visually inspected: spatial arc form
  changes with camera, although depth without support is still visually sparse.
- Work is bounded to <=744 sampled edges, draw-on-change only, no RAF/idle solver.
  This is a code bound, not a measured GPU/mobile/FPS performance claim.
- First browser launch failed because bundled Chromium was absent; installed
  Chrome succeeded. No browser download. Test browser closed in finally; own
  server stopped after evidence. No Playwright MCP launched; sandbox ps denied,
  no unrelated process cleanup attempted.

## Remaining release gates

Independent architecture/visual inspection, real production v4 unaffected smoke,
full relevant 2D regression, strict public experimental UX/localization/accessibility,
offline handling for multipage entry, measured bounded browser performance, and
High exact-SHA approval. Multipage build currently bundles an entry; production
main has no link and no runtime lab import. The existing service worker generator
must be audited before publication (do not assume direct lab offline route works).
No public readiness claim based on unit mathematics alone. Static artistic rest
shape is useful proof but needs judgment on whether a small restrained transient
display relaxation is necessary to avoid a wire-like visual before release.
