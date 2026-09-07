# Needle cursor refinement — 2026-09-07

Scope: screen-space held-tool orientation and tip emphasis only. Preserve canonical
punctures, eye attachment, tip-first passage, tension front, guide, palette and file format.
Captain Sam now authorizes GitHub push after tests and exact-commit High review;
publication still requires the repository's FINAL_PUBLICATION_APPROVAL: YES gate.

1. Derive the eye-to-tip direction from screen-up and a center-right target (0.14
   hoop radii). Resolve the eye/angle dependency with a fixed bounded iteration,
   soften the near-target vector and stabilize the opposing-vector singularity.
   Inverse-project the resulting tip/eye/tail to the existing fabric coordinates.
   Use the same pose inside and outside, with no timing state or pointer lag.
2. Remove the fixed-angle front/back return heuristic. Return a captured shaft to
   its captured screen-derived pose after passage; keep exact endpoint geometry
   and the existing tip/eye crossing and thread-transport timing.
3. Share procedural silver needle drawing between fabric and floating overlay.
   Add a restrained madder reflection on the last 13% and a 2–3 px tip glint;
   fade it in the initial press phase, never invent a hidden-side marker.
   Keep thread color and eye attachment, reduce the oversized colored eye surround.
4. Unit-test projection, quadrants, center stability, mirroring, exact hotspot,
   deterministic sampling and passage continuity. Run existing full regression,
   production and offline suites. Capture real browser desktop quadrants, outside,
   back and angled views, with closeups and continuous puncture evidence.
5. Inspect the actual images/video, resolve failures, package exact source and
   evidence, request designated High correctness and publication review. Push only
   the exact approved commit after checking remote ancestry; verify remote equality.

No additional theme, handedness UI, topology changes or physics expansion.

## Local validation

149 unit tests, typecheck, production build, 59 full browser tests, 38 production
browser tests and 2 offline tests passed. The existing responsive-evidence integrity
check passed. Screen-space center continuity testing caught and drove stabilization
of an opposing-direction bifurcation before final browser verification. Source and
destination eye crossing now use the actual inverse-projected eye fraction.

Desktop screenshots confirm coherent quadrant variation, exact tip emphasis and
the same floating/back-side visual. Additional isolated performance and video runs
separate recording/load effects from correctness. These automated checks do not
claim physical stylus/tablet testing. Exact-commit High publication review follows;
no review approval is implied by this document.
