# Lighting-only prototype — PARK_FOR_LATER

Base `f6a89330dee73786ee1b1484ab99a350a07f55d1`, isolated branch `parallel/lighting-prototype-20260908`, 2026-09-08. This plan precedes implementation. It reuses Notion DESIGN D04/D07 and the separate `2ce4b8e` material/lighting inventory, not the advanced WIP renderer. No publication, browser workload, material selector, new texture, topology/ThreadRun mutation or artwork/settings schema revision is authorized here.

1. Add one collapsed “Appearance” section with a labeled native lighting selector: existing soft-daylight, warm-lamp, flat-worklight IDs only. Reuse current chrome tokens, focus treatment and localization catalog. No page-theme control or physical-material claim.
2. Reuse the existing settings v2 lightingId field without changing serialization. Honor already saved safe IDs on load; unknown or hidden cool-side-light displays daylight without rewriting the loaded setting. An explicit allowed selection updates only lightingId through the normal settings-save warning path. This deliberate compatibility decision may surface a previously stored safe warm/work light value; no new default is introduced for missing settings.
3. Instantiate both existing renderers with the selected allowed light. For changes, call each renderer's existing setLighting; invalidate the app's memoized face inputs once and redraw only if either changed. Do not alter active needle/thread, guide, camera, history or canonical artwork; a lighting change is not a stitching transaction and does not restart animation.
4. Add pure Node tests for allowed IDs/fallback, both-face calls/no-op result, unchanged unrelated settings, persistence round-trip and localized strings. Run focused/full unit and typecheck only while main owns the browser pipeline. Existing renderer numeric/cache tests are reusable evidence, not a real screenshot gate.
5. Leave the prototype parked with exact commit and checks. Real desktop/tablet/phone Chinese/English comparison, warm wood/off-white fabric and thread-color judgment, active-motion switching, storage failure UI, keyboard/native select behavior, idle/rebuild counters and controlled 1k/larger-artwork browser profile remain required before any production proposal.

Source authority: <mention-page url="https://app.notion.com/p/3d2c426344ab81f087e0fbf75ca1640d">DESIGN · D04/D07</mention-page>, read during the preceding reuse inventory. The main integrator owns any later integration, review and publication.

## Implemented scope and verification

Added the collapsed, labeled native selector and six bilingual appearance strings. `studio-lighting.ts` restricts public options without modifying the underlying four-preset model; immutable setting selection changes only the existing lightingId field. Both faces receive their setter call without short-circuiting, and changed lighting clears app face-input memoization so the existing renderer can rebuild. Same-setting selection does not create another settings write or redraw. The existing storage-failure message now says “Studio settings” so it also accurately covers light preference persistence.

No edits to lighting profile coefficients, renderer geometry, canonical/ThreadRun modules, material models, settings schema or serializers. The helper only sees settings and two setLighting interfaces. Initialization honors saved allowed IDs; the hidden cool-side-light setting remains untouched on load but displays daylight until an allowed choice is explicitly selected. The control is not disabled by tutorial state because light is a view preference, not a new stitch/material operation.

Actual commands and results, Node-only:

```sh
./node_modules/.bin/vitest run src/studio-lighting.test.ts src/lighting.test.ts src/renderer.test.ts src/settings.test.ts src/i18n.test.ts
# 5 files, 25 tests PASS
./node_modules/.bin/tsc --noEmit
# PASS
./node_modules/.bin/vitest run --maxWorkers=1
# 30 files, 174 tests PASS
git diff --check
# PASS
```

Six new tests cover safe subset/fallback, both-face setter/no-op behavior, unrelated settings identity, v2 round-trip, no-write load of an excluded preference, normal save failure and bilingual text. Existing numeric renderer/cache tests passed. Vitest emitted Node localStorage-file warnings but no failures. Dependencies reused through an ignored local node_modules symlink; no dependency/lockfile changes. No build or browser process was started; no CPU benchmark ran alongside the main pipeline.

Still **PARK_FOR_LATER**. This worktree contains a working-code prototype, not a validated public UI or release candidate. Real screenshots at consistent artwork/view, native select/keyboard/touch behavior, locale switching in a real DOM, active motion/floating-needle visual coherence, storage-warning presentation, phone visual weight and browser rebuild/idle/performance measurements are unverified. Do not merge/publish solely from the Node checks, and do not let this follow-up delay the frozen primary release.
