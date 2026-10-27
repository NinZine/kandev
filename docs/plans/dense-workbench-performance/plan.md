---
created: 2026-10-22
status: in_progress
requirements:
  - REQ-UI-TRANSCRIPT-AUTO-SCROLL-001
  - REQ-UI-CHAT-MOTION-001
  - REQ-PLATFORM-POSTGRES-DOMAIN-STORE-PARITY-007
  - REQ-PLUGINS-PROMPT-HISTORY-HOST-006
  - REQ-PLATFORM-SESSION-SUBSCRIPTION-RECOVERY-001
  - REQ-PLATFORM-VIEWPORT-SESSION-DELIVERY-001
  - REQ-UI-SESSION-REFRESH-EFFICIENCY-003
  - REQ-UI-SESSION-REFRESH-EFFICIENCY-004
  - REQ-UI-PERSISTENT-STATUS-MOTION-004
  - REQ-UI-PERSISTENT-STATUS-MOTION-006
  - REQ-PLATFORM-WEB-ASSET-DELIVERY-001
system_design:
  - ../../specs/ui/system-design/transcript-auto-scroll.md
  - ../../specs/ui/system-design/chat-motion.md
  - ../../specs/platform/system-design/postgres-domain-store-parity.md
  - ../../specs/plugins/system-design/conversation-source-reconciliation.md
  - ../../specs/platform/system-design/session-subscription-recovery.md
  - ../../specs/platform/system-design/viewport-bounded-session-delivery.md
  - ../../specs/ui/system-design/session-refresh-efficiency.md
  - ../../specs/ui/system-design/persistent-status-motion.md
  - ../../specs/platform/system-design/web-asset-delivery.md
legacy_specs: []
---

# Implementation plan: Dense workbench performance

## Firefox checkpoint

Firefox is confirmed. Local reproduction and two balanced pairs accept no new
optimization. The one-class SVG hint is removed and exact `b7c3` source/assets
are restored. The delayed idle stalls coincide with recovery activity in the
aged fixture. Next: attribute that burst and cover End reaching an input-time
edge after content grows. The 20% streaming target and final matrix remain open.
See [the complete Firefox evidence](evidence/firefox-local-density-and-capture-controls.json).

## Forced layout attribution and task-busy limits

The first diagnostic adds stack and invalidation detail. Both ten-second dense
captures fill their buffers, fail the data-loss guard and remain preserved.
They do not qualify for cost or speed conclusions. A second probe keeps native
layout call stacks and observes three seconds within each ten-second stream.
Positive and negative calibration pass. Both cases pass without data loss and
verify 600 ordered updates after the observation windows. Exact source, assets,
helpers, fixture, attachments, logs and cleanup are audited.

With no selection, the `selection.rangeCount` check triggers 76 observed style
records and 72 layout records. The saved-scroll read triggers 36 style and 31
layout records. With a focused composer, the selection check disappears from
forced layout call sites, and all 47 layout records have no JavaScript stack.
This shift does not prove that removing a getter removes the underlying work.
The source maps match all 1,253 runtime assets exactly. Two maps and five source
contents used for call-site lookup are verified. No new production change follows.

A separate audit uses all twelve normal-streaming windows in the existing
rejected shared-scroll comparison. Renderer task duration occupies 98.06% to
98.68% of elapsed time. This fixed-window cap can hide smaller work reductions
while the renderer stays busy. It does not establish that a rejected candidate
is faster or replace the independent latency and correctness controls. The
recorded comparison uses `9e20` and `59e1`, not the current `b7c3` build.

No native input policy, app source or benchmark deadline changes are retained.
The temporary probes are removed. The 20% streaming target and original-baseline
final matrix remain open. The user later identifies Firefox. Local reproduction and its limits are
recorded above. See
[the complete evidence](evidence/forced-layout-callsite-attribution.json).

## Plan editor marks: correctness fix, no speed acceptance

Both plan renderers register Link and Underline through StarterKit and again
explicitly. Red tests reproduce both duplicate registrations and a real side
effect: the default Link handler opens a new tab in the editable plan despite
the explicit `openOnClick: false`. Disable these two StarterKit marks and retain
the explicitly configured marks. Link/underline Markdown round trips remain
covered. This changes no markup, class, style, animation or user-facing copy.
All four CSS files and their three gzip siblings remain byte-identical.

All 66 editor tests, lint, types, production build, 17 desktop and three phone
plan checks pass. Six balanced 1x pairs on the frozen 1,000-task fixture also
pass: 576 replacements, 576 insert dispatches and twelve native insert controls.
The plans contain 20 and 400 steps (3,724 and 75,988 input bytes). Editor plugins
fall from 104 to 98, Link plugins from six to three, and candidate duplicate
warnings disappear. These counts do not establish a latency improvement.

Timing is mixed. Dense insertion has a 1.10% median paired reduction, with
three faster and three slower pairs. Dense replacement has a 2.36% median
paired increase, with four slower pairs. Short-plan synchronous median results
also worsen in their median paired comparison. Retain the independent
correctness fix, with no performance credit. All sixteen rows, operation
observations, startup bounds and attempts remain preserved. These browser
engine timings do not measure streaming, construction time, INP or M2 behavior.

The 20% streaming target and original-baseline final matrix remain open.
Next: inspect forced layout and invalidation evidence in the preserved normal
production trace before choosing another optimization. See
[the complete evidence](evidence/plan-editor-extension-registration.json).

## Animation visibility attribution

The normal-build probe verifies 300 ordered updates and calibrates visible,
offscreen and clipped targets. Both snapshots show 60 running animations on
intersecting owners and 60 already paused on hidden owners. No native animate
calls occur in the observed idle or streaming windows. Existing visibility
gates need no new change within this scope. No speed or M2 Air claim follows.

The frontend diagnostic bundle records eight duplicate Link/Underline warnings
and one ResizeObserver loop error for the current task. Raw logs remain private.
Next: inspect plan-editor initialization and establish its cost. The 20% target
and final matrix remain open. See
[the complete attribution](evidence/animation-owner-visibility-attribution.json).

## Shared scroll capture: rejected after confirmation

The identical tested candidate completes six alternating native-v2 pairs. All
twelve attempts pass and verify 21,600 ordered updates. The complete source,
asset, helper, fixture and artifact audit passes. All seventy rows are preserved.

Streaming task-time rate is effectively flat (median paired reduction 0.011%).
The preliminary p95 signal is not confirmed: two pairs worsen about 12.4%, one
improves 11.13%, and three stay within 0.1 ms. Idle work and cold readiness are
mixed. Reject the candidate and restore all five app/test files and verified
`9e20f26b` assets. No regression cause is established.

The preliminary result and calibrated React/source-map attribution remain
separate. All 307 units, lint, types, build, 35 desktop and 17 phone checks pass
within their stated scope. The 20% streaming target and original-baseline final
matrix remain open. Next: measure idle-animation visibility before another
production change. See
[the complete confirmation](evidence/rejected-shared-scroll-capture-six-pair-1x.json).

## Latest measured checkpoint

The lazy PR menu candidate is rejected after four complete reference attempts
and 7,200 verified updates. Calibrated probes remove its closed-row app-store
checks, but streaming task-time rate and p95 stay flat. Streaming style rate
and cold readiness are worse in both pairs. All seventy rows remain preserved.

All 183 related units, lint, web types, build and 35 desktop/phone cases pass.
Exact verified app source and `9e20f26b` assets are restored. The prototype,
tests and diagnostic wrappers are removed and preserved separately. Next:
audit rendering cost, measurement overhead and renderer configuration before
another production change. The 20% streaming target and original-baseline
final matrix remain open. See
[the attribution](evidence/external-store-snapshot-attribution.json) and
[the complete rejection](evidence/rejected-lazy-pr-menu-two-pair-1x.json).

### Previous row checkpoint

The memoized transcript-row prototype is rejected after four complete reference
attempts and 7,200 verified updates. Calibrated count probes remove observed
unchanged-prop wrapper renders, but streaming task-time rate stays flat.
Streaming p95 is flat in one pair and 16.7% worse in the other. Normal idle
task work and streaming style rates increase in both pairs.

All 295 related unit tests, lint, web types, build and 52 desktop/phone checks
pass. Exact app source and verified `9e20f26b` assets are restored. All seventy
comparison rows and the rejected prototype remain preserved. Next: investigate
mounted subscriptions and recurring history refreshes before another change.
The 20% normal-streaming task-time target and original-baseline final matrix
remain open. See
[the complete evidence](evidence/rejected-message-row-memoization-two-pair-1x.json).

### Previous comparator and timeline checkpoint

The sidebar comparator is rejected after complete streaming and task-switch
comparisons. A six-pair isolated function benchmark saves 98.14% of local sort
time, but both streaming task-time rates are slightly worse. Navigation
selection p95 is 10.02% and 14.06% slower. All four attempts in each comparison
pass: 7,200 streaming updates and 160 measured task switches are verified.
All seventy streaming rows and twenty-eight navigation rows remain intact.
Exact app source and `9e20f26b` assets are restored; the prototype is preserved.
See [the rejected candidate](evidence/rejected-sidebar-comparator.json).

Calibrated rendering attribution verifies 1,800 ordered updates with no lost
trace events. The first dropped-event capture and the rejected CPU duration
analysis remain preserved. The corrected analysis uses trace wall-duration
unions and CPU sample counts, with no speed claim. Next: targeted rendering
and subscription attribution on restored `9e20f26b`. The 20% streaming target
and original-baseline final matrix remain open. See
[the attribution](evidence/rendering-timeline-attribution.json).

### Earlier checkpoint

The saved-offset layout owner is rejected after four complete reference
samples and 7,200 verified updates. Streaming script work per second is nearly
flat in one pair and 10.32% lower in the other. Main-thread work stays mixed
and approximately flat; style and layout work increase in both pairs.
The exact prototype and all seventy rows are preserved, and verified app
source plus `9e20f26b` assets are restored. Next: fresh rendering timeline
attribution. No speed acceptance or six-pair confirmation follows. See
[the rejection](evidence/rejected-layout-offset-owner-two-pair-1x.json).

The complete C4-to-batching confirmation passes all twelve samples and verifies
21,600 ordered updates. It does not confirm the large preliminary gain.
Streaming main-thread work is flat; p95 frame gaps are mixed. The store-scoped
batching experiment is removed, while independent detach cancellation remains.
The 20% task-time target and original-baseline final matrix remain open. See
[all seventy comparison rows](evidence/rejected-scroll-position-batching-six-pair-1x.json).

A fresh quiet-stream profile on the retained `9e20f26b` build passes both arms
and verifies 3,600 ordered updates. The profiles cover their observation windows
and contain no ARIA inspection stacks. They remain excluded from speed results.
A separate 300-update input probe observes 717 store publications and 767,193
turn/model searches, while the selected turn arrays, model snapshots and feature
inputs remain unchanged. The temporary observer is archived and removed.
The control follow-up does not reproduce bottom-return failure. Three input
samples pass; one warm 4x sample fails composer readiness before a wheel. A
separate 300-update probe counts 542 store publications, including 238 that
change only saved transcript offsets. The layout-owner candidate passes 267
related unit tests, lint, types, build and 66 desktop/phone checks. Its corrected
300-update probe records zero saved-offset app-store publications. Other
publication counts differ, so no speed gain follows from these counts. The
mislabeled first probe remains preserved. The two reference pairs then fail
the repeatability screen recorded above; the candidate is removed. See
[the new attribution](evidence/viewport-scroll-publication-attribution.json).

The prototype passes 105 related unit tests and five desktop/phone checks.
Two preliminary pairs reduce streaming script work per second, while overall
main-thread task-time rate is unchanged. The separate six-pair attempt executes
all twelve attempts: eleven pass and one candidate return-bottom check fails.
Its 19,800 verified ordered updates and full failure remain preserved. The
original summary rejects the report. Exact app source and `9e20f26b` assets are
restored; the prototype and build are preserved. Next: diagnose native
bottom-return on the control. No speed gain is accepted. See
[the confirmation evidence](evidence/message-selector-unqualified.json).
See [the attribution evidence](evidence/message-action-input-attribution.json).

The current `9e20f26b` assets keep per-transcript persistence and add guarded
frame cancellation. Four failures first reproduce stale or duplicate saves;
all 159 related unit tests then pass. Strict lint, full web types, the production
build, 35 desktop checks and 17 phone checks pass. Four captures are inspected.
Reading remains fixed at zero movement, and real PageDown stays within one pixel
after further growth. This is a correctness fix with no speed claim. Next:
fresh quiet-stream attribution on the frozen build. See
[the correction evidence](evidence/transcript-frame-cancellation.json).

Saved-fixture replay passes 14 unit tests, strict lint and both-build full-dataset
rehearsals, then completes the fresh six-pair confirmation. The earlier
interrupted series keeps its four pending attempts and remains excluded. The
isolated E2E type audit matches all 15 baseline errors and adds none. After a
later host restart interrupts the archive copy, the complete source report and
Playwright attachment match byte-for-byte. Re-archiving and the full integrity
audit pass; the original summary reproduces exactly. See
[replay recovery](evidence/fixture-replay-recovery.json) and
[the complete confirmation](evidence/rejected-scroll-position-batching-six-pair-1x.json).

The earlier complete package comparison remains valid for its own `44cf53e7`
build:

The first full-reference v2 Grid comparison on `44cf53e7` completes all
12 attempts and six alternating pairs, verifying 21,600 ordered updates.
Source, assets, runtime helpers, file state, all 12 backend logs and cleanup
pass the integrity audit. Both builds retain 100 loaded messages in each of
six visible sessions; the candidate does not render a smaller view.

Normal streaming is still slower. Main-thread work per second rises 3.4%,
script time rises 55.6%, and p95 frame gaps rise 59.8% by median paired change;
all six pairs regress on those measures. Median p95 grows from 83.4 to
141.7 ms. The 20% task-time target remains unmet. History requests fall 90.6%
and resets fall to zero in every pair. Reduced-motion idle main-thread work
falls 61.2% and renderer CPU falls 53.2% in every pair. These improvements do
not establish a normal-streaming responsiveness gain.

Cold encoded asset bytes fall 77.6%, while readiness remains mixed across
three improving and three regressing pairs. Normal idle work also regresses
slightly. Fresh JavaScript attribution is complete. The streaming
regression remains open. The other 19 matrix cases remain open. See
[the complete paired results](evidence/final44cf-grid-six-pair-1x.json).

Fresh C4 CPU attribution completes both quiet samples and verifies 3,600 ordered
updates. The candidate samples 4.20 seconds in selection checks, 2.46 seconds
in React context propagation and 2.14 seconds in row lookup, including 1.55
seconds in edge tracking. A generic panel scroll listener also samples 2.07
seconds. These overlapping sampled durations are not CPU counters. A separate
scripted profile misses the bottom observation; its full failure and original
profile remain preserved. See [the attribution](evidence/current-c4-stream-cpu-attribution.json).

A bounded row-reference prototype passes 174 unit tests, 35 desktop checks,
17 phone checks and four inspected captures. Two full-density alternating
pairs pass all four attempts and verify 7,200 ordered updates. Streaming p95
rises 22.2% in one pair and is unchanged in the other; script time rises 30.1%
and 3.0%. Reduced-motion idle work falls 28.0% and 24.0%, while both idle
variants have worse maximum frame gaps. The prototype and its specific tests
are removed, with exact C4 source and asset restoration. All paired values,
the patch and rejected build remain preserved. See
[the rejected experiment](evidence/rejected-transcript-row-references-1x.json).

The scroll-position profile motivated a store-scoped publication experiment.
Its first two pairs passed 7,200 ordered updates and suggested a large frame-gap
improvement, with mixed main-thread work. Its 187 unit tests, 35 desktop checks,
17 phone checks, lint, web types and production build passed. Those results
remain preserved as [preliminary evidence](evidence/scroll-position-batching-two-pair-1x.json).

The complete six-pair confirmation on the same `9ee2c6f5` assets passes all
twelve samples and verifies 21,600 ordered updates. Streaming main-thread work
per second is 0.17% higher by median paired change, with four regressions and
two improvements. Streaming p95 gaps are 5.53% lower, with three improvements,
two flat pairs and one regression. Script and renderer CPU time are mixed;
style and layout durations regress in four pairs. Reduced-motion idle work is
mixed, and its maximum gap regresses in four pairs. Cold readiness is mixed.

The large preliminary gain is not confirmed, and the 20% target remains unmet.
Remove the shared-store queue and bulk action. Preserve its exact build and
patch. Keep the separate unfinished-placement cancellation invariant under
per-producer persistence, then resume attribution. The original-baseline final
matrix remains open. See
[every paired measure and the integrity audit](evidence/rejected-scroll-position-batching-six-pair-1x.json).

The current correctness candidate (`c4a426d2`) also restores following when
native upward movement occurs before its wheel handler and the reader later
returns to the bottom. The before-fix browser reaches the bottom with real
PageDown input, then falls 55 pixels behind after more content. The corrected
build stays within 1 pixel across the same 24 frames. All 137 related unit
tests, 35 desktop checks, 17 phone checks, strict scoped lint, the full web
typecheck, and the production build pass. Desktop and phone captures are
inspected. No markup, styles, visible copy or animation loop changes.
See [the correction evidence](evidence/native-reading-return.json).

The C4-to-batching timing evidence is separate from the complete `44cf53e7`
comparison. That earlier comparison remains valid for its own recorded build,
and its streaming regression remains open. The earlier optional isolated E2E type audit retains
six errors in unchanged helpers; the normal full web typecheck passes.

The final dense matrix is still open for this build. The distinct v2 input
protocol now passes 14 browser and 23 Node checks plus both-build Grid and
Columns rehearsals. The four complete samples verify 240 ordered updates.
Original commands, five-second bounds, workload and failed v1 reports stay
unchanged; the new mode requires held reading and keeps versioned results.
See [the protocol evidence](evidence/observed-input-protocol-v2.json).
These focused checks establish correctness, with no final speed or M2 Air claim.
Earlier entries below retain their own build and fixture identities.

The earlier `820f` full-reference grid run finishes all 12 planned attempts:
five pass and seven fail. Only pair zero completes both arms. The five complete
samples verify 9,000 ordered updates, but the failed series cannot support a
six-pair speed summary. Cold readiness, scroll-up, return-bottom, and composer
closure failures remain on the original inputs and deadlines. The current wheel
repair is insufficient at full load. See
[the complete failure evidence](evidence/reference-files-grid-failed.json).

The test harness now retains backend logs per attempt, cold-start state and
errors, failure images, and timings for each existing native input step. The
57 Node checks, four browser regressions, controlled fault caller, and healthy
Threads, full-plugin Dockview, and isolated navigation callers pass within
their scope. The first combined navigation setup failure remains retained.
The application, input sequence, and deadlines stay unchanged. See
[the diagnostic evidence](evidence/failure-diagnostics.json).

Production `7a984021113` adds the native wheel follow repair and passes 228
related unit checks plus 33 desktop and 17 phone browser checks. The original
scripted candidate rehearsal returns to the bottom after streamed height growth;
its frozen baseline fails at 21 pixels. See
[the repair evidence](evidence/native-wheel-bottom-follow.json).

The prior six-pair grid attempt stopped after one complete pair because a
read-only audit found only the default file in its six prepared repositories.
Its data and pending attempts remain preserved, and the summary rejects the
incomplete plan ([gap evidence](evidence/threads-reference-file-gap.json)).
The Threads seed now includes 630 profile files and 73 changes in each prepared
environment. It records actual task count and verifies file hashes before and
after each sample. The real regression, 53 Node checks, strict lint, default
grid, scripted eight-column, and full-plugin Dockview callers pass
([fixture evidence](evidence/threads-reference-file-fixture.json)). These are
harness correctness checks. The final dense reference matrix remains open.

The benchmark preserves failed attempts and continues the complete planned
matrix while retaining final failure
([harness evidence](evidence/dense-attempt-continuation.json)). Older measurements
below retain their own build and fixture identities. Earlier Threads data do
not prove the previously missing file-state dimension.

The retained production build at `72085e06b49` passes final six-pair comparisons
at 1x for compatible tasks, incompatible layouts, and same-environment session
tabs. Gains are modest and some pairs regress; the 20% warm-p95 target remains
unmet. Other required scenarios remain open in the [completion audit](completion-audit.md).
See the [compatible-task](evidence/final-task-switch-six-pair-1x.json),
[layout-restoration](evidence/final-incompatible-layout-six-pair-1x.json), and
[session-tab](evidence/final-session-tabs-six-pair-1x.json) evidence.

Production `f5c8fb8f6ab` also passes six full Dockview core pairs at 1x.
Streaming history reads fall about 96.2% in all pairs; renderer CPU falls
11.4% by median paired change with one regression. Reduced-motion idle main CPU
falls 81.0% in every pair. Late frame/CPU regressions remain open, and the 20%
streaming task-time target is unmet. See [core evidence](evidence/final-dockview-core-six-pair-1x.json).
The scripted Threads grid/column harness and unchanged quiet caller pass both
builds. The full-plugin six-pair series also passes, with lower streaming reads
and CPU but mixed idle results and four remaining reduced-motion animations
([evidence](evidence/final-dockview-plugin-six-pair-1x.json)). The isolated
shared-Spinner follow-up now removes those four reduced-motion rotations and
passes six pairs, with 79.82% lower main CPU and 69.65% lower renderer CPU in
that mode ([evidence](evidence/plugin-spinner-motion-six-pair-1x.json)). Normal
CPU and frame regressions remain explicit. Full reference grid, columns, and
stress remain separate work.

The final scripted grid attempt is incomplete: four pairs pass before the fifth
control fails its return-bottom interaction. Candidate streaming frame-gap p95
is higher in every completed pair. The failed report remains intact and is
excluded from final speed summaries. See [evidence](evidence/final-scripted-grid-failed-attempt.json).
Separate renderer attribution and the final grid gate remain open.

## Outcome and checkpoint

Reduce unnecessary work in Threads, Dockview, and task switching, then measure
the change against a frozen baseline with identical dense synthetic workloads.
Preserve the default appearance, current data freshness, drafts, and navigation.
Reduced-motion mode will show static status indicators with unchanged meaning.

The user authorized implementation, sustained optimization, and incremental
commits and pushes on 2026-10-23 after the design handoff. Execute the six work
orders in the primary session. Motion validation can follow the first transport
repair while durable-stream receipt work remains open: these changes have no
code dependency, and baseline assets are already frozen. Delegation and deployment have not
been requested. The baseline precedes production edits.

## Evidence and baseline

The live deployment was `e29a5b36448892d12b9eac9cb75d837007fb55f4`.
The source baseline for implementation is
`595df36ed5c1cf02fd90cb972b623ad6edc53df8`. These are different versions.
The deployment supplies a reproduction lead, not the A/B control.

Live observations: six visible chat tiles; 30 newest-window `message.list`
requests in 15 seconds; 12 of 18 requests in a separate eight-second capture
entered through core conversation recovery. Thirteen reset notifications in a
ten-second capture had empty revision fields. The gateway emits that shape
when it has no receipt. The exact producing writer remains unconfirmed.
The separate captures have different denominators and must not be combined.
The first resource buffer recorded at least 20.5 MB transferred and large
editor chunks without a mounted Monaco editor. The exact import initiator is
unconfirmed. Retained local evidence:
`.kandev/diagnostics/threads-performance-evaluation.json` (ignored artifact).

The live animation pause experiment had different stream rates between arms;
it did not establish a CPU gain. Existing offscreen activation, hidden motion
pausing, read sharing, and Dockview fast switching must be retained. Node
counts alone do not establish a leak. No M2 Air measurements exist yet.

## Scope and existing ownership

1. Reproduce and repair ordinary conversation updates that trigger unnecessary
   source resets. Preserve real gap, reconnect, startup, and foreground recovery.
2. Respect reduced motion and suspend demonstrated hidden presentation work.
   Keep the intentional mounted composer and its draft/plugin state.
3. Compress immutable assets. Defer editor imports only after an initiator
   trace proves they load before use and a safe existing boundary is identified.
4. Attribute dense Dockview/task-switch costs and repair demonstrated repeated
   work within existing editor, selector, and layout owners.
5. Compare baseline and candidate production builds with the protocol below.

No transcript virtualization, layout redesign, default motion removal, broad
store rewrite, dependency replacement, new flag, or agent lifecycle change is
included. Do not reduce visible chats, history, update rate, or plugin coverage
to make the candidate look faster. Do not change the user's live instance.

The existing [conversation design](../../specs/plugins/system-design/conversation-source-reconciliation.md)
and [ADR](../../decisions/2026-09-16-conversation-source-reconciliation.md)
require complete transaction receipts and incremental updates. Implement that
contract; do not invent revisions, content hashes, or another payload journal.
The [subscription recovery requirements](../../specs/platform/requirements/session-subscription-recovery.md)
retain backfill and state snapshots. Their reads are counted separately from
unnecessary reset-driven reads. This package does not remove that safeguard.

The [session efficiency plan](../session-refresh-efficiency/plan.md), Task 05,
already owns unresolved editor attribution. Work order 05 below supplies its
dense reproduction and follow-up evidence; it does not duplicate completed
route/read-sharing work. The [rendering CPU plan](../frontend-rendering-cpu/plan.md)
already delivered hidden animation gating; its separate attribution work
remains open until evidence meets its own criteria. Historical conversation
storage verification remains historical. Update companion links and only the
statuses actually established by new evidence.

## Technical approach and compatibility

| Boundary                           | Change and invariant                                                                                                                                                   | Evidence/fallback                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Task repository/service to gateway | Trace ordinary message and turn publications through transaction receipts and `conversation_delivery.go`. Preserve complete revision intervals and privacy projection. | SQLite production path plus PostgreSQL receipt parity if touched. Exceptional incomplete receipts still reset.             |
| Core chat and plugin facade        | Apply complete batches by ID. Coalesce only equivalent concurrent recovery reads within the existing store/session/auth owner.                                         | Native and plugin consumers, missed delivery, stale responses, reconnect. No global cache or removal of periodic backfill. |
| Threads                            | Preserve viewport-owned activation and current visible tile count.                                                                                                     | Six-visible-tile grid and horizontally scrolled 30-column list.                                                            |
| Dockview                           | Preserve `detailActive`, split visibility, saved layout, pinned tabs, environment mapping, and fast/slow switch semantics.                                             | Same-layout, changed-layout, cross-environment, and A-B-A cases. No forced fast path across incompatible layouts.          |
| Composer                           | Retain mounted editor state; gate only proven unnecessary hidden effects.                                                                                              | Text, rich draft, attachments, focus, expand/collapse, delayed send acknowledgement.                                       |
| Status motion                      | Extend existing owned primitives for reduced motion.                                                                                                                   | Web Animations and CSS fallback; static status stays visible.                                                              |
| Static assets                      | Build gzip siblings and negotiate in the native handler.                                                                                                               | Identity fallback, packaged resources, original decoded bytes, desktop and phone route load.                               |

## UI preservation and motion preview

Desktop keeps the current Threads grid/list and Dockview split panels. Phone
keeps its native selected conversation and existing task/panel navigation.
Headers, controls, spacing, colors, borders, scroll owners, and touch targets
remain unchanged. There is no layout or control-placement change to sketch.

UI-01, shared status region: in normal mode the existing status icon moves;
in reduced-motion mode the same visible status icon is static. The existing
label and task content stay in place. This preview maps to
`AC-UI-PERSISTENT-STATUS-MOTION-006.1` through `.3`. Verify it in desktop and
phone browser captures; a static screenshot alone cannot prove motion stops.

## Tests and E2E coverage

The [benchmark protocol](benchmark.md) defines the fixture, measurements,
comparison, and limits. Work orders name exact commands and implementation
targets. New filenames are planned outputs, not existing test evidence.

| Acceptance criteria                                                       | Owned evidence                                                                               |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `AC-PLUGINS-PROMPT-HISTORY-HOST-006.3`, `.6`, `.9`, `.10`                 | WO02: real writer-to-gateway regression, core/facade tests, desktop and phone recovery flows |
| `AC-PLATFORM-SESSION-SUBSCRIPTION-RECOVERY-001.2`, `.3`, `.8`             | WO02: subscription acknowledgement, shared recovery, reconnect and late-read races           |
| `AC-PLATFORM-VIEWPORT-SESSION-DELIVERY-001.1`                             | WO01/05: visible consumer counts while horizontal scrolling and switching panels             |
| `AC-UI-SESSION-REFRESH-EFFICIENCY-003.3`, `.4`, `004.1` through `.3`      | WO05: mounted real editors, A-B-A draft/scroll restoration, desktop and phone navigation     |
| `AC-UI-PERSISTENT-STATUS-MOTION-004.1` through `.5`, `006.1` through `.3` | WO03: hidden/visible and runtime preference tests, desktop/mobile browser motion checks      |
| `AC-PLATFORM-WEB-ASSET-DELIVERY-001.1` through `.4`                       | WO04: build helper, handler, packaged asset smoke and browser checks                         |
| All above                                                                 | WO06: matched A/B evidence, correctness matrix, no unsupported performance claims            |

Run targeted Chromium E2Es for streaming, recovery, dense Threads, Dockview,
and navigation. Run mobile-chrome counterparts for recovery, status motion,
task switching, drafts, and scroll. Use the mobile-parity and E2E skills.
Use causal readiness and mutation completion for correctness, bounded timed
windows only for profiling. Performance values are comparative results, not
absolute timing assertions in CI.

## Work orders

- [ ] [01: Dense fixture and baseline](task-01-dense-baseline.md)
- [x] [02: Incremental conversation repair](task-02-conversation-repair.md)
- [x] [03: Persistent motion eligibility](task-03-motion-eligibility.md) (reduced motion and owned Threads offscreen lifecycle verified; six-pair busy-header CPU reduction retained)
- [x] [04: Asset delivery and import boundaries](task-04-asset-delivery.md)
- [ ] [05: Dockview and editor lifecycle](task-05-workbench-lifecycle.md)
- [ ] [06: Matched comparison and regression evidence](task-06-performance-comparison.md)

## Risks and decision gates

- The observed live reset producer may already differ at the source baseline.
  Reproduce first; if absent, report that result and preserve the fix scope as
  unresolved rather than adding speculative code.
- Coalescing reads with different scope, cursors, or authority can lose history.
  Join only equivalent work and retain dirty follow-up and generation checks.
- Unmounting hidden composers can lose drafts, plugins, or focus. Retain their
  ownership and gate demonstrated effects instead.
- Compression improves cold transfer, not warm rendering. Report separately.
- Profiling changes timing. Keep attribution runs separate from timed runs.
- Linux Chromium with CPU throttling is not an M2 Air simulation. Publish the
  host details; a direct M2 run remains a separate confirmation.

## Verification results

Design validation on 2026-10-22 passed:

- `python3 scripts/list-docs.py validate`: 384 decisions and 1,618 specifications.
- `python3 scripts/lint-spec-files.py --all`: all specification files passed.
- `python3 scripts/lint-spec-files.test.py`: 36 tests passed.
- `.github/scripts/pr-docs.cjs` synthetic coverage preflight: all six work
  orders covered, with valid requirements, criteria, plans, and design links.
- `git diff --check`: passed.

Implementation began on 2026-10-23. The design package and serialized-receipt
repair are committed. The dense pilot passed with 1,000 tasks and 36,000
messages. Motion eligibility is implemented with passing component and
browser checks. See each work order for exact evidence and remaining work.
The six-pair unthrottled grid comparison is complete. Cold encoded asset bytes
fell 77.62%, streaming history requests fell 90.85%, and reduced-motion idle
main-thread work fell 42.93% by median paired change. Normal streaming main-thread task time did
not improve, and frame-gap p95 increased 59.93%. All twelve samples passed final
content checks. The existing six-pair navigation comparison also establishes
no switching gain. Rendering follow-up, 4x stress, and the remaining scenario
matrix stay open. See [results.md](results.md) for ranges, errors, and limits.

The [completion audit](completion-audit.md) tracks the remaining scenario,
artifact, correctness, and delivery proof against the full approved scope.

## Editor subscription lifecycle follow-up

Full-reference private ownership observation finds user-reference growth of
200 per 100 task switches on both the original and retained candidate. The
existing `004.3` cleanup contract covers this finding. A minimal `useEditors`
effect cleanup passes 14 unit checks, both build/type pipelines, the fixed
100-switch and Settings release proof, and all 50 targeted desktop/phone checks.
The new uninstrumented candidate is `39be7b61`. Its full comparison matrix
remains pending; previous `820f` failures and measurements retain their build
scope. See [the repair evidence](evidence/editor-user-subscription-ownership.json).

## New production Grid reference

The uninstrumented `39be7b61` build completes all 12 planned Grid attempts
against the original `312770e3` control. The workload stays at 1,000 tasks,
30 columns, 36,000 stored messages, six canonical streams and 60-second
windows. All six original attempts pass. Five candidate attempts pass;
`candidate-1x-2` fails the unchanged native scroll-up check during streaming.
The 11 complete samples verify 19,800 ordered updates.

Both hover steps and the composer reveal finish before the failed wheel
action. The five-second predicate expects a position below 52,067 pixels
and receives 52,488 pixels. A later snapshot is separate evidence. The trace
does not capture the actual wheel target or first native scroll response,
so the production cause remains unknown. Capture those events in a separate
diagnostic before changing scroll behavior. Do not change the original
inputs or deadlines.

The failed report is correctly rejected by the summary guard. No speed
comparison is published from its five complete pairs. All raw attempts,
12 backend logs and the failure screenshot are retained; runtime and helper
identities remain exact, and the temporary instance stops cleanly. The other
19 new-build matrix cases remain pending. Earlier `820f` failures retain
their original scope. See [the Grid evidence](evidence/reference39be-grid-failed.json).

## Native wheel attribution preparation

A browser-only observer now records actual wheel targets, path membership,
prevention state, geometry and subsequent scroll events. All 14 focused
browser cases, eight summary checks, strict lint and the isolated observer
typecheck pass. Saved ledgers verify missed targets, prevented input, synthetic
events, bounded retention, cleanup, disabled mode, error preservation, replaced
nodes and a 2x display context. A small real-page pair passes on both frozen
builds. This is capture validation, not a speed estimate.

The original input helper stays byte-identical. The new diagnostic kind is
excluded from gain summaries, including the passing rehearsal report. All
calibration failures, export corrections and the stale-source guard check are
retained. Full-density native-event attribution is next; the actual `39be`
scroll-up failure and the other 19 final matrix cases remain open. See
[the calibration evidence](evidence/native-input-calibration.json).

## Full-density native input findings

The calibrated observer completes all 12 planned attempts on the frozen
`312770e3` and `39be7b61` builds. Nine attempts pass and three fail; nine
complete samples verify 16,200 ordered updates. All 22 native wheel records,
12 backend logs and bounded capture results are retained. Sources, assets,
owned helpers and cleanup are verified. The diagnostic is rejected by the
speed-summary guard.

The traces distinguish three cases. The candidate scrolls upward by 160 pixels
then resumes following without a later scripted gesture. A queued old-edge
scroll can consume the new upward intent; reproduce that order and preserve
held reading before changing the test. Separately, the candidate reaches zero
bottom gap within the five-second check window while controller polling misses
those states. The original version also scrolls up and holds correctly, but
its check compares with an offset that became stale before the gesture.

Next: add a failing native-scroll regression for the queued-scroll race,
implement the smallest session-owned intent repair, and verify explicit resume
and other input modes. Correct measurement separately under a distinct
protocol with the same commands, deadlines and thresholds. Catching only a
transient upward move would hide the product issue. The current primary
`39be` failure and the other 19 matrix cases remain open. See
[the full input evidence](evidence/full-density-native-input-causes.json).
