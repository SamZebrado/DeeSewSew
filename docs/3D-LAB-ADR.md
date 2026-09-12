# ADR: bounded sphere lab, Phase 0 decision before implementation

Status: experimental, not a production migration or physically exact embroidery.
Authority: Captain Sam post-1FE2AD3; baseline 1fe2ad3. Reviewed production
thread-runs, thread-run-history, thread-run-storage, renderer and the existing
SUPPORT-3D-ARCHITECTURE audit. This decision precedes new topology code.

1. Fabric can be a planar SupportGeometry subtype with oriented front/back sheets;
   normalized coordinates map deterministically to local coordinates. Display
   thickness is declared, not an inferred physical measurement.
2. A ThreadRun remains a filament identity in ThreadNetwork3D. Its ordered
   punctures become typed attachments, segments become material spans, and start/
   end anchors remain explicit boundaries. Crossing is not a knot. Legacy
   unverified provenance remains unverified. The lab is one explicitly started
   surface-laid run, not a claim to implement puncture-through parity yet.
3. Support ID/shape/transform/role/state, attachment local coordinates, ordered run
   ownership and versioned rest-path policy are canonical. No screen coordinates
   enter saved artwork. Lab budget is one sphere, one run, at most 32 anchors.
4. Camera, projected points, picking ray, mesh, sampled paths and any artistic
   display offsets are derived/transient. TensionLink is reserved for explicit
   length/compliance references; none are invented in this slice.
5. Future punctures reference oriented support entry/exit positions and a shared
   crossing event. Lab attachments explicitly mean surface-contact, not physical
   piercing or knots. Stable support-local vectors survive camera changes.
6. Removal changes installation only. Geometry/transform and all attachment
   references persist exactly; reinstall toggles state. Removed supports cannot
   be edited/picked. Camera inspection is still available. Permanent removal
   fails closed. Bounded snapshot undo/redo also restores installation state.
7. Public v4 stays loadable by its unchanged parser and renderer. No automatic
   conversion, rewrite or lossy round trip occurs. Future explicit adapter must
   preserve original IDs/order/colors/seeds, side ownership and uncertainty.
8. Future public schema needs a new version, budgets, support coordinates,
   versioned path evaluators, explicit attachment kinds and operation/history
   migration. Public v4 import remains a one-way explicit conversion with fixture
   parity checks; never keep independently editable 2D and 3D authorities.
9. A separate /lab3d.html entry and experimental format/storage key isolate this
   proof. No production imports, storage keys, JSON format or renderer change.
   Lab format rejects production v4; production parser rejects lab data.

## Phase 1 plan and limits

Implement analytic sphere ray picking with perspective camera; drag always orbits,
click edits only in explicit Thread tool, wheel zoom bounded. Sample short great-
circle surface spans from canonical 3D vectors and depth-sort spatial drawing;
reject antipodal ambiguity. Retain canonical rest pose when support removed,
explicitly labeled artistic-rest-shape, no silk equilibrium/rigidity claim.
No continuous animation needed: draw on change, resize and camera input only.
Snapshot history is bounded to 64 edits of the small 32-anchor lab document.
Save/load is validated, separate and deterministic, failures preserve current state.
Unit tests cover picking, true depth, removal, serialization, malformed inputs and
budget. Browser evidence must cover camera/edit separation, removal/reinstall,
save/reload and real spatial views before any release-readiness claim.

## Follow-up decision: bounded artistic display relaxation and offline isolation

Before code: on support removal only, evaluate a 1.2-second analytical damped
envelope from absolute elapsed time. Each span receives a small radial offset
weighted by sin(pi * material coordinate); its attachments stay exact. Both time
endpoints are zero, no integration state, no timer per node, and canonical vectors
never change. Frame cadence only selects samples; hidden page/reinstall stops and
returns immediately to rest. Reduced-motion skips this decorative response.
This intentionally artistic display is not constitutive thread stiffness or silk
equilibrium. No perpetual animation or solver. Frame request lives only during
the bounded response. Add time-sampling invariance and canonical equality tests.

The multipage build already precaches lab3d.html and assets. Direct lab entry must
register the existing worker in production so first-visit offline reload works;
no worker source/schema/cache-policy fork. Test first-entry lab offline then main
v4 UI real stitching/save, lab invalid load, return to actual main artwork intact.

Async-import ownership decision: every new import and canonical edit invalidates
the previous read token. A resolved read can replace state or report errors only
while its token still owns the current revision. Stale success/error is silent;
undo/redo/load/edit remain authoritative. No background storage write is added.
