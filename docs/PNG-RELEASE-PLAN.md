# Clean PNG export release plan

Published base: f6a89330dee73786ee1b1484ab99a350a07f55d1. Reuse existing integrated2054b4f without repeating the completed port. Preserve original experimental branches and historical evidence. This package includes PNG only; parser optimization, audio, lighting and Petting remain separate.

## Scope and implementation sequence

1. Inspect the existing canonical renderer adapter and download controller. Keep front/back/pair output at1024px per face, default renderer lighting and quiet neutral corners outside the wooden hoop. Back is mirrored by the same renderer exactly once. No screenshots of toolbars, transient needle/slack/guide or cloud sharing.
2. Retain synchronous rendering before asynchronous encoding, one pending export, deterministic cleanup on failure and disabled controls while busy. Existing canonical arrays are read only. No topology/storage/schema/physics changes.
3. Add bilingual README instructions distinguishing editable JSON backup from flattened PNG. Keep existing compact localized buttons; no new design system or theme controls.
4. Complete missing browser coverage: actual file import→reload→PNG, delayed encoding with intervening edit, encoding failure→retry and detached-canvas cleanup, accepted near-capacity export timing. Reuse existing synthetic fixtures and report measured timing without physical-device claims.
5. Freeze candidate after necessary tests are integrated. Run typecheck/unit/build, full browser, production and offline suites, responsive checks, original PNG pixel/anchor test and added edge cases. Inspect actual downloaded front/back/pair and bilingual desktop/tablet/phone images. Preserve failure logs; fix root causes rather than weaken assertions.
6. Package exact source/diff/logs/images/performance limits for sole main-owned High review. No speculative branches included. New exact-SHA approval required before normal fast-forward publication, complete Pages workflow and public actual PNG download/import/offline smoke.

## Acceptance and limits

Independent pre-release audit found that a DPR cap does not enforce exact PNG dimensions when desktop devicePixelRatio is below1. Before candidate freeze, add an explicit1:1 offscreen ratio option and real browser .8/2 DPR tests for all3choices. Default live-renderer DPR behavior and all geometry remain unchanged. This supersedes the parked integration note's fail-closed DPR limitation.

PNG contains committed stitches and canonical anchor marks only, stays unchanged by later edits during encoding, and does not mutate saved artwork or active interaction. Pair is front-left/back-right with pixel parity to individual images. Errors release busy state and temporary resources so retry works. Browser downloads are dispatched, not falsely claimed saved on every OS. Images cannot restore editable topology; users keep JSON backups. No native mobile/device, OS-share or selected experimental lighting support is claimed.
