# UX-C1 completion after human review

Base checkpoint: 74920e5ef6ca153f4aa2686aebc09517a9d2f3d2. Human gate NOT PASS. Preserve accepted Shift rotation, Cool Linen, live slack/inertia and truthful topology. One active branch; no early implementation review or publication.

## Root-cause trace before edits

Canonical segments originate at the previous puncture and end at the just-committed puncture. Active rope captures points from the old hole to needlePose(new tip).eye. looseThreadPath preserves this ordering. The renderer obtains the actual settled old→new cubic, reverses the back display mirror before tightening, and the evaluator computes u=1-cumulativeArc/total. No screen-Y direction heuristic exists. However endpoint identity is implicit in array orientation rather than an explicit contract.

Two independently verifiable animation defects: drawNeedle contracts shaft/eye by global threadPull, while tightenThreadPath's new-end weight reaches1 earlier. At threadPull=.5 the visible eye remains .03225 normalized units from the tip but the thread endpoint is already at the tip (20.64px at640px). Also canonical needle-side changes immediately at commit, and transientFor immediately shows the full hover needle on that side while the source-side motion still runs. NeedlePosition is calculated but not used to pass the shaft through the fabric. Thus there is no proper tip-first/eye-later emergence or attached free length. Default eye offset is lower-left, contrary to requested lower-right. These defects can dominate perceived direction; do not claim a Y-sign bug without reproducing one.

## Ordered implementation contract

1. Shared NeedlePose + passage: tip/eye/tail are separate; default tail lower-right. One deterministic passage pose translates the threaded needle through the new hole, clipping visible shaft by source/destination surface. Tip precedes eye; source thread endpoint follows visible eye until it crosses, then terminates at the hole; destination gets a short bounded hole→eye loose span. No duplicated full hover needle during passage. Preserve p0 exact geometry, final settled target, bounded interruption and immediate canonical commit. Retain pose on handoff to avoid a new snap. No spool/finite supply/UI handedness.
2. Semantic tightening: explicit anchorHole/pulledHole/capturedEye contract; normalize input curve orientation by endpoint identity, not screen axes. Source endpoint transport follows passage eye; only after passage/extra emergence does the arc-length front travel new→old. Unit + production four-direction/face/angle/length matrix; vertical opposing videos and close-up passage evidence required before review.
3. Floating needle: shared-pose overlay outside fabric for mouse direct-editable mode only; pointer-events none, no canonical writes or outside commit; hide for hidden targeting, camera gestures, blur/hidden. Smooth reentry uses the same pose semantics.
4. Full zh/en catalog: safe initial language detection and persisted override; in-place text/ARIA update without rebuilding state. Include all static/dynamic errors/status, files and guide; tests for fallback and state invariance.
5. Files/A06: strict temporary parsing, semantic IDs/orders/finite values/circular bounds/resource limits; accepted data remains serializable after continuation. Local versioned envelope, confirmation before replacing nonempty work, preserve valid state on failure, recovery export works without storage.
6. Monochrome leaf: own guide geometry/ordered targets, only next target highlighted; each step normal canonical puncture. Progress separate, reconciled with undo/reload, exit keeps stitches. No fake first segment or auto color.
7. Paired Chinese-first/English README, truthful current limits and device evidence.
8. Full unit/type/build/production/offline/responsive regression, then dedicated combined profiling:1000 segments, active/passage/tension CPU, renderer/cache, RAF, handlers, locale/guide/file paths, idle/hidden, measurable memory. Optimize measured hotspots only.
9. Exact combined candidate High correctness+performance review including continuous video; distinguish blockers/worthwhile pre-release/optional. Only after PASS leave one final local human candidate. Physical tablet feel is not a blocking gate this round. No publication approval request or push.

## Implementation checkpoint

The required product functionality and performance audit are implemented; review/human gates remain separate. The first full browser pass exposed a 32px language button and three obsolete simultaneous-bilingual assertions. The button now meets 44px and the assertions verify mutually exclusive text after an actual language switch. Final validation: 57 full browser tests, 36 production repair/UX tests, 2 offline tests and 144 unit tests passed; type/build checks passed. Production videos were visually inspected before review submission.

The free needle reorients through the same rigid pose after fully clearing the fabric, ending at the cursor's normal holding pose. This avoids a jump on the next pointer event while preserving tip-first/eye-later passage. Motion-off resets directly to the new-side holding pose.

Localization uses English message IDs, a centralized Chinese catalog and bounded text/attribute bindings; switching does not reconstruct the application. Guide progress is derived only on topology changes, not by scanning artwork on every pointer frame. File import validates canonical IDs, circular bounds, total limits and order/serialization headroom before any replacement; v1 migration preserves front-only history.

Measured optimizations and limitations are documented in `UX-C1-PERFORMANCE.md`. High correctness/performance review must inspect actual production video as well as these numbers. No publication approval is requested by this checkpoint.
