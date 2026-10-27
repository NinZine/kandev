---
id: "04-frontend-provider-delivery"
title: "Use provider settings and preserve the in-app update indication"
status: done
wave: 3
depends_on:
  - "01-provider-event-and-delivery"
  - "02-update-replay-and-wiring"
  - "03-native-permission-bridge"
plan: "plan.md"
spec: "../../specs/platform/requirements/notifications.md"
---

# Task 04: Use Provider Settings and Preserve the In-App Update Indication

## Acceptance

- The Updates page has no update-only settings card/API/state; the existing
  provider matrix labels and persists `system.update_available`.
- A delivered Local update occurrence always shows an in-app toast and attempts
  native/browser delivery only without prompting; denied, unsupported, and
  command-failure paths retain the toast.
- Local Kandev release copy uses the active application catalog even when the
  backend supplies English title/body values. The same localized strings reach
  the toast and selected native/browser transport; version and occurrence ID
  remain unchanged (`AC-PLATFORM-NOTIFICATIONS-001.5`, `AC-PLATFORM-I18N-001.1`).
- The Notifications permission control uses the native permission bridge in
  Tauri and the Web Notification API elsewhere, exposing denied/unsupported
  state in the existing UI.

## Verification

```bash
cd apps
pnpm --filter @kandev/web exec vitest run \
  lib/ws/handlers/notifications.test.ts \
  hooks/use-update-available-toast.test.ts \
  components/settings/notifications-settings-actions.test.tsx \
  lib/state/hydration/hydrator.test.ts \
  src/settings-routes.test.ts
cd web
pnpm run typecheck
```

## Files likely touched

- `apps/web/components/settings/system/update-notifications-card*.tsx`
- `apps/web/src/settings-routes.tsx`
- `apps/web/src/settings-routes.test.ts`
- `apps/web/lib/api/domains/system-api.ts`
- `apps/web/lib/api/domains/system-api.test.ts`
- `apps/web/lib/types/system.ts`
- `apps/web/lib/types/backend.ts`
- `apps/web/lib/notifications/events.ts`
- `apps/web/components/settings/notifications-settings.tsx`
- `apps/web/components/settings/notifications-settings-actions.ts`
- `apps/web/components/settings/notifications-settings-actions.test.tsx`
- `apps/web/lib/state/default-state.ts`
- `apps/web/lib/state/hydration/hydrator.ts`
- `apps/web/lib/state/hydration/hydrator.test.ts`
- `apps/web/lib/state/slices/system/*`
- `apps/web/lib/state/slices/ui/*`
- `apps/web/lib/state/store.ts`
- `apps/web/lib/ws/handlers/notifications.ts`
- `apps/web/lib/ws/handlers/notifications.test.ts`
- `apps/web/lib/ws/handlers/system-events.ts`
- `apps/web/lib/ws/handlers/system-events.test.ts`
- `apps/web/hooks/use-update-available-toast.ts`
- `apps/web/hooks/use-update-available-toast.test.ts`
- `apps/web/components/update-available-toast-bridge.tsx`

## Dependencies

- Task 01 defines the event/payload contract.
- Task 02 removes the parallel backend policy API.
- Task 03 provides non-prompting native permission and delivery methods.

## Inputs

- Spec sections `API Surface`, `Failure Modes`, and mobile scenario.
- Plan `Frontend` and `Mobile Design Contract`.
- ADR-0046 settings save-coordinator invariant.

## Output contract

Report deleted orphan surfaces, event registration, fallback behavior,
permission UI behavior, tests/typecheck, risk tags, and task status update.

## CI localization correction

PR #4534 head b5e5644407f6 exhausted all retries on 19 pseudo-locale cases
because the release toast preferred populated backend English copy. Two new
hook cases reproduce this after a delivery-time locale switch, through both
browser and native paths. Reuse the existing catalog keys; add no translations,
backend payload changes, notification policy or test allowlist.

Mobile exemplar and rendered check: the update toast in
`e2e/tests/chat/mobile-clarification.spec.ts`, in the `Auto-run ON` case. Its
existing notification/composer containment assertions remain unchanged. Run it
after the shared copy correction, together with the full pseudo-coverage spec.
The hook cases separately prove translated content for both delivery transports.
Public documentation impact is one clarification of Local alert language in
the operations guide.

Verification: both new hook cases fail on the original English payload
precedence. After the two-line correction, 57 hook/bridge/notification tests,
all 22 rebuilt pseudo-locale browser cases and the phone `Auto-run ON` case
pass. Browser retries are disabled. Full typecheck (6 GiB Node heap), scoped
zero-warning lint, localization checks and docs/spec validation pass. The
existing pseudo-locale assertions, notification policy and phone geometry
assertions are unchanged.
