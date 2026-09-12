# 3D Lab localized UX — ready for integration review, not publication

Implementation plan committed first: a455ca1. Runtime and test candidate:
`84fa39ff40489664721758ddb0e9d110f1494906`, clean at browser launch. This result
document is a documentation-only follow-up; it changes no runtime or build bytes.
Main owns reconciliation onto published Pattern d4749fd, full release gates,
exact-SHA High and publication. No independent Bridge/push was performed.

## Changes

- Shared existing en/zh preference and translation mechanism; localized page title,
  labels, instructions, errors, status and manual-save limitations. One quiet
  optional ordinary main-page Lab link, back link, no Lab runtime import in main.
- Stable pressed Thread tool, explicit mode/count/support summary; summary refreshes
  undo/redo. Feedback is separate live status, not re-announced during animation.
- Focused-canvas arrows orbit, +/- zoom, Home resets camera, Enter places the
  genuine ray-picked center anchor, Escape cancels. Modifiers/other controls and
  repeat Enter are ignored. Reticle is display-only and appears only when valid.
- Keyboard camera changes cancel pending pointer clicks. Canonical edit/import
  ownership, v4 storage isolation, transforms, model and artistic response unchanged.
- Native file input remains keyboard accessible with localized visible trigger;
  friendly storage-full, absent-save, wrong-format and oversized-file feedback.

## Verified evidence boundaries

- Build/typecheck PASS; 205 unit tests / 35 files PASS on runtime-identical sources
  before final test-only provenance addition. Nine focused lab/input units pass.
- Eight focused production Chrome tests PASS (15.6s) at exact clean 84fa39f.
  Includes keyboard anchors/history/reticle/held-pointer cancellation, delayed
  import success and error ownership, en/zh at 1280 and 768 same artwork, localized
  storage/import failures, actual two-puncture production v4 navigation isolation,
  shared locale, manual lab save/reload and offline Lab→main navigation.
- Fresh source/build/browser identity:
  `review/lab3d-ux/84fa39f/browser/ux-delayed-import-success--e5934-ite-newer-edits-or-feedback/runtime-provenance.json`.
  Browser 152.0.7977.83; recorded UTC 2026-09-12T05:31:24.644Z. JSON includes exact
  HEAD, clean status, SHA256 of runtime sources and every generated JS/CSS asset.
- Latest explicit video/PNG hashes and file list:
  `review/lab3d-ux/84fa39f/evidence-manifest.json`; eight continuous recordings and
  eight same-artwork screenshots. Earlier 6bbb241 seven-test evidence preserved,
  not mislabeled as current. Tablet Chinese installed and desktop English removed
  screenshots inspected: readable localized controls, restrained hierarchy, no
  overflow. This does not assert full mobile or nonvisual 3D parity.
- Frozen pre-UX c982503 full inherited 2D gate: 92 browser (4.2m), 65 production
  (3.2m), two offline (3.2s), all PASS, outputs `review/lab3d-final-gates` kept
  separately. These do NOT substitute for final integrated release regressions.
- No new CPU profile for UX: camera/geometry complexity unchanged but reticle/UI
  work added; prior c982503 profile remains historical one-host CPU evidence,
  not self-contained current-SHA proof or GPU/mobile/power evidence.
- Owned focused browser and 4194 preview exited; no Playwright MCP launched,
  user browsers untouched. No source changes during final focused test run.

## Remaining main-owned gates

Integrate without replacing Pattern changes; independent code/visual assessment;
full appropriate regression/build/offline at final release SHA; decide whether
focused reticle overlay materially warrants a fresh isolated profile; source-bound
High architecture/implementation/visual review. Experimental model remains surface
contact, not needle-through sphere topology, knots or physically exact silk.
