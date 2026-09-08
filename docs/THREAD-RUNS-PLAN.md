# Thread runs and Pattern Lab

Baseline: e35384af9541d754c6161650509a68a3d9a16d39, refreshed origin/main equal. Preserve the previous uncommitted dual-flower design and all historical evidence.

## Implementation sequence

1. Add a versioned thread-run domain around the existing, verified puncture and renderer geometry. Explicit runs own their punctures and segments, have stable identities/color/provenance, and cannot cross-connect. End-thread is a canonical ordered event; no empty run is created until a real puncture. Preserve needle side and position when ending.
2. Add a small localized End thread control, meaningful only for an active run. A different selected color ends the current run before selecting the next color. Same-color selection does not end it. Cancel transient pointer ownership before a boundary; no false knots or moved needle.
3. Store boundaries and active state in schema v4. Strictly validate ownership, order, side, coordinates, color and budgets. v1/v3 remain readable without writes on load; preserve old geometry/colors and label uncertain legacy physical provenance. Undo/redo must restore boundaries and stable IDs, including after reload; branching clears redo.
4. Separate desired front/back strokes from physical run targets in GuidePattern. Preserve current published flower geometry, sequence, connector, UI and compatible progress. Prepare multi-run execution with explicit boundaries, not hidden connectors; future pattern versions fail safe without clearing artwork.
5. Add offline, deterministic Pattern Lab validation/preview commands and one tiny disconnected synthetic fixture. Reuse production topology/renderer. Output canonical JSON, exact target/ownership/count validation, front/back clean PNG and provenance. No public fixture, runtime solver or new final flower.
6. Run full unit/type/build/browser/production/offline suites, new run/guide/lab tests and isolated 1000-segment profile. Measure actual local browser CPU/RAF, not physical-device latency. Capture bounded actual application end/change/reload and flower regression evidence.
7. Freeze exact source SHA, package source/diff/evidence/hash manifest, obtain established High implementation/topology/storage/performance and exact-SHA publication approval. Only then non-force fast-forward push, full Pages CI, public smoke and asset equality.

## Guardrails

No pointermove run reconstruction, serialization or provenance calculation. Boundaries are commit-time work; existing render invalidation and idle RAF stopping stay intact. No arbitrary middle-segment deletion, whole-run editor, fake knots, palette/needle/physics redesign or quota-log work.

`EIGHT_PETAL_PATTERN = WAIT_FOR_SUPPLEMENT`. Do not invent or freeze its route. If supplied before candidate freeze, evaluate integration under the user's timing contract.

## Latest supplement and stop gate

Captain Sam's subsequent Cut Thread + Flower/Heart attachment supersedes the eight-petal waiting direction for this active package. It authorizes Ctrl+primary click / localized Cut thread, canonical small start/end textile artifacts (not knot physics), and exactly the supplied 14-edge FRONT flower / 12-edge BACK heart. It explicitly forbids alternative motifs and requires STOP/return to ChatGPT if either face fails.

The supplied candidate has now failed the real-render FRONT visual gate: four triangles around a plus sign do not read immediately as a cute flower. Development is stopped with uncommitted ThreadRun WIP preserved. The candidate was diagnostic only, with two disclosed real single-puncture preparation runs to respect existing side parity; no public guide or exact candidate SHA was frozen. Evidence and incomplete-work boundaries are in `review/thread-runs-20260908/REPORT.md`. Next action is bounded ChatGPT design feedback, not publication.

## Acceptance checkpoints

## STOP released — accepted revision and implementation contract

Captain Sam explicitly accepted High's exact 12-edge tulip and softened 12-edge heart. The previous diagnostic STOP is historical, superseded; no further confirmation is required. Preserve failed evidence, remove all preparation runs from the public guide. The exact static point/edge tables live in src/tulip-heart-pattern.ts.

Canonical explicit setup records startMode=visible-side on a new run. startThreadAt(front,P) enters BACK→FRONT, creates only first puncture and BACK start anchor; ordinary Q makes FRONT P→Q; cut creates BACK end anchor. Back mirrors this. Active-run setup is rejected until cut. Camera changes never invoke setup. Undo of the first setup restores the preceding canonical puncture pose (or empty front pose), not the deliberately selected entry side. Parser validates explicit provenance separately from ordinary side continuation.

Guide actions derive from committed topology and run boundaries: start, puncture, mandatory cut; front/back phase selection is explicit UI only. Highlight tolerance selects the exact frozen target, not an approximate edited point. Reload validates version/pattern/order/ownership, and import/clear removes stale sessions. Old flower retains its original entry connector and active legacy color.

Ctrl action owns one captured primary pointer, commits only on valid release within six CSS pixels, and cancels on drag, Escape, cancel, capture loss, blur, hidden or view change. No per-node timers or additional physics. Touch button calls the identical cut function. Unknown import fields normalize away; legacy ID namespaces are preserved by skipping conflicting new operation IDs; next-state serialization preflight blocks unsaveable punctures without changing artwork. Anchor artifacts do not add repeated zero-length coverage samples.

Visual preflight passed integrator inspection using actual renderer: 24 runs, 48 punctures, 24 ordinary segments, 48 anchors, no preparations. This is not High implementation/publication approval. Final gates remain full tests, production continuous guide evidence, responsive images, isolated performance, exact-SHA High, non-force FF push, Pages and public smoke. Parallel PNG/audio/petting remain isolated; only showcase documentation integrated so far.

### Remaining acceptance checkpoints

- End/new same-color and different-color runs have no connecting segment.
- The first puncture of each new run has no segment; subsequent segments belong to exactly one run.
- Undo end restores active state; redo identity survives; reload and branches do not merge runs.
- Old valid files retain front/back render geometry, colors, order and source provenance; invalid/future imports leave current work untouched.
- Existing flower remains visually and operationally unchanged; synthetic multi-run guide is dev-only.
- Pattern Lab checks actual target edges against canonical output rather than declaring a route to be artwork.
- No publication claim before distinct High approval, push, CI and public-smoke gates.
