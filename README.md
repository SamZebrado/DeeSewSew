# DeeSewSew

> A tiny embroidery studio in your browser.

DeeSewSew is a quiet browser-based digital embroidery toy. Node 3.1 keeps the needle—not an abstract line command—as the source of every path, while letting the user choose a hidden-side emergence point without flipping after every puncture. Thread is still stored only on the physical surface where the needle travelled.

## Current functionality

- Responsive high-DPI Canvas embroidery hoop with stable procedural fabric
- Button-controlled 3D hoop rotation with wood depth, changing viewing angles, and independently rendered physical front/reverse topology
- Persistent front/back needle state, ordered puncture events, and side-owned surface thread segments
- Continuous desktop needle following with a bounded soft-thread chain, mild slack, damping, and gravity
- Truthful hidden-side emergence targeting, so repeated stitches can be made from one view without fake visible needles or mirrored thread
- Short press, puncture, tightening, and settling transition that begins from the exact loose shape controlled before the click
- Press, drag-to-position, and release-to-puncture touch interaction with a finger-offset needle or hidden emergence target
- Deterministic inverse projection for front, reverse, and moderate angled stitching, with explicit limited and inspect-only states near the edge
- Running and Back modes retained as lightweight routing/appearance strategies over the same true puncture model
- Optional short five-stage press, puncture, tightening, settling, and release motion; live thread following remains available when motion is off
- Nine generic thread colors plus device-local custom colors from the native color picker
- Ordered 2.5D strands with contact shadow, edge, highlight, fiber detail, and deterministic buildup offsets
- Puncture-aware undo, redo, confirmed clear, and versioned local persistence with deterministic Node 1/2 migration
- Development-only renderer scenes at `?scene=single`, `crossing`, `buildup`, `parallel`, `mixed`, `comparison`, and a 1,000-strand `stress` scene
- Installable static PWA shell with generated full-asset precache and `/DeeSewSew/` GitHub Pages base path

Embroidery data stays in the browser's local storage and is not transmitted.

## Development

Requires a current Node.js release and npm.

```sh
npm install
npm run dev
```

The development URL includes the configured base path, normally `http://127.0.0.1:5173/DeeSewSew/`.

## Checks

```sh
npm test
npm run test:e2e
npm run test:offline
npm run evidence:check
npm run typecheck
npm run build
npm run preview
```

`npm run build` creates the static production output in `dist/`.

## Interaction

When the needle is on the visible surface, move the pointer and the metal needle pulls a small soft chain of thread with visible slack. Click to press, puncture, and tighten that exact loose shape into the settled surface segment. When the needle is behind the visible fabric, the interface shows a dotted emergence target instead of a fake needle: move and click to create the real hidden-side travel and bring the same needle back through at that location. Flipping remains optional and reveals the same pending needle/thread state. On touch, press and drag the offset needle or emergence target, then release to puncture. Use `Cmd/Ctrl+Z` to undo and `Cmd/Ctrl+Shift+Z` to redo.

Use **Auto rotate** to start a slow front-to-edge-to-reverse inspection. Puncture is paused while rotating. **Stop rotation** freezes the exact current angle and immediately restores targeting whenever projection is reliable; **Return front** and **Snap back** are optional inspection conveniences. Moderate front and reverse angles are editable, more oblique stable angles are limited, and near-edge angles explicitly become inspect-only. Rotation never changes needle side, pending loose-thread geometry, puncture continuity, or topology. **Stitch motion** controls the short tightening flourish, not live pointer following. Canonical topology and preferences are saved locally; transient spring points are never serialized.

## GitHub Pages

The Vite base, web manifest, icons, service-worker scope, and cache root are configured for `https://samzebrado.github.io/DeeSewSew/`. The Pages workflow runs tests and a production build before deployment. Publication is intentionally gated on explicit approval from the designated external reviewer; the workflow has not been treated as publication authorization by itself.

## Current limitations

- Node 3.1 models correct front/back surface topology and a transient active soft thread, not arbitrary depth routing, knots, thread splitting, or volumetric tube meshes.
- Running and Back are intentionally minimal routing/appearance strategies; they do not automate a full traditional stitch sequence.
- Migrated Node 1/2 pieces preserve their historical front appearance. Because those saves did not record physical reverse routing, migration does not fabricate a backside.
- Canvas embroidery itself does not yet have full keyboard-placement parity.
- Needle size, force/pressure/tilt controls, lighting/material selectors, gyroscope, arbitrary layer insertion, export, sharing, patterns, uploads, AI features, accounts, and cloud sync are intentionally out of scope.
- Browser touch emulation is evidence of browser behavior, not a claim of physical-device testing.

## Browser support

The studio requires Canvas 2D, CSS 3D transforms, Pointer Events, local storage, and service workers for offline installation. Node 3.1 release QA targets current desktop Chrome plus real Chrome mouse/touch event paths at desktop, tablet, and phone viewports; physical phone, tablet, or stylus behavior is not claimed.

## Dependencies and licenses

Runtime code uses browser APIs and has no third-party runtime dependency. Development uses [Vite](https://vite.dev/) (MIT), [TypeScript](https://www.typescriptlang.org/) (Apache-2.0), and [Vitest](https://vitest.dev/) (MIT). Project-owned procedural graphics and icons contain no downloaded texture, stock art, web font, CDN asset, or third-party icon pack.

## License

Apache License 2.0. See [LICENSE](LICENSE).
