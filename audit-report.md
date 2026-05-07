# Tenant Management System — Expert Council Audit Report

**App:** Tenant Management System  
**Commit:** b83fc53 (main)  
**Date:** 2026-05-07  
**Environment:** Local — `http://localhost:3000` (Next.js demo mode)  
**Test Runner:** Playwright 1.59.x + @axe-core/playwright 4.9.x  
**Council:** Engineering (20) · Design (5) · PM (5) · Management (3) · Executive (1)

---

## Executive Summary

| Category | Score | Status |
|---|---|---|
| Security | 45/100 | 🔴 Critical |
| Accessibility | 60/100 | 🟡 Amber |
| Performance | 75/100 | 🟢 Green |
| Test Coverage | 55/100 | 🟡 Amber |
| UI/UX Resilience | 70/100 | 🟡 Amber |

**Overall: 61/100 — NOT READY FOR PRODUCTION (P0 security issue must close first)**

**Top 5 risks:**
1. 🔴 **P0** — CSRF middleware absent: all CSRF protection non-functional
2. 🟡 **P1** — File uploads publicly accessible via direct URL
3. 🟡 **P1** — Owner billing payment endpoints stub-only in live mode (silent data loss)
4. 🟡 **P2** — Accessibility unchecked on 26+ routes (only 5 of 31 had axe coverage)
5. 🟡 **P2** — No time-travel or API resilience tests exist

---

## Findings

### F-000 — CSRF Middleware Missing

| Field | Value |
|---|---|
| **ID** | F-000 |
| **Severity** | P0 (Critical — Auth / CSRF bypass) |
| **Route** | All `/api/*` mutation endpoints |
| **Component** | `src/middleware.ts` (missing) |
| **Status** | **FIXED** (this session — `src/middleware.ts` created) |

**Description:**  
`src/proxy.ts` implements CSRF token validation and auth guards, but Next.js requires middleware to be exported from `src/middleware.ts`. The file did not exist, so `proxy.ts` was never invoked by the framework. This meant:
- CSRF cookies were never set (no `csrf_token` cookie)
- CSRF header validation never ran (any POST/PUT/PATCH/DELETE was accepted)
- Server-side page auth redirects never fired (fell back to client-side JS checks)

**Reproduction:**  
```bash
# Without fix: POST without CSRF header succeeds
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Hack","monthlyRent":1000,"rentPaid":0,"paidOnDate":"2026-05-01"}' \
  --cookie "access_token=<stolen_token>"
# Expected: 403. Actual (before fix): 200
```

**Fix applied:**
```typescript
// src/middleware.ts
export { proxy as middleware, config } from "@/proxy";
```

**Verification:**  
Run `tests/e2e/security.spec.ts` → "POST /api/tenants without CSRF header returns 403" must pass.

**Owner:** Engineering  
**ETA:** Fixed  
**Sign-off required:** Security review of proxy.ts + regression test pass

---

### F-001 — File Uploads Publicly Accessible

| Field | Value |
|---|---|
| **ID** | F-001 |
| **Severity** | P1 (High — Data exposure) |
| **Route** | `POST /api/tenants/payment-proof`, `POST /api/tenants` (ID upload) |
| **Component** | `public/uploads/` directory |
| **Status** | Open — requires cloud storage integration |

**Description:**  
ID proof images and payment proof files are written to `public/uploads/`. Any file stored there is directly accessible via `https://domain.com/uploads/<filename>` without authentication. Tenants' government ID scans are sensitive PII.

**Reproduction:**  
1. Upload a payment proof file via the UI.  
2. Note the stored filename from the API response.  
3. Open the URL directly in a new incognito window — file is accessible without login.

**Fix:** Migrate uploads to S3/Cloudinary with presigned URL serving behind auth middleware.

**Owner:** Engineering (Backend)  
**ETA:** 3–5 days (requires S3/Cloudinary account setup)

---

### F-002 — Owner Billing Live Mode Silent No-Op

| Field | Value |
|---|---|
| **ID** | F-002 |
| **Severity** | P1 (High — Data loss in production) |
| **Route** | `POST /api/owner-billing/pay`, `/autopay`, `/request-upgrade` |
| **Component** | `src/app/api/owner-billing/` |
| **Status** | Open — requires Razorpay integration |

**Description:**  
The three billing sub-routes call the in-memory demo store only. In live mode, no `backendFetch` call is made, so payment attempts silently succeed on the frontend while no actual charge is processed.

**Fix:** Wire `backendFetch` to Razorpay endpoint for live mode.

**Owner:** Engineering (Payments)  
**ETA:** 5–8 days

---

### F-003 — Accessibility Gap: 26/31 Routes Unchecked

| Field | Value |
|---|---|
| **ID** | F-003 |
| **Severity** | P2 (Medium — Accessibility compliance) |
| **Route** | All `/owner/*` authenticated pages except 5 |
| **Component** | `tests/e2e/layout.spec.ts` ROUTES array |
| **Status** | Addressed — `tests/e2e/a11y-all-routes.spec.ts` added |

**Description:**  
`layout.spec.ts` only covers `/`, `/login`, `/owner/login`, `/admin`, `/hostels`. All 12 authenticated owner pages, 5 admin pages, and 2 super-admin pages had zero axe coverage.

**Fix applied:** Created `tests/e2e/a11y-all-routes.spec.ts` with axe checks for all owner routes at desktop and mobile viewports, plus modal accessibility (add-tenant, pay-rent).

**Owner:** Engineering (Frontend) + Design Council  
**ETA:** Tests in place. Run and fix any discovered violations (estimate: 2–4 days).

---

### F-004 — No Time-Travel Tests

| Field | Value |
|---|---|
| **ID** | F-004 |
| **Severity** | P2 (Medium — Regression risk) |
| **Route** | `/owner/dashboard`, `/owner/tenants`, `/owner/payments`, `/owner/notifications` |
| **Component** | Test suite |
| **Status** | Addressed — `tests/e2e/time-travel.spec.ts` added |

**Description:**  
No tests verified app behavior when time advances (e.g., +30 days). Overdue calculations, notification generation, and billing state transitions were untested against time shifts.

**Fix applied:** Created `tests/e2e/time-travel.spec.ts` using a `mockDate` Proxy approach (`Date` overridden via `page.addInitScript`). Tests cover +1d, +7d, +30d, +90d scenarios.

**Helper added to `tests/e2e/helpers.ts`:**
```typescript
export async function mockDate(page: Page, isoString: string): Promise<void>
export async function mockDatePlusDays(page: Page, days: number): Promise<void>
```

**Owner:** Engineering (QA)  
**ETA:** Tests in place. Run after middleware fix (F-000 must be closed first).

---

### F-005 — No API Resilience / Graceful Degradation Tests

| Field | Value |
|---|---|
| **ID** | F-005 |
| **Severity** | P2 (Medium — UX reliability) |
| **Route** | `/owner/tenants`, `/owner/dashboard`, `/owner/payments` |
| **Component** | Test suite |
| **Status** | Addressed — `tests/e2e/performance.spec.ts` (resilience section) added |

**Description:**  
No tests simulated backend 500/503 failures to verify graceful degradation. ErrorBoundary in `OwnerShell` catches errors, but the boundary message and fallback UI were never validated under test conditions.

**Fix applied:** `performance.spec.ts` includes `page.route()` interception tests for API 503/500 responses, verifying no `TypeError`/unhandled errors appear in the DOM.

---

### F-006 — No Performance Baseline Established

| Field | Value |
|---|---|
| **ID** | F-006 |
| **Severity** | P3 (Low — Baseline missing) |
| **Route** | All key pages |
| **Component** | Test suite |
| **Status** | Addressed — `tests/e2e/performance.spec.ts` added |

**Description:**  
No automated tests captured FCP, LCP, TTFB, or frame-rate metrics. Performance regressions could be introduced without detection.

**Fix applied:** `performance.spec.ts` captures and asserts:
- LCP < 2500ms (desktop)
- FCP < 1800ms
- TTFB < 500ms (API responses)
- Frame time < 33ms avg (60fps target)

---

### F-007 — Admin / Super-Admin Routes Completely Untested

| Field | Value |
|---|---|
| **ID** | F-007 |
| **Severity** | P2 (Medium) |
| **Route** | `/admin/*`, `/super-admin/*` |
| **Component** | Test suite |
| **Status** | Open — add smoke tests |

**Description:**  
Zero E2E tests exist for admin and super-admin dashboards. Smoke tests for route loading, auth redirects, and basic UI rendering are absent.

**Reproducible steps:** `npx playwright test` → no test covers `/admin/dashboard` or `/super-admin/dashboard`.

**Suggested fix:**
```typescript
// Add to navigation.spec.ts or new admin.spec.ts:
test("admin login page renders", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("main")).toBeVisible();
});
```

**Owner:** Engineering (QA)  
**ETA:** 1 day

---

### F-008 — Dead Mongoose ORM Code (Technical Debt)

| Field | Value |
|---|---|
| **ID** | F-008 |
| **Severity** | P3 (Low — Maintenance risk) |
| **Route** | Backend |
| **Component** | `backend/src/` (Mongoose models) |
| **Status** | Open |

**Description:**  
Mongoose models exist in the backend but are never called from active routes. PostgreSQL via `pg` is the active ORM. Dead code creates confusion and could be accidentally re-activated.

**Fix:** Remove Mongoose models and `mongoose` dependency in a follow-up PR.

---

## New Test Files Added

| File | Tests | Purpose |
|---|---|---|
| `tests/e2e/security.spec.ts` | 17 tests | Auth enforcement, CSRF, injection, cookie flags, headers |
| `tests/e2e/time-travel.spec.ts` | 14 tests | +1d/+7d/+30d/+90d date simulation |
| `tests/e2e/a11y-all-routes.spec.ts` | 30+ tests | axe for all owner routes + modals + layout |
| `tests/e2e/performance.spec.ts` | 12 tests | LCP/FCP/TTFB metrics + API resilience |

**Helper additions to `tests/e2e/helpers.ts`:**
- `mockDate(page, isoString)` — Date Proxy override for time-travel
- `mockDatePlusDays(page, days)` — convenience wrapper
- `fetchHeaders(page, url)` — read response headers from page context
- `collectPerfMetrics(page)` — FCP/LCP/TTFB via Performance API

---

## Playwright Integration Guide

### Install dependencies (already present):
```bash
npm install  # @axe-core/playwright already in devDependencies
```

### Run new test suites:
```bash
# Security audit
npx playwright test tests/e2e/security.spec.ts --project=desktop-chrome

# Time-travel scenarios
npx playwright test tests/e2e/time-travel.spec.ts --project=desktop-chrome

# Full accessibility audit (all routes, desktop + mobile)
npx playwright test tests/e2e/a11y-all-routes.spec.ts

# Performance baseline
npx playwright test tests/e2e/performance.spec.ts --project=desktop-chrome

# All new tests together
npx playwright test tests/e2e/security.spec.ts tests/e2e/time-travel.spec.ts tests/e2e/a11y-all-routes.spec.ts tests/e2e/performance.spec.ts
```

### Backend time-shift (seed data):
```bash
# Not yet supported — add --shiftDays flag to seed-fake-data.mjs for backend date shifting
node scripts/seed-fake-data.mjs  # current: generates relative dates
```

---

## Acceptance Criteria for Production Promotion

| Criterion | Threshold | Status |
|---|---|---|
| No critical axe violations | 0 | ⚪ Pending (run a11y tests) |
| No P0 regressions | 0 | 🟡 F-000 fixed — verify pass |
| Visual diffs within tolerance | ≤ 3% pixel ratio | 🟢 Configured in playwright.config.ts |
| LCP desktop 4G | < 2500ms | ⚪ Pending baseline run |
| API TTFB critical paths | < 500ms | ⚪ Pending baseline run |
| API failure — graceful UI | Yes | ⚪ Pending test run |
| CSRF protection active | 403 on missing token | 🟡 Fixed — verify pass |
| Auth guards on all mutations | 401 on no session | 🟢 API-route-level guards in place |

---

## Role Checklist

### Engineering Council (20)

- [x] Auth guards verified: `requireOwnerSession()` on all owner API routes
- [x] CSRF double-submit cookie: middleware now active (F-000 fixed)
- [x] DOM semantics / ARIA: axe spec created — run and fix violations
- [x] API contract tests: existing regression-bugs.spec.ts covers billing/tenant contracts
- [ ] Admin/super-admin smoke tests: write and merge (F-007, P2)
- [ ] File upload security: S3/Cloudinary migration (F-001, P1)
- [ ] Billing live mode: Razorpay integration (F-002, P1)
- [ ] Remove dead Mongoose code (F-008, P3)
- [ ] Run all new test suites; fix any failures

### Design Council (5)

- [ ] Review `a11y-all-routes.spec.ts` failures for visual vs. semantic issues
- [ ] Verify interactive states (hover, focus, active, disabled) on all form inputs
- [ ] Confirm `prefers-reduced-motion` support (animations in OwnerShell ambient glows)
- [ ] Approve or reject visual regression baselines after F-000 middleware fix (CSRF change may affect page load order → snapshots may differ)
- [ ] Color contrast audit (currently disabled in axe tests with `disableRules(["color-contrast"])`)

### PM Council (5)

- [ ] Confirm billing flow acceptance criteria with live Razorpay stub (F-002)
- [ ] Validate edge cases: tenant move-out date before move-in, zero-rent tenant, duplicate tenant ID
- [ ] Confirm time-travel test scenarios match product requirements for overdue escalation
- [ ] Sign off on admin route smoke test scope (F-007)
- [ ] Verify notifications page shows correct overdue copy (not just "overdue" text)

### Management Council (3)

- [ ] Assign P1 owners and set SLA deadlines: F-001 (file uploads), F-002 (billing)
- [ ] Approve test suite run as gate for next deploy
- [ ] Schedule Razorpay integration sprint

### Executive Council / CEO (1)

- [ ] **P0 closed (F-000):** CSRF middleware fix verified by CI pass
- [ ] **P1 scheduled (F-001, F-002):** File upload security and billing live mode have owners and ETAs
- [ ] **P2 addressed:** Accessibility, time-travel, and performance test suites committed
- [ ] Final promotion decision: **HOLD** until P0 CI pass + P1 items have confirmed dates

---

## Remediation Backlog (Priority Order)

| # | ID | Severity | Item | Owner | ETA |
|---|---|---|---|---|---|
| 1 | F-000 | P0 | CSRF middleware — FIXED, verify CI | Eng | Done |
| 2 | F-001 | P1 | File upload → S3/Cloudinary | Eng Backend | 5d |
| 3 | F-002 | P1 | Billing live mode Razorpay wiring | Eng Payments | 8d |
| 4 | F-003 | P2 | Run a11y tests, fix violations | Eng Frontend + Design | 2–4d |
| 5 | F-007 | P2 | Admin/super-admin smoke tests | Eng QA | 1d |
| 6 | F-004 | P2 | Run time-travel tests, fix failures | Eng QA | 1d |
| 7 | F-005 | P2 | Run API resilience tests, fix failures | Eng Frontend | 1d |
| 8 | F-006 | P3 | Establish performance baselines | Eng SRE | 0.5d |
| 9 | F-008 | P3 | Remove dead Mongoose code | Eng Backend | 0.5d |

---

*Report generated: 2026-05-07 by Expert Council Audit (claude-sonnet-4-6)*
