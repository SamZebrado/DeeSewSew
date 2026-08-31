# DeeSewSew

> A tiny embroidery studio in your browser.

DeeSewSew is a quiet browser-based digital embroidery toy. Node 2 adds lightweight hoop inspection, stitch motion, and device-local custom colors while keeping structured thread pleasant and legible on blank procedural fabric.

## Current functionality

- Responsive high-DPI Canvas embroidery hoop with stable procedural fabric
- Button-controlled 3D hoop rotation with wood depth, changing viewing angles, and a separately rendered reverse side
- Anchor, preview, and commit interaction using Pointer Events
- Tablet-oriented finger-offset targeting plus mouse and stylus support
- Running Stitch with visible underside gaps and continuous Back Stitch
- Optional needle-out, thread-pull, and needle-in motion for every new stitch
- Nine generic thread colors plus device-local custom colors from the native color picker
- Ordered 2.5D strands with contact shadow, edge, highlight, fiber detail, and deterministic buildup offsets
- Undo, redo, confirmed clear, and versioned local persistence
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

Click or tap inside the usable fabric to place an anchor. Move the pointer to preview a strand, then click or tap again to commit. Each endpoint becomes the next anchor for quick repeated placement. Touch targeting is offset above the finger. Press `Escape` or right-click to cancel a pending line. Use `Cmd/Ctrl+Z` to undo and `Cmd/Ctrl+Shift+Z` to redo.

Use **Auto rotate** to start a slow front-to-edge-to-reverse inspection. **Stop rotation** freezes the hoop at its current angle; **Return front** restores the canonical editable view. Stitch placement stays disabled at unsupported angled and reverse views. **Stitch motion** can be turned off independently. Custom thread colors and the motion preference are saved only on the current device.

## GitHub Pages

The Vite base, web manifest, icons, service-worker scope, and cache root are configured for `https://samzebrado.github.io/DeeSewSew/`. The Pages workflow runs tests and a production build before deployment. Publication is intentionally gated on explicit approval from the designated external reviewer; the workflow has not been treated as publication authorization by itself.

## Current limitations

- Node 2 has only Running Stitch and Back Stitch.
- The reverse view is a visually faithful reconstruction from stored needle endpoints and visible stitch segments; the current schema does not claim physically exact underside routing between separate stitches.
- Canvas embroidery itself does not yet have full keyboard-placement parity.
- Advanced physical simulation, export, sharing, patterns, image upload, AI features, accounts, and cloud sync are intentionally out of scope.
- Browser touch emulation is evidence of browser behavior, not a claim of physical-device testing.

## Browser support

The studio requires Canvas 2D, Pointer Events, local storage, and service workers for offline installation. Node 2 release QA targets current desktop Chrome plus Chrome mouse and touch emulation; physical phone, tablet, or stylus behavior is not claimed.

## Dependencies and licenses

Runtime code uses browser APIs and has no third-party runtime dependency. Development uses [Vite](https://vite.dev/) (MIT), [TypeScript](https://www.typescriptlang.org/) (Apache-2.0), and [Vitest](https://vitest.dev/) (MIT). Project-owned procedural graphics and icons contain no downloaded texture, stock art, web font, CDN asset, or third-party icon pack.

## License

Apache License 2.0. See [LICENSE](LICENSE).
