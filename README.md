# DeeSewSew

> A tiny embroidery studio in your browser.

DeeSewSew is a quiet browser-based digital embroidery toy. Node 3 makes the needle—not an abstract line command—the source of every new thread path. Punctures alternate the physical needle between the front and reverse surfaces, and thread is stored only on the surface where the needle travelled.

## Current functionality

- Responsive high-DPI Canvas embroidery hoop with stable procedural fabric
- Button-controlled 3D hoop rotation with wood depth, changing viewing angles, and independently rendered physical front/reverse topology
- Persistent front/back needle state, ordered puncture events, and side-owned surface thread segments
- Needle follower, surface-travel preview, and click-to-puncture desktop interaction using Pointer Events
- Press, drag-to-position, and release-to-puncture touch interaction with a finger-offset target
- Deterministic inverse projection for front, reverse, and moderate angled stitching, with explicit limited and inspect-only states near the edge
- Running and Back modes retained as lightweight routing/appearance strategies over the same true puncture model
- Optional five-stage puncture, thread-pull, pressure, and settling motion for every new puncture
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

Move the pointer over the surface currently holding the needle. The visible metal needle follows the pointer and previews thread travel from the last puncture. Click to puncture: the needle passes through the fabric and is then physically on the opposite side. Rotate to that side, move the same needle, and puncture again; the completed segment belongs only to the surface where the needle travelled. On touch, press to reveal the offset needle target, drag to position it, and release to puncture. Use `Cmd/Ctrl+Z` to undo and `Cmd/Ctrl+Shift+Z` to redo.

Use **Auto rotate** to start a slow front-to-edge-to-reverse inspection. Puncture is paused while rotating. **Stop rotation** freezes the exact current angle and immediately restores needle interaction whenever projection is reliable; **Return front** and **Snap back** are conveniences, not unlock requirements. Moderate front and reverse angles are editable, more oblique stable angles are limited, and near-edge angles explicitly become inspect-only. Rotation never changes needle side, puncture continuity, or topology. **Stitch motion** can be turned off independently. Custom colors, topology, needle continuity, and motion preference are saved only on the current device.

## GitHub Pages

The Vite base, web manifest, icons, service-worker scope, and cache root are configured for `https://samzebrado.github.io/DeeSewSew/`. The Pages workflow runs tests and a production build before deployment. Publication is intentionally gated on explicit approval from the designated external reviewer; the workflow has not been treated as publication authorization by itself.

## Current limitations

- Node 3 models correct front/back surface topology, not arbitrary depth routing, knots, thread splitting, or volumetric tube meshes.
- Running and Back are intentionally minimal routing/appearance strategies; they do not automate a full traditional stitch sequence.
- Migrated Node 1/2 pieces preserve their historical front appearance. Because those saves did not record physical reverse routing, migration does not fabricate a backside.
- Canvas embroidery itself does not yet have full keyboard-placement parity.
- Needle size, force/pressure/tilt controls, lighting/material selectors, gyroscope, arbitrary layer insertion, export, sharing, patterns, uploads, AI features, accounts, and cloud sync are intentionally out of scope.
- Browser touch emulation is evidence of browser behavior, not a claim of physical-device testing.

## Browser support

The studio requires Canvas 2D, CSS 3D transforms, Pointer Events, local storage, and service workers for offline installation. Node 3 release QA targets current desktop Chrome plus real Chrome mouse/touch event paths at desktop, tablet, and phone viewports; physical phone, tablet, or stylus behavior is not claimed.

## Dependencies and licenses

Runtime code uses browser APIs and has no third-party runtime dependency. Development uses [Vite](https://vite.dev/) (MIT), [TypeScript](https://www.typescriptlang.org/) (Apache-2.0), and [Vitest](https://vitest.dev/) (MIT). Project-owned procedural graphics and icons contain no downloaded texture, stock art, web font, CDN asset, or third-party icon pack.

## License

Apache License 2.0. See [LICENSE](LICENSE).
