# Restrained lighting integration plan

Base:077cb6f52b7e4a1412e2a4f9bdf0cf68584badca, independently approved parser package; its deployment closure remains separate.

1. Reuse existing three-preset lighting implementation and tests, with one collapsed Appearance selector. No theme system, material/topology/schema changes, or extra presets.
2. Preserve standardized soft-daylight PNG exports. Explicit bilingual helper copy must explain that screen lighting is local and PNG uses daylight; no new export setting or silent claim of matching selected screen lighting.
3. Preserve saved-preference failure warning, invalid preset fallback, same-choice no-op and both-face cache invalidation. Switching is explicit only; no ongoing lighting animation.
4. Verify combined PNG/light UI at desktop/tablet/phone in both languages, all three lighting choices and both faces. Prove PNG hashes remain identical across presets, canonical JSON unchanged, and failure warning readable on a narrow phone.
5. Run exact integrated type/unit/build/browser/production/offline gates. Reuse the explicitly attributed isolated1000segment profile:21.7–29.3ms selection handler, zero idle/repeated-choice rebuild; not60Hz/mobile evidence.
6. Obtain separate exact-SHA High review after parser publication closes. Only approved normalFFpush and completeCI/publicsmoke can close publication. Keep audio/Petting/3D isolated.
