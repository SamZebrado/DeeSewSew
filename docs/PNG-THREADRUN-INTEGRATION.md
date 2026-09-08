# PNG integration preparation — parked branch

Exact base: f6a89330dee73786ee1b1484ab99a350a07f55d1. New isolated worktree DeeSewSew-png-threadrun / branch parallel/png-threadrun-integration-20260908. Original PNG branch a436e5e and its actual browser evidence are preserved unchanged.

## Plan before implementation

1. Port only canonical PNG rendering, pair composition, download/busy controller and their tests from a436e5e. Do not port OS-share module/UI, old main.ts, topology, renderer or release files.
2. Insert the bounded localized PNG row alongside existing JSON backup. Snapshot existing frontItems/backItems, already derived by threadRunRenderItems on canonical commits; do not access guide/needle/transition arrays.
3. Add real ThreadRun fixture tests proving ordinary segments plus start/end anchors on the correct physical faces reach the PNG renderer. Capture canonical state before/after, and verify renderer receives null interactive state. Keep actual anchor-rendering visual verification explicitly pending.
4. Run Node/type/build checks only while primary owns browser/profile resources. No browser, Bridge, merge or publication. Main integrator resolves any future lighting/UI conflicts between independent branches.

The image exporter uses fixed default renderer lighting, not a live lighting UI setting. Future combined integration must decide deliberately whether PNG captures chosen lighting or a standard presentation; this branch does not modify the lighting worker's files.

## Implementation and validation

Ported `artwork-png.ts`, `artwork-png-action.ts` and their tests from a436e5e. Main receives only one import and22-line localized PNG controls insertion; i18n adds four catalog lines. `refreshRenderItems()` still derives both arrays through the untouched `threadRunRenderItems(runHistory.present, side)` adapter. Export snapshots those settled arrays only; guide dots, active slack, needle pose and transition tails are not provided to export.

Two additional tests create actual `startThreadAt → punctureThreadRun → endThreadRun` states, mirrored for both faces. They verify the ordinary segment is on the stitched face, both canonical anchor IDs reach the opposite-face export, renderer interactive inputs are null, and serialized canonical state remains exact after exports. The canvas/renderer boundary is mocked: real anchor pixels and guide screenshots on this new base remain unverified, not inherited from the older PNG browser run.

`npm run typecheck` PASS; `npm test`187/187 across31 files PASS; `npm run build` PASS (`deesewsew-786ffc4197ee`,7 shell assets); `git diff --check` PASS. No canonical topology/history/renderer/physics file changed, no OS-share module copied, no browser/Bridge/release/push action. No owned subprocess remains. Dependencies use an ignored symlink to the main checkout's existing node_modules.

Recommendation: PARK_FOR_LATER pending main-owned integration decision and fresh browser/production/offline/anchor-image evidence. Original PNG branch/evidence remain independent; no claim of acceptance of this combined branch. Known backend limitations remain: export exterior mask matches current0.485 hoop radius, fixed neutral background/default lighting, DPR below1 fails closed. Concurrent future lighting/UI work must be integrated deliberately by main, not overwritten by this branch.
