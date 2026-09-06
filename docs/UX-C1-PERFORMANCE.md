# UX-C1 combined performance audit

Measured after the complete needle/passage, semantic tension, floating cursor, localization, file and guide implementation. Timings below are one local Chrome run, not hardware latency guarantees.

## Method

- `ux-completion-profile.spec.ts`: development-browser method wrappers around the real renderer; 1,000 canonical settled segments, active rope, passage/tension, Shift gesture, guide, 100 locale switches, 15 large file parses/serializations, idle and simulated visibility lifecycle.
- `recovery-performance.spec.ts`: separate Node pure-function samples and browser RAF scheduling. Production rerun is separately retained in review evidence; do not equate development method instrumentation with a production paint measurement.
- Post-GC CDP heap/DOM samples cover another 1,000 language toggles. This is workload-specific growth evidence, not universal leak absence.
- A 10,000-replacement cache exercise probes long edit history. No profiler hooks enter the production bundle.

## Observations and measured changes

Before optimization, 150 pointer frames caused 300 unnecessary dynamic compositions on the unchanged opposite face. Each face's settled cache rebuilt zero times, so cache rebuild was not the problem. Added bounded per-face input identity invalidation, including passage, tails and resize. The same workload now causes zero opposite-face compositions. Aggregate render calls in the first paired run fell from 1,030 to 526; single-call percentile variation is not a speedup ratio because the remaining calls are the more expensive dynamic ones.

The cache history exercise retained 9,999 historical string keys with only one current item. Historical keys are now capped at 1,024; after overflow, additions conservatively rebuild rather than retain arbitrary history. Unchanged animation frames retain their O(1) fast path. This trades occasional long-session commit-time rebuilding for bounded retained metadata without weakening redo safety.

No worker, GPU framework, new runtime dependency or speculative physics rewrite was justified.

## Final combined development-browser sample

| Measurement | p95 |
| --- | ---: |
| Renderer CPU / Canvas submission, per face | 0.20 ms |
| Passage/tension drawing, subset of renderer | 0.50 ms |
| Synchronous synthetic pointer handler (includes commit sample) | 0.20 ms |
| Locale toggle | 0.10 ms |
| Strict file parse, ~799k characters | 13.20 ms |
| File serialization | 3.40 ms |
| RAF interval | 16.80 ms |

These categories overlap: drawMotion is inside render; pointer may invoke render. They must not be summed. The slowest pointer sample was 15.30 ms and includes a topology commit/serialization; ordinary pointer movement does not serialize the piece. Fifteen file samples are a small characterization set, not a robust population percentile.

Separate Node p95: active solver 0.0078 ms, arc-length tension kernel 0.0219 ms (1,500 measured kernel samples). Neither number includes browser rendering or device latency.

After convergence, zero rendering calls occurred during the three-second idle observation and during the simulated hidden interval. Existing lifecycle regressions cover pause/resume and duplicate-loop prevention. This is not an hours-long physical-device battery test.

Post-GC JS heap across 0→1,000 additional locale toggles remained approximately 8.08–8.12 MB; DOM nodes ranged 233–245 and plateaued. The measurement does not establish memory behavior for every artwork/import/history sequence.

## Review focus and limits

Ask High to audit avoidable whole-piece scans, duplicate loops, cache invalidation, event allocations, serialization/storage placement, repeated geometry/layout work, bounded tails, retired-key fallback, localization bindings and resource lifecycle. Separate blockers, worthwhile pre-release changes and optional future optimization. Human responsiveness and physical input-to-photon remain unmeasured; browser touch is not physical tablet feel evidence.
