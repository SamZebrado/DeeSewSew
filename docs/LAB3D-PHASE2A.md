# 3D Lab Phase 2A — bounded implementation plan

Base: f78eddfc7bdca6130bb8b2e818051d31ceb8eeba. Public playtest assets complete in the separate pressure-release review directory; that product checkout remains unchanged.

## Data and compatibility

Introduce Lab v2, never merge with production 2D schema. Ordered runs store sequential unique IDs, immutable per-run hex color, ordered support-local Vec3 anchors, great-circle-v1 path and open/completed state. At most one active run, 8 runs and 32 anchors per run; max import 128 KB. Actual public v1 files migrate deterministically with exact anchors, color, support transform/role/state preserved. Existing v1 storage slot remains read-only fallback; new saves use a separate v2 Lab slot so a public-baseline rollback retains old files.

## Interaction and artwork

Explicit New thread and Finish / cut controls. First placement in a pristine work may start the first run; after finish, placement requires New thread. Starting/finishing cancels an in-flight gesture and never adds an anchor. Color picker applies only to the next run. Completed runs never change color. Run list exposes color, count and state. Undo/redo includes lifecycle changes. Existing keyboard orbit/zoom/center placement and camera-only clicks remain intact.

One optional example only: Three curved bands, built as three independent completed colored runs in support-local coordinates. Load example only into an empty work (disabled otherwise); undo restores empty. Users can inspect/remove support, save/export, or add their own fourth run. No destructive sample replacement, no pattern library. Short inline instructions describe manually creating a band with orbit and repeated anchors, cutting, choosing color and starting the next.

## Rendering and bounded performance

Iterate spans inside each run only, carry color into depth-sorted line pieces; never draw inter-run connectors. Preserve current support occlusion, transform and artistic radial display response. At most 8×31×24 line pieces; event-driven rest drawing and existing bounded 1200ms response, no new continuous solver. Canonical runs remain unchanged by camera or release dynamics.

## Validation and release gates

1. Model tests: actual v1 null/single/multiple anchors, removed/transformed/permanent supports; v2 roundtrip, IDs, colors, active lifecycle, bounds, no accidental continuation, immutable geometry.
2. Browser: mouse and keyboard independent runs, colors, cut/new gesture cancellation, history, v1 fallback/v2 save/export/import, 2D slot isolation/offline, support reinstall exactness, example actual screenshots in Chinese/English, desktop/tablet/phone readability (desktop-first authoring remains explicit).
3. Narrow CI addition for existing focused Lab browser suite after production build, no workflow redesign.
4. Unit/type/build, focused Lab and normal browser/offline gates. Inspect real browser images and record exact source/build provenance. Independent source audit; freeze coherent candidate, one exact-SHA canonical High review before any push/deploy.

Owners: root UI/i18n/example/browser/CI/integration/Bridge; Sol Low model and model tests only. No higher tier without prior bounded Bridge approval.

Non-goals: arbitrary meshes, knots, collision/FEM/XPBD, physical equilibrium, Petting, Audio, stylus expansion, cloud, machine export. Pressure physical feel remains PENDING; other published packages remain CLOSED.
