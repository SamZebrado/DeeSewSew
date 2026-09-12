# Bounded 3D Lab public UX plan

Plan only, 2026-09-12. Reviewed c982503b5df0c495aef4b31fc90906a86fdbb68f. This ignored document changes no frozen source. Main must authorize implementation after current gates finish. Public release remains exact-SHA High gated. No new topology, schema, physics, or renderer replacement.

## Files and order

1. `src/lab3d.ts`, `src/i18n.ts`, `lab3d.html`: localized static/dynamic UI, mode/status semantics and manual-save explanation. Reuse existing exported `locale`, `t`, `setText`, `localize`, `switchLocale`; existing `initialLocale` already safely reads `deesewsew-locale-v1`, accepts only en/zh, falls back by navigator language, and tolerates blocked storage. Do not create another locale preference or read normal artwork/settings. Lab locale toggle calls existing switchLocale, then refreshes dynamic lab labels/status. Ensure document lang/title update; retain user mode, camera, canonical state and pending-import ownership. Append only needed message IDs to shared dictionary, no main copy replacement.
2. `src/lab3d.ts`, `src/lab3d.css`: small semantic toolbar groups (view/support; undo/redo; files). Stable Thread tool toggle with aria-pressed and explicit current-mode text rather than a label naming the opposite mode. Canvas aria-describedby points to localized mouse/keyboard instructions and limitations. Use native buttons, visible focus-visible outline, quiet existing mineral colors. No style reset or new design system.
3. `src/lab3d.ts`, optionally a small `src/lab3d-input.ts` plus tests if needed: keyboard center targeting and camera handlers below. No new model representation.
4. `src/main.ts`, `src/i18n.ts`, narrowly `src/style.css`: one quiet ordinary anchor labeled `3D Lab — Experimental` after existing low-priority tools/quiet-tip, outside Artwork action rows. Link to `${import.meta.env.BASE_URL}lab3d.html`; no runtime Lab import or automatic navigation. Lab includes `Back to embroidery` link to BASE_URL. Browser navigation must preserve manual-save boundaries, not silently write artwork. Before implementation reconcile with newest Pattern Library main rather than overwriting that package.
5. Add `tests/e2e/ux-completion-lab3d.spec.ts` or extend the existing isolated Lab harness, keeping normal test discovery explicit. Update existing `scripts/lab3d-evidence.mjs` only as needed for new stable labels. Record results in `docs/3D-LAB-PHASE1-RESULT.md` after tests, preserving historical results.

## Keyboard and reticle contract

- Handlers operate only when canvas itself is focused; do not intercept file inputs, buttons, browser shortcuts or modified keys. Ignore Ctrl/Meta/Alt combinations. Prevent default only for handled canvas commands.
- Arrow keys orbit in bounded fixed increments; +/- zoom using existing distance clamp; Home resets only camera to documented initial pose. Each camera command cancels pending pointer click, never calls commit, and draws once. No key-driven RAF or continuous loop.
- Show a small center reticle only with focused canvas, Thread mode and installed support. Render it last as transient overlay; it never enters anchors/save/export state. Localized instruction: rotate sphere to choose the center target, Enter places an anchor.
- Enter (ignore event.repeat) in that state uses the exact existing `pick(0,0,camera-with-support-target)` and world-to-local conversion, then existing anchor validation/commit. One accepted keypress = one anchor; duplicate, antipodal and 32-anchor rules stay unchanged. Enter in Camera mode or removed-support state never commits and gives a clear message. Camera/reticle coordinates never become canonical screen-space data.
- Escape cancels held pointer interaction; blur, hidden, tool switch, load/import/undo/redo retain current cancellation. Keyboard canonical edits invalidate pending imports through existing commit. Keyboard camera changes cancel pointer intent but need not invalidate imports because camera is transient.
- Avoid claiming full nonvisual 3D authoring parity. Provide accessible mode, count, support state and keyboard operation; clearly label a desktop-first visual experimental study.

## Status, save and error semantics

- Separate persistent state summary (mode, N/32 anchors, installed/removed) from short aria-live action feedback; undo/redo must update summary. Do not reannounce during every draw/animation frame.
- Explain: manual save; one separate experimental local slot; ordinary artwork unchanged; export is a portable backup. Show initial empty state and supported limits. Do not add autosave or gallery.
- Wrap load/read/parse/storage operations separately so friendly errors can identify operation without exposing raw exception strings. Map QuotaExceededError to storage full/export suggestion, SecurityError or unavailable storage to local save unavailable/export suggestion, missing save to no lab save yet, malformed/wrong-format import to supported experimental file required, size limit to 16 KB limit, and model edit validation to distinct/non-antipodal point/32 anchors/reinstall support. Unknown errors use a localized operation-specific fallback. Preserve original errors only in development diagnostics if necessary, not user-visible text.
- Keep parse-before-commit and import token checks. Stale success AND stale error must remain silent; failed current read/parse/save cannot change current artwork/history. No required new canonical error fields.

## Acceptance before candidate freeze

- Unit tests for any extracted input helper: ignored controls/modifiers/repeats; bounded camera; no topology change on camera/escape; center pick uses support transform; invalid edit remains unchanged. Do not weaken existing model/import ownership tests.
- Real desktop browser keyboard-only sequence: focus canvas, switch mode with native controls, orbit/zoom, Enter several valid points, remove/reinstall, undo/redo; assert canonical snapshots and no accidental edits while pointer held + keyboard camera action. Reticle visibility checked in valid/invalid states. No mobile parity claim.
- EN and ZH screenshots at consistent 1280 and 768 widths with same installed and removed artwork; inspect toolbar hierarchy, focus visibility, complete translations and no overflow. Optional narrow-screen smoke only to prevent worse navigation, not mobile Lab feature parity.
- Check blocked storage, absent save, malformed/wrong-format/oversized import; meaningful localized errors and exact canonical preservation. Controlled stale import success/error must remain ignored after newer import/edit/undo/redo.
- Main to Lab to main navigation with a real saved v4 artwork: byte-identical normal storage; Lab separate save/reload works; locale preference shared. Main entry does not import Lab runtime. Existing offline multipage tests remain passing.
- Re-run build/type/unit and appropriate full normal-product regression at newly constructed exact SHA. Refresh real continuous video showing keyboard/mouse, removal/reinstallation and data persistence. Compare measured bounded performance only if new draw work materially changes it; never infer mobile/GPU/power.
- Main independently assesses visuals and submits one coherent exact-SHA High packet. This plan is not publication approval.
