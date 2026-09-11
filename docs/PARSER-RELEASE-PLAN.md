# Bounded parser integration plan

Base: cf067376c52e7329c2473a32329598cddb782a36 (approved PNG package; its deployment closure remains separate).

1. Reuse the isolated, measured small-fragment optimization and existing differential tests. Do not alter PNG, topology, file schema, rendering, or public legacy import rules.
2. Preserve the same parseV3 canonical validator, aggregate budget/headroom, ownership/ID/order checks, and large/legacy-fragment fallback. Independently inspect the bounded-record argument; reject any weakened validation.
3. Integrate only the product helper, its call sites and regression tests. Keep internal branch inventory/audit documents out of public source.
4. Run exact-candidate typecheck/unit/build, full browser/production/offline regression, and verify PNG download compatibility. Reuse unchanged isolated 97-case parity evidence with explicit provenance; add tests only for genuine integration gaps.
5. Retain measured tradeoff: browser many-run parse 27→11.3ms and serialize27.1→13.1ms; single long-run parse10.2→10.9ms and serialize10.7→11.8ms. These are one-host function timings, not a general speedup, device or frame-rate claim.
6. Obtain separate exact-SHA High review only after PNG publication closes and integrated evidence is ready. Publish normal fast-forward only upon exact approval, then complete CI and public import/export/reload/offline/PNG checks.

No audio, lighting, Petting, 3D, dependency upgrades, or unrelated refactoring in this package.
