---
id: "01-webhook-notification-provider"
title: "Add the webhook notification provider"
status: done
wave: 1
depends_on: []
plan: "plan.md"
requirements:
  - REQ-PLATFORM-WEBHOOK-NOTIFICATIONS-001
acceptance_criteria:
  - AC-PLATFORM-WEBHOOK-NOTIFICATIONS-001.1
  - AC-PLATFORM-WEBHOOK-NOTIFICATIONS-001.2
  - AC-PLATFORM-WEBHOOK-NOTIFICATIONS-001.3
  - AC-PLATFORM-WEBHOOK-NOTIFICATIONS-001.4
  - AC-PLATFORM-WEBHOOK-NOTIFICATIONS-001.5
  - AC-PLATFORM-WEBHOOK-NOTIFICATIONS-001.6
system_design:
  - ../../specs/platform/system-design/webhook-notifications.md
---

# Task 01: Add the Webhook Notification Provider

## Summary

Add the `webhook` notification provider and its settings surface, then harden
the save path and outbound request policy against the review findings. The
provider reuses the existing provider CRUD, ownership checks, event
subscriptions, and atomic save. It does not introduce a second notification
configuration path.

## Scope and files

Backend:

- `apps/backend/internal/notifications/models/models.go`: add the provider type.
- `apps/backend/internal/notifications/providers/webhook.go`: validation,
  payload, delivery, SSRF dial policy, private-network opt-in, and redirect
  policy.
- `apps/backend/internal/notifications/providers/webhook_test.go`: payload,
  header, redirect, SSRF, opt-in, and timeout coverage.
- `apps/backend/internal/notifications/service/service.go` and
  `webhook_provider_test.go`: register the provider and cover provider CRUD.
- `apps/backend/internal/notifications/controller/controller.go`: default name.
- `apps/backend/internal/notifications/dto/dto.go` and `dto_test.go`: serialize
  empty subscriptions as an empty list.

Frontend:

- `notifications-settings-webhook-helpers.ts`: header parsing, validation,
  formatting, and webhook form state.
- `notifications-settings-webhook-providers.tsx` and
  `notifications-settings.tsx`: settings section and page wiring.
- `notifications-settings-actions.ts`: create/update drafts and mutual
  exclusion.
- `notification-save-reconciliation.ts`: compare every submitted webhook field
  and per-form identity before clearing a create form.
- `notifications-settings-webhook-save.test.tsx`,
  `notifications-settings-actions.test.tsx`, and
  `notifications-settings.test.tsx`: save, validation, and form behavior.
- `apps/web/lib/types/http.ts` and `apps/web/src/locales/*/settings.json`:
  provider type and localized copy.
- `apps/web/e2e/tests/settings/webhook-provider-save-reload.spec.ts`: desktop
  create, save, reload, and edit journey.
- `docs/public/developer-tools.md`: operator guidance for private destinations.

## Acceptance

1. Notification settings creates, edits, tests, and removes a webhook provider
   with name, URL, headers, and secret on desktop and phone.
2. Delivery posts the versioned JSON payload with configured headers and the
   optional bearer secret, times out after 10 seconds, and reports bounded
   non-2xx failures.
3. Invalid header names or values are rejected by the backend and the settings
   form; header names that differ only by case are rejected instead of
   overwriting nondeterministically.
4. Private, loopback, link-local, and reserved destinations are rejected by
   default at validation and dial time. The documented backend environment
   opt-in permits intentional private destinations.
5. Cross-origin redirects fail; same-origin redirects are allowed up to the
   configured limit, so credential headers never reach another origin.
6. A saved webhook provider reloads with its configuration and `events: []`
   when it has no subscriptions. Edits made during an in-flight create remain
   in the form, and Apprise and webhook create forms cannot be open together.

## Regression sequence

Add backend table tests for payload fields, header validation, case-duplicate
headers, redirect policy, literal and resolved private addresses, the opt-in,
and timeout behavior before changing the provider. Add service tests for
registration and CRUD, and DTO tests for nil subscriptions.

Add frontend tests for invalid headers, mutual exclusion, submitted-field
reconciliation, and replacement form identity. Extend the settings tests for
create/edit/remove rendering. Add the desktop Playwright journey that creates a
provider through the UI, saves, reloads, opens Edit, and checks the restored
name, URL, headers, and secret.

## Exact verification commands

From `apps/backend`:

```bash
go test ./internal/notifications/...
```

From `apps/web`:

```bash
pnpm exec vitest run components/settings/notifications-settings-actions.test.tsx components/settings/notifications-settings.test.tsx components/settings/notifications-settings-webhook-save.test.tsx
pnpm run typecheck
pnpm exec eslint --max-warnings 0 components/settings/notification-save-reconciliation.ts components/settings/notifications-settings-actions.ts components/settings/notifications-settings-provider-updates.ts components/settings/notifications-settings-webhook-helpers.ts components/settings/notifications-settings-webhook-providers.tsx components/settings/notifications-settings.tsx components/settings/notifications-settings-actions.test.tsx components/settings/notifications-settings.test.tsx components/settings/notifications-settings-webhook-save.test.tsx lib/types/http.ts eslint.i18n.options.mjs e2e/tests/settings/webhook-provider-save-reload.spec.ts
pnpm run i18n:check
pnpm e2e:run --host --shards 1 --project chromium tests/settings/webhook-provider-save-reload.spec.ts
```

From the repository root:

```bash
gofmt -l apps/backend/internal/notifications/providers/webhook.go apps/backend/internal/notifications/providers/webhook_test.go apps/backend/internal/notifications/service/service.go apps/backend/internal/notifications/service/webhook_provider_test.go apps/backend/internal/notifications/controller/controller.go apps/backend/internal/notifications/dto/dto.go apps/backend/internal/notifications/dto/dto_test.go
```

## Dependencies

None. The provider uses the existing notification service, provider registry,
settings save path, and e2e fixtures.

## Inputs

- [Semantic notification requirements](../../specs/platform/requirements/notifications.md).
- [Webhook notification system design](../../specs/platform/system-design/webhook-notifications.md).
- Existing Apprise provider and settings patterns.
- Repository outbound SSRF guidance in `docs/public/extending-kandev.md`.

## Output contract

Report provider behavior, validation and SSRF policy, redirect handling,
save/reconciliation behavior, files changed, exact test results, and task
status.
