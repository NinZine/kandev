---
id: "10-accept-retry-passed-tests"
title: "Accept retry-passed tests in CI"
status: done
wave: 6
depends_on:
  - "03-ci-manifest-lifecycle"
  - "07-retry-observability"
  - "09-rollout-documentation"
plan: "plan.md"
requirements:
  - REQ-PLATFORM-E2E-DURATION-AWARE-SHARDING-002
acceptance_criteria:
  - AC-PLATFORM-E2E-DURATION-AWARE-SHARDING-002.3
system_design:
  - ../../specs/platform/system-design/e2e-duration-aware-sharding.md
---

# Task 10: Accept retry-passed tests in CI

## Summary

Allow the standard normal and container E2E CI jobs to pass when a test passes
after retry. Preserve retry reporting and the explicit diagnostic opt-in that
fails retry-passed tests.

## In scope

- Remove `E2E_FAIL_ON_FLAKY=1` from the standard normal and container CI jobs.
- Update the E2E README to document the standard CI policy and diagnostic
  opt-in.
- Preserve the configured retry count, failure after exhausted retries, and
  passed-after-retry reporting.

## Out of scope

- Changing Playwright's retry count or retry-summary format.
- Adding a separate scheduled diagnostic workflow.
- Changing local Playwright defaults.

## Acceptance

- Standard normal and container CI jobs accept tests that pass after retry,
  while tests that exhaust their retries continue to fail.
- Retry and flake reports continue to include passed-after-retry results, and
  `E2E_FAIL_ON_FLAKY=1` remains documented as an explicit diagnostic override.

## Verification

```sh
! rg -n 'E2E_FAIL_ON_FLAKY:' .github/workflows/e2e-tests.yml
rg -n 'E2E_FAIL_ON_FLAKY|failOnFlakyTests|retries: CI \? 3' apps/web/e2e/playwright.config.ts apps/web/e2e/README.md
git diff --check
```

## Files likely touched

- `.github/workflows/e2e-tests.yml`
- `apps/web/e2e/README.md`

## Dependencies

Tasks 03, 07, and 09 are completed.

## Risks

Retry-passed failures no longer block standard CI, so the retry and flake
reports remain the signal for transient instability.

## Parallelism

`sequential`

## Inputs

- The platform E2E reliability requirement and system design.
- The normal and container job configuration and E2E README.

## Results

The standard jobs no longer set `E2E_FAIL_ON_FLAKY`; the README documents the
green retry-pass behavior and diagnostic opt-in. The requirement detail and the
system design state the same policy, including that exhausted retries still
fail. The work-order `rg` checks, `git diff --check`, documentation catalog
validation, and specification lint passed.
