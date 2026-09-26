# Pressure opt-in release contract — 2026-09-27

## Scope and plan

Integrate only Pressure on published Touch `1a78fed651196a4f98874ea9ba1b53c806e82f6f`. Close focused input/browser gaps, freeze the source commit, run the complete product gate once, independently verify the exact source/packet, then request canonical High publication approval for that exact SHA. No publication before explicit approval. Audio, Petting, Bridge maintenance and new 3D work are excluded.

## Input semantics

[Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) defines pressure in [0,1], unsupported active pressure as 0.5, and pointerup pressure as 0. This implementation uses only pointer identity, pointerType, buttons and pressure. Tilt, twist, altitude and azimuth do not affect this milestone.

- A primary, owned pen stitching gesture with tip-contact buttons bit 1 may update strength. Barrel-only, eraser-only, non-owner, mouse and touch samples cannot update it.
- Missing/non-finite pressure and constant 0.5 are neutral. A valid contacted zero is a low-strength input, not pointerup. The last contacted value is captured before release resets the gesture.
- A non-default sample activates pressure for that gesture; there is no hardware-capability detection or calibration claim.
- The one mapping is transient loose-thread slack: `1 + (0.5 - clamp(pressure, 0, 1)) * 1.3`, bounded [0.35,1.65]. Canonical stitch geometry, topology and artwork schema do not change.
- Cancellation, blur, takeover, undo/reset and disabling opt-in discard pressure state. Existing scheduler, small active-thread node count and solver iteration bounds remain in force; no permanent pressure animation loop is added.
- One strictly normalized Boolean setting persists opt-in. Missing or invalid values are OFF. Both locales visibly label the feature experimental and physical stylus feel unvalidated.

## Evidence boundaries

Native browser/CDP-injected pen events exercise actual browser event dispatch and pointer capture, but remain **synthetic**, not Apple Pencil, Surface Pen or Wacom validation. Unit tests and older capture-stub smoke are narrower evidence and labeled separately. Physical stylus feel stays PENDING.

Require OFF/ON, zero/low/mid/high, missing/constant fallback, mouse/touch, ownership, cancel/blur/takeover/undo/redo/fresh tap, existing Shift/two-touch/Touch P0, strict settings and bounded work. Inspect screenshots for restrained visible effect. Bind final complete-gate results to the frozen commit; historical prototype counts are not release-gate results.
