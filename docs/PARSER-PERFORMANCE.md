# Bounded v4 fragment optimization prototype

Base: `6b33604`, isolated branch `parallel/v4-parser-performance-20260908`.
Not integrated into the frozen primary candidate. No browser, Bridge or publication.

## Design before implementation

The measured many-run overhead comes from running the full legacy file-import
pipeline for every tiny physical run: normalization, compatibility serialization,
and another compatibility serialization for a synthetic next puncture.

Retain the public legacy file-import boundary unchanged. Add an internal helper
which reuses the exact same `parseV3` canonical validator. Optimize only fragments
with at most 64 punctures and no legacy stitches. Every larger or legacy-bearing
fragment falls back to the original file parser, preserving its rejection limits.
This intentionally does not optimize the 1000-segment single-run case.

## Why the skipped checks cannot reject small canonical fragments

The original file boundary adds compatibility-output budget and one-next-operation
serialization checks. After unchanged parseV3 succeeds, small fragments have
at most 64 punctures, 63 segments, 63 compatibility stitches. One continuation
has at most 65 + 64 + 64 records. Normalized records contain bounded generated
IDs, finite numeric coordinates, fixed enums, seven-character colors and bounded
seed/order/width; even a deliberately loose 4096-character-per-record bound
puts these well below 800000 characters, versus the 2000000 limit minus 4096
headroom. No unknown fields survive canonical normalization. The helper retains
the original raw size guard and strict nextOrder < MAX_ORDER requirement.

The v4 wrapper still performs its aggregate normalized budget/headroom check
once. Full canonical topology checks, v4 run ownership, anchors, ID/order,
normalization, strict rejection and public v1/v3 behavior are not removed.
Conservative fallback avoids broadening accepted large-file limits accidentally.

## Measured before/after

Apple M1, Node v25.2.1, Vite SSR with ws:false, hmr:false, watch:null,
middlewareMode:true. Two warmups, seven samples per operation, median/max ms.
No browser/RAF/localStorage I/O measurement; shared-host timing can vary.

| Fixture / operation | Before median / max | After median / max |
|---|---:|---:|
| 1000 segments, one run, import |17.328 / 19.507|18.683 / 20.626|
| 1000 segments, one run, export |18.489 / 26.486|20.100 / 21.984|
| 1000 segments, 1000 runs, import |65.914 / 92.857|22.299 / 28.028|
| 1000 segments, 1000 runs, export |52.178 / 57.175|31.224 / 36.239|

Single-run payload 426343 characters; many-run payload 1053976, unchanged.
No single-run improvement claimed. Many-run import improved in this bounded
probe; browser responsiveness must be separately measured before integration.

Reproduction: createServer with the settings above, ssrLoadModule thread-runs.ts
and thread-run-storage.ts. Single run: 1001 punctureThreadRun calls with
x=i%2?.6:.4, y=.4+(i%5)*.02. Many run: 1000 iterations of startThreadAt with
alternating front/back at (.4,.4), puncture (.6,.6), endThreadRun. Style is
running/#9b4a48. Serialize fixture once; time parseThreadArtwork(raw) and
serializeThreadArtwork(state) separately, two warmups/seven repetitions; sort
times and report index3 and last. Always close server in finally.

## Validation

`npm run typecheck` PASS. `npm test`: 171 tests / 30 files PASS, including three
new differential tests. Cases cover count threshold 64/65 and large fallback,
canonical normalization, invalid IDs/order/side/position/width/seed/type/needle,
legacy fallback, unknown fields, order boundary and raw size rejection.
No production browser suite run by this worker. All owned SSR servers closed.

Dependency setup reused main's installed node_modules through an ignored symlink;
no dependency/version/lockfile changes. Review this helper and future normalized
record growth before changing its threshold. This is a bounded prototype, not
permission to skip exact-candidate review or publication gates.
