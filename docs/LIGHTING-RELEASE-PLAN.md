# Restrained lighting integration plan

Base:077cb6f52b7e4a1412e2a4f9bdf0cf68584badca, independently approved parser package; its deployment closure remains separate.

1. Reuse existing three-preset lighting implementation and tests, with one collapsed Appearance selector. No theme system, material/topology/schema changes, or extra presets.
2. Preserve standardized soft-daylight PNG exports. Explicit bilingual helper copy must explain that screen lighting is local and PNG uses daylight; no new export setting or silent claim of matching selected screen lighting.
3. Preserve saved-preference failure warning, invalid preset fallback, same-choice no-op and both-face cache invalidation. Switching is explicit only; no ongoing lighting animation.
4. Verify combined PNG/light UI at desktop/tablet/phone in both languages, all three lighting choices and both faces. Prove PNG hashes remain identical across presets, canonical JSON unchanged, and failure warning readable on a narrow phone.
5. Run exact integrated type/unit/build/browser/production/offline gates. Reuse the explicitly attributed isolated1000segment profile:21.7–29.3ms selection handler, zero idle/repeated-choice rebuild; not60Hz/mobile evidence.
6. Obtain separate exact-SHA High review after parser publication closes. Only approved normalFFpush and completeCI/publicsmoke can close publication. Keep audio/Petting/3D isolated.

Bounded integration finding: the320px quota-failure test reproduced the settings
warning extending to322.89px. The shared saveSettings path appends a third flex
item to the masthead, which did not wrap. Approved narrow repair: only a nonempty
settings warning on small screens enables masthead wrapping and gets its own row.
Ordinary no-warning masthead layout is unchanged. Retain exact viewport assertion
and rerun both languages; no typography/theme/renderer changes.

## Integration verification

Explicit English/Chinese helper and README now state PNG always uses soft daylight.
Existing lighting-focused tests/config were ported; no experimental product or
historical private audit document was copied. Warning terminology remains the
meaningful broader "Studio settings" message; no stale old-copy assertions found.

Typecheck PASS;196 unit tests across33 files PASS; build PASS. Final assets:
`index-BsGmm_Lp.css`, `index-N1IFVmSU.js`; service-worker cache
`deesewsew-e40d8fd03025`. Focused integrated browser8/8 PASS in16.1 s after preserving
and repairing the failing320px overflow assertion. Owned server/browser closed,
process filter clear. This is not the complete release suite or High approval.

Evidence: ignored `review/lighting-integrated-final-20260912/browser/`, including
nine actual downloaded PNGs, both-face desktop/tablet/phone zh/en screenshots,
320px warning screenshots, preset/motion/counter evidence and1000segment profile.
Warning screenshots inspected: message wraps within320px in both languages; the
long English masthead stacks under this failure condition, not on normal pages.
Selected combined UI and paired PNG inspected: readable policy/control, correct
front/back anchors, neutral standardized export. No new physical-device claims.

All three screen presets yield identical SHA256 for each export, canonical raw
JSON unchanged:

- FRONT: `286d66a4de17f324e23ca9573869e017c00393533aa549d30847cfd85dd1741a`
- BACK: `eb7c07d038ad9bcc316d1313ca5ba880ca0c0f9886479fceae06ef3e15e79444`
- PAIR: `35baac4fc3106180456939fd50752f963d9cf20e894b6d45b416177bb1cd216a`

Ready for main's exact-candidate complete browser/production/offline and review
gates. No renderer, PNG backend, schema or canonical geometry change in this
integration follow-up; only explicit copy, targeted warning CSS and tests/docs.
