# Error Catalog — PG/Hostel Tenant Management System

> **Scope:** Next.js frontend API layer (demo/local mode) + Express backend (live mode).
> All status codes and messages are drawn directly from source code as of the current revision.
> Demo mode uses an in-memory store; live mode proxies to the Express backend.

---

## 1. Hostel CRUD — Create / Update (`POST /api/owner-hostels`, `PUT /api/owner-hostels/[id]`)

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| H-01 | Missing hostel name | `hostelName` is absent or empty string after trim | 400 | `Please complete hostel name, address, and at least one room.` |
| H-02 | Missing address | `address` is absent or empty string after trim | 400 | `Please complete hostel name, address, and at least one room.` |
| H-03 | No rooms provided | `rooms` array is absent or length === 0 | 400 | `Please complete hostel name, address, and at least one room.` |
| H-04 | Room missing roomNumber | Any room has empty `roomNumber` after trim | 400 | `Each room must have a valid room number and capacity.` |
| H-05 | Room bedCount = 0 | `bedCount` is 0, falsy, or < 1 | 400 | `Each room must have a valid room number and capacity.` |
| H-06 | Room bedCount missing | `bedCount` field absent from room object | 400 | `Each room must have a valid room number and capacity.` |
| H-07 | Hostel not found (live, PUT) | `id` param does not match any hostel for this owner | 404 | `Hostel not found.` |
| H-08 | Unauthenticated request | Session cookie absent or invalid | 401 | `Unauthorized.` |
| H-09 | Rate limit exceeded | > configured req/window, only in non-PLAYWRIGHT_TEST environments | 429 | `Too many requests. Try again later.` |
| H-10 | Invalid JSON body | Body cannot be parsed as JSON | 400 | `Invalid request body.` |
| H-11 | GET non-existent hostel | `GET /api/owner-hostels/[id]` with unknown id (demo mode) | 404 | `Hostel not found.` |

**Notes:**
- `type` defaults to `"PG"` when absent or invalid (no error thrown).
- Duplicate room numbers are not validated at the API layer; duplicates are stored as-is.
- Backend (`hostelCreateSchema`) additionally requires either `rooms` or `floors` via `.refine()`; that check fires for live mode requests.

---

## 2. Tenant Create — (`POST /api/tenants`)

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| T-01 | Missing fullName | `fullName` absent or empty string | 400 | `Name and payment details are required.` |
| T-02 | Missing paidOnDate | `paidOnDate` absent or empty string | 400 | `Name and payment details are required.` |
| T-03 | Non-finite monthlyRent | `monthlyRent` is NaN or Infinity | 400 | `Name and payment details are required.` |
| T-04 | Negative monthlyRent | `monthlyRent` < 0 | 400 | `Name and payment details are required.` |
| T-05 | Negative rentPaid | `rentPaid` < 0 | 400 | `Name and payment details are required.` |
| T-06 | Negative advanceAmount | `advanceAmount` < 0 | 400 | `Advance and service fee must be valid amounts.` |
| T-07 | Negative serviceFeeAmount | `serviceFeeAmount` < 0 | 400 | `Advance and service fee must be valid amounts.` |
| T-08 | monthlyRent > 10,000,000 | `monthlyRent` exceeds 10M | 400 | `Rent amount cannot exceed 10,000,000.` |
| T-09 | rentPaid > 10,000,000 | `rentPaid` exceeds 10M | 400 | `Rent amount cannot exceed 10,000,000.` |
| T-10 | advanceAmount > 10,000,000 | `advanceAmount` exceeds 10M | 400 | `Rent amount cannot exceed 10,000,000.` |
| T-11 | serviceFeeAmount > 10,000,000 | `serviceFeeAmount` exceeds 10M | 400 | `Rent amount cannot exceed 10,000,000.` |
| T-12 | Invalid email format | `email` present but fails regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | 400 | `Invalid email address.` |
| T-13 | Invalid dateOfBirth format | `dateOfBirth` present but not `YYYY-MM-DD` | 400 | `Date of birth must be YYYY-MM-DD.` |
| T-14 | Invalid paidOnDate format | `paidOnDate` present but not `YYYY-MM-DD` | 400 | `Payment date must be YYYY-MM-DD.` |
| T-15 | Room assign fails (demo) | `assignTenantRoom` throws (bed not available, hostel not found, etc.) | 400 | Error message from store (e.g. `"Selected bed is not available."`) |
| T-16 | Unauthenticated request | Session cookie absent or invalid | 401 | `Unauthorized.` |
| T-17 | Invalid JSON body | Body cannot be parsed | 400 | `Invalid request body.` |
| T-18 | Missing hostelId (live mode) | `hostelId` absent when `session.isLive === true` | 400 | `Choose a hostel before creating the tenant.` |
| T-19 | Idempotency key conflict | Same `X-Idempotency-Key` header reused with different payload | 409 | `Idempotency key reused with different payload.` |
| T-20 | Rate limit exceeded | > configured req/window | 429 | `Too many requests. Try again later.` |

**Notes on `billingCycle`:**
- The API does NOT reject unknown values for `billingCycle`. Any value that is not `"daily"` or `"weekly"` silently defaults to `"monthly"`. There is no 400 for `"yearly"`.
- `phone` has no length or format validation in the Next.js POST handler. The backend Zod schema validates `\d{10,15}` for live mode.

---

## 3. Room Assignment — (`POST /api/tenants/assign-room`)

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| A-01 | Missing tenantId | `tenantId` absent | 400 | `Please choose hostel, room, and move-in date.` |
| A-02 | Missing hostelId | `hostelId` absent | 400 | `Please choose hostel, room, and move-in date.` |
| A-03 | Missing roomNumber | `roomNumber` absent | 400 | `Please choose hostel, room, and move-in date.` |
| A-04 | Missing moveInDate | `moveInDate` absent | 400 | `Please choose hostel, room, and move-in date.` |
| A-05 | Non-existent tenantId (demo) | `tenantId` not found in in-memory store | 400 | `Tenant not found.` |
| A-06 | Non-existent hostel (demo) | `hostelId` not found in owner hostel inventory | 400 | `Hostel room inventory not found.` |
| A-07 | Non-existent room (demo) | `roomNumber` not found in hostel's rooms | 400 | `Selected room was not found.` |
| A-08 | Bed already occupied (demo PG) | All beds in the room are taken (occupiedBedIds covers all) | 400 | `Selected bed is not available.` |
| A-09 | Double-booking same bed (demo) | Specific `bedId` already occupied by another tenant | 400 | `Selected bed is not available.` |
| A-10 | Unit already occupied (RESIDENCE) | RESIDENCE unit already has one active tenant | 400 | `Selected unit is already occupied.` |
| A-11 | Tenant already assigned (demo) | Tenant has active assignment to different hostel/room/bed | 400 | `Tenant already has an active allocation. Clear the existing assignment before reassigning.` |
| A-12 | Non-existent tenant (live) | Backend 404 for tenant lookup | 404 | `Tenant not found.` |
| A-13 | Bed already occupied (live) | Backend 409 for bed conflict | 409 | `Selected bed is already occupied.` |
| A-14 | Tenant already allocated (live) | Backend 409 for duplicate allocation | 409 | `Tenant already has an active allocation.` |
| A-15 | Unauthenticated request | Session cookie absent | 401 | `Unauthorized.` |
| A-16 | Rate limit exceeded | > configured req/window | 429 | `Too many requests. Try again later.` |
| A-17 | Invalid JSON body | Body cannot be parsed | 400 | `Invalid request body.` |

**Double-booking behaviour in demo mode:**
When two tenants are both assigned to the same `bedId` in the same room, the `assignTenantRoom` function in `tenantStore.ts` builds `occupiedBedIds` from all existing tenant assignments. The second assignment for an already-occupied `bedId` will throw `"Selected bed is not available."` → the API returns **400**. The demo store DOES prevent double-booking at the bed level.

---

## 4. Payment — (`POST /api/tenants/pay-rent`)

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| P-01 | Missing tenantId | `tenantId` absent or empty | 400 | `Tenant, payment amount, payment mode, and paid date are required.` |
| P-02 | Missing paidOnDate | `paidOnDate` absent or empty | 400 | `Tenant, payment amount, payment mode, and paid date are required.` |
| P-03 | Non-finite amount | `amount` is NaN | 400 | `Tenant, payment amount, payment mode, and paid date are required.` |
| P-04 | Negative amount | `amount` < 0 | 400 | `Tenant, payment amount, payment mode, and paid date are required.` |
| P-05 | Missing paymentMethod | `paymentMethod` absent or empty | 400 | `Tenant, payment amount, payment mode, and paid date are required.` |
| P-06 | Amount > 10,000,000 | `amount` exceeds 10M | 400 | `Payment amount cannot exceed 10,000,000.` |
| P-07 | Invalid paidOnDate format | Does not match `YYYY-MM-DD` | 400 | `Payment date must be YYYY-MM-DD.` |
| P-08 | Non-existent tenant (demo) | `tenantId` not in store | 400 | `Tenant not found.` |
| P-09 | Invalid paymentMethod (demo) | Not `"cash"` or `"online"` | 400 | `Select a valid payment mode.` |
| P-10 | Non-demo owner in demo session | `session.isDemo && session.ownerId !== "demo-owner"` | 403 | `Forbidden.` |
| P-11 | Proof file too large | `proofImage` > 5 MB | 400 | `Proof file too large. Maximum 5 MB.` |
| P-12 | Proof file wrong MIME | Not jpeg/png/webp/pdf | 400 | `Invalid file type. Allowed: JPEG, PNG, WebP, PDF.` |
| P-13 | Proof file magic bytes mismatch | File declared as image/png but bytes are not PNG | 400 | `File extension does not match actual file content.` |
| P-14 | Proof file unrecognized bytes | MIME is valid but bytes don't match any known format | 400 | `File content does not match an allowed format.` |
| P-15 | Unauthenticated request | Session cookie absent | 401 | `Unauthorized.` |
| P-16 | Rate limit exceeded | > configured req/window | 429 | `Too many requests. Try again later.` |

**Edge cases:**
- `amount = 0` is **allowed** (zero payment is valid per `nonnegative()` check; status 200).
- `paymentMethod = "card"` is not a recognized method in the demo store; the store throws `"Select a valid payment mode."` → 400.
- The `amount < 0` check and `!paymentMethod` check share the same conditional, so both return the same 400 message.

---

## 5. Payment Proof Upload (within `POST /api/tenants/pay-rent` with `multipart/form-data`)

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| U-01 | File exceeds 5 MB | `proofImage.size > 5 * 1024 * 1024` | 400 | `Proof file too large. Maximum 5 MB.` |
| U-02 | Disallowed MIME type | Not in `["image/jpeg","image/png","image/webp","application/pdf"]` | 400 | `Invalid file type. Allowed: JPEG, PNG, WebP, PDF.` |
| U-03 | Magic bytes unrecognized | File bytes do not match jpeg/png/webp/pdf signatures | 400 | `File content does not match an allowed format.` |
| U-04 | MIME ≠ actual bytes | Declared `image/png` but bytes are JPEG (or vice-versa) | 400 | `File extension does not match actual file content.` |
| U-05 | text/plain file | MIME `text/plain` not in allowed list | 400 | `Invalid file type. Allowed: JPEG, PNG, WebP, PDF.` |
| U-06 | Fake PNG (null bytes) | MIME `image/png`, bytes `[0x00,0x00,0x00,0x00]` — no magic match | 400 | `File content does not match an allowed format.` |

**Magic byte signatures checked (first 12 bytes):**
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47`
- WebP: `52 49 46 46 ... 57 45 42 50` (RIFF at 0, WEBP at 8)
- PDF: `25 50 44 46` (`%PDF`)

---

## 6. Vacate / Remove Tenant — (`POST /api/tenants/remove`)

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| V-01 | Missing tenantId | `tenantId` absent from body | 400 | `Tenant ID is required.` |
| V-02 | Empty tenantId string | `tenantId` is `""` after trim | 400 | `Tenant ID is required.` |
| V-03 | Non-finite refundAmount | `refundAmount` is NaN | 400 | `Refund amount must be a valid amount.` |
| V-04 | Negative refundAmount | `refundAmount` < 0 | 400 | `Refund amount must be a valid amount.` |
| V-05 | refundAmount > 10,000,000 | `refundAmount` exceeds 10M | 400 | `Refund amount must be a valid amount.` |
| V-06 | Non-existent tenant (demo) | `tenantId` not found in store → `removeTenantRecord` throws | 400 | `Tenant not found.` |
| V-07 | Double-vacate (demo) | Tenant already removed; second call finds no record | 400 | `Tenant not found.` |
| V-08 | Non-existent tenant (live) | Backend 404 from DELETE | 404 | `Tenant not found.` |
| V-09 | Invalid JSON body | Body cannot be parsed | 400 | `Invalid request body.` |
| V-10 | Unauthenticated request | Session cookie absent | 401 | `Unauthorized.` |
| V-11 | Rate limit exceeded | > configured req/window | 429 | `Too many requests. Try again later.` |

**Notes:**
- Demo mode: `removeTenantRecord` uses `Array.splice` — once removed, a second call throws because `findIndex` returns `-1`.
- Successful vacate returns **200** with `{ tenant: <removedTenant> }` in demo, or `{ tenant: <updatedTenant> }` in live.

---

## 7. Authentication — Protected Routes

| # | Error | Route | Trigger Condition | HTTP Status | Message |
|---|-------|-------|-------------------|-------------|---------|
| AUTH-01 | No session — GET tenants | `GET /api/tenants` | No session cookie / invalid session | 401 | `Unauthorized.` |
| AUTH-02 | No session — POST tenant | `POST /api/tenants` | No session cookie | 401 | `Unauthorized.` |
| AUTH-03 | No session — remove | `POST /api/tenants/remove` | No session cookie | 401 | `Unauthorized.` |
| AUTH-04 | No session — assign-room | `POST /api/tenants/assign-room` | No session cookie | 401 | `Unauthorized.` |
| AUTH-05 | No session — pay-rent | `POST /api/tenants/pay-rent` | No session cookie | 401 | `Unauthorized.` |
| AUTH-06 | No session — GET hostels | `GET /api/owner-hostels` | No session cookie | 401 | `Unauthorized.` |
| AUTH-07 | No session — POST hostel | `POST /api/owner-hostels` | No session cookie | 401 | `Unauthorized.` |
| AUTH-08 | No session — GET hostel by id | `GET /api/owner-hostels/[id]` | No session cookie | 401 | `Unauthorized.` |
| AUTH-09 | No session — PUT hostel | `PUT /api/owner-hostels/[id]` | No session cookie | 401 | `Unauthorized.` |
| AUTH-10 | Non-demo owner payment | `POST /api/tenants/pay-rent` | Demo session with `ownerId !== "demo-owner"` | 403 | `Forbidden.` |

**Notes:**
- `requireOwnerSession()` reads the session from the cookie; when `PLAYWRIGHT_TEST=true` it returns a hardcoded demo session, so 401 tests require using `credentials: "omit"` or a fresh context without the session cookie.
- The 401 check is the very first thing in every route handler, so no body parsing occurs before it.

---

## 8. Hostel Validation — Room-level Errors (Backend Zod Schema, Live Mode Only)

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| HV-01 | bedCount = 0 | `bedCount` coerced to 0 (fails `.positive()`) | 400 | Zod validation error (backend middleware) |
| HV-02 | Negative bedCount | `bedCount` < 0 | 400 | Zod validation error |
| HV-03 | roomNumber missing from schema | `roomNumber` min(1) fails | 400 | Zod validation error |
| HV-04 | Neither rooms nor floors | Both absent → `.refine()` fails | 400 | `"Either rooms or floors is required."` |
| HV-05 | Empty rooms array | `z.array(roomItemSchema).min(1)` fails for live `floors[0].rooms` | 400 | Zod validation error |
| HV-06 | name > 160 chars | Hostel name exceeds max | 400 | Zod validation error |
| HV-07 | address > 280 chars | Address exceeds max | 400 | Zod validation error |

**Notes:**
- Frontend validation fires **before** the Zod check. In demo mode, `bedCount < 1` → 400 from the Next.js handler (`"Each room must have a valid room number and capacity."`). In live mode, the Zod schema on the backend enforces `.positive()` again.
- Duplicate room numbers: not validated by either layer. Duplicates are accepted and stored.

---

## 9. Tenant Update — (`PATCH /api/tenants/[id]` or via PUT on backend)

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| TU-01 | Empty fullName on PATCH | Backend Zod `tenantUpdateSchema` requires `min(1)` when key is present | 400 | Zod validation error (live only) |
| TU-02 | Invalid email on PATCH | Email field fails regex | 400 | Zod validation error (live only) |
| TU-03 | Tenant not found | `id` param doesn't match any active tenant for owner | 404 | `Tenant not found.` |
| TU-04 | Concurrent edit conflict | `expectedUpdatedAt` doesn't match current `updated_at` | 409 | `This record was updated by another session. Please refresh and try again.` |
| TU-05 | Hostel not found (live) | `hostel_id` in patch doesn't exist for this owner | 404 | `Hostel not found for this owner.` |
| TU-06 | Invalid billingCycle | Not `"daily"/"weekly"/"monthly"` — backend Zod `.enum()` | 400 | Zod validation error (live only) |
| TU-07 | Unauthenticated request | Session cookie absent | 401 | `Unauthorized.` |

**Notes:**
- In demo mode, `PATCH /api/tenants/[id]` is not a standard Next.js route. Profile updates go through the `updateTenantProfile` store function which only throws `"Tenant not found."` for an unknown ID.
- The `tenantUpdateSchema` is marked `.strict()`, so any extra unknown keys in the PATCH body cause a Zod error in live mode.

---

## 10. Rate Limiting

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| RL-01 | POST /api/tenants | > N requests per window | 429 | `Too many requests. Try again later.` |
| RL-02 | POST /api/tenants/remove | > N requests per window | 429 | `Too many requests. Try again later.` |
| RL-03 | POST /api/tenants/assign-room | > N requests per window | 429 | `Too many requests. Try again later.` |
| RL-04 | POST /api/tenants/pay-rent | > N requests per window | 429 | `Too many requests. Try again later.` |
| RL-05 | POST /api/owner-hostels | > N requests per window | 429 | `Too many requests. Try again later.` |
| RL-06 | PUT /api/owner-hostels/[id] | > N requests per window | 429 | `Too many requests. Try again later.` |

**IMPORTANT:** Rate limiting is **disabled** when `PLAYWRIGHT_TEST=true` (all test suites). The guard is:
```
if (process.env.PLAYWRIGHT_TEST !== "true" && apiRateLimit(getTrustedClientIp(request))) {
```
Rate limit tests **cannot** be executed in the standard Playwright test environment. To test rate limiting, run without `PLAYWRIGHT_TEST=true`.

---

## 11. Idempotency

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| ID-01 | Key reused with different payload | Same `X-Idempotency-Key` header, different JSON body (demo only) | 409 | `Idempotency key reused with different payload.` |
| ID-02 | Key replay (same payload) | Same key + same payload → returns cached response | (same as original) | (same as original response body) |

**Scope:** Only applies to `POST /api/tenants` in demo/local mode. Key is owner-scoped. Keys expire after 60 seconds, max 500 keys cached.

---

## 12. Signup / Registration (Backend — Live Mode Only)

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| SU-01 | Invalid signup key | Key not found in `signup_keys` | 404 | `Invalid signup link.` |
| SU-02 | Already-used key | Key status is not `"active"` | 410 | `This signup link has already been used. Ask admin to generate a new one.` |
| SU-03 | Email already registered | Owner with same email exists | 409 | `An account with this email already exists.` |
| SU-04 | Phone already registered | Owner with same phone exists | 409 | `Phone number already registered.` |
| SU-05 | Invalid email format | Zod `z.string().email()` fails | 400 | Zod validation error |
| SU-06 | Password too short | `password.length < 8` | 400 | Zod validation error |
| SU-07 | Password too long | `password.length > 128` | 400 | Zod validation error |
| SU-08 | Invalid phone format | Not matching `/^\d{10,15}$/` | 400 | Zod validation error |

---

## Summary Table by HTTP Status

| Status | Count | Categories |
|--------|-------|------------|
| 400 | ~40+ | All validation errors, missing fields, invalid formats |
| 401 | 9 | All unauthenticated routes |
| 403 | 1 | Non-demo owner attempting payment in demo session |
| 404 | 5 | Hostel not found, tenant not found, invalid signup key |
| 409 | 4 | Bed/unit conflict, tenant already allocated, concurrent edit, idempotency conflict |
| 410 | 2 | Signup key already used |
| 429 | 6 | Rate limit (disabled in PLAYWRIGHT_TEST mode) |

---

*Last updated: 2026-06-09 | Source: Next.js API routes + Express backend controllers*

---

---

# Extended Error Catalog — Human, System, Network, Calculation & Edge Case Errors

> **Scope:** Additional 500+ error scenarios covering human data-entry mistakes, infrastructure failures,
> network faults, calculation edge cases, race conditions, and boundary conditions.
> Sections 13–28 supplement the core API errors above.

---

## 13. Human Data-Entry Errors

### 13A. Name & Identity Fields

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| HE-01 | Name is only whitespace | `fullName = "   "` (all spaces) — trims to empty | 400 `Name and payment details are required.` |
| HE-02 | Name with only emoji | `fullName = "🏠🏠🏠"` — no letters | Backend Zod `min(1)` passes (non-empty); stored as-is, no error |
| HE-03 | Name with HTML tags | `fullName = "<script>alert(1)</script>"` | Stored as literal string; no XSS — React escapes on render |
| HE-04 | Name with SQL injection | `fullName = "'; DROP TABLE tenants;--"` | Stored via parameterized query; no injection possible |
| HE-05 | Name with null character | `fullName = "John\x00Doe"` | PostgreSQL rejects null byte in text — backend 500 unless sanitized |
| HE-06 | Name with zero-width space | `fullName = "John​Doe"` — visually "JohnDoe" | Stored including invisible char; search won't find "JohnDoe" |
| HE-07 | Name with leading/trailing spaces | `fullName = "  Ravi Kumar  "` | Stored with spaces unless trimmed; search by exact name fails |
| HE-08 | Name exactly 1 character | `fullName = "A"` | Valid — no minimum length > 1 enforced |
| HE-09 | Name with 500 characters | `fullName` = 500-char string | Backend `varchar` limit may truncate or reject |
| HE-10 | Name with mixed RTL+LTR | Arabic mixed with English in same string | Stored correctly; display may have BiDi rendering issues in UI |
| HE-11 | Name with Tamil Unicode | `fullName = "ராஜேஷ்"` — 6 Tamil chars | Valid; stored correctly; search must be Unicode-aware |
| HE-12 | Name with Arabic Unicode | `fullName = "محمد علي"` | Valid; stored correctly; RTL direction in some UI elements |
| HE-13 | Name with Chinese Unicode | `fullName = "张伟"` | Valid; stored correctly |

### 13B. Phone Number Errors

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| HE-14 | Phone with letters | `phone = "9876abc123"` — backend Zod `\d{10,15}` fails | 400 Zod validation error (live only) |
| HE-15 | Phone with hyphens | `phone = "98765-43210"` | 400 Zod — non-digit char fails regex |
| HE-16 | Phone with spaces | `phone = "98765 43210"` | 400 Zod — space fails regex |
| HE-17 | Phone with country code prefix | `phone = "+919876543210"` | 400 Zod — `+` not in `\d` |
| HE-18 | Phone too short | `phone = "987654321"` — only 9 digits | 400 Zod `min(10)` fails |
| HE-19 | Phone too long | `phone = "1234567890123456"` — 16 digits | 400 Zod `max(15)` fails |
| HE-20 | Phone as all zeros | `phone = "0000000000"` | Passes format check; semantically invalid but stored |
| HE-21 | Phone as empty string | `phone = ""` | Not required; stored as empty; no error |
| HE-22 | Phone with parentheses | `phone = "(98765)43210"` | 400 Zod — non-digit chars |
| HE-23 | Phone = "null" (string) | `phone = "null"` | Passes frontend; backend Zod fails on non-digit 'n','u','l','l' |

### 13C. Email Errors

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| HE-24 | Email without @ | `email = "userdomain.com"` | 400 `Invalid email address.` |
| HE-25 | Email without domain | `email = "user@"` | 400 `Invalid email address.` |
| HE-26 | Email with two @ | `email = "user@@domain.com"` | 400 `Invalid email address.` |
| HE-27 | Email with spaces | `email = "user @domain.com"` | 400 `Invalid email address.` (space in local part) |
| HE-28 | Email with Unicode local part | `email = "ñoño@domain.com"` | Frontend regex may pass; backend Zod `.email()` may reject |
| HE-29 | Email with very long TLD | `email = "user@domain.museum"` | Valid — 6-char TLD allowed |
| HE-30 | Email with IP address domain | `email = "user@192.168.1.1"` | Frontend regex fails (no dot after @-separated segments) |
| HE-31 | Email with newline in it | `email = "user\ndomain.com"` | Frontend trim handles; Zod would reject |
| HE-32 | Duplicate email on re-register | Second owner signup with same email | 409 `An account with this email already exists.` |

### 13D. Date & Amount Entry Errors

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| HE-33 | Date in DD/MM/YYYY format | `paidOnDate = "09/06/2026"` | 400 `Payment date must be YYYY-MM-DD.` |
| HE-34 | Date in MM-DD-YYYY format | `paidOnDate = "06-09-2026"` | 400 `Payment date must be YYYY-MM-DD.` |
| HE-35 | Date with slashes | `paidOnDate = "2026/06/09"` | 400 `Payment date must be YYYY-MM-DD.` |
| HE-36 | Impossible date | `paidOnDate = "2026-02-30"` | Passes regex; JS `Date` coerces to March 2; stored as invalid |
| HE-37 | Date month = 13 | `paidOnDate = "2026-13-01"` | Passes `YYYY-MM-DD` regex; JS `Date` coerces; semantic error |
| HE-38 | Future payment date | `paidOnDate = "2099-01-01"` | Accepted (no future-date restriction) |
| HE-39 | Ancient payment date | `paidOnDate = "1900-01-01"` | Accepted (no past-date restriction) |
| HE-40 | Amount with comma thousands | `amount = "1,500"` — not parseable as Number | `Number("1,500")` = NaN → 400 `Enter a valid amount.` (frontend) |
| HE-41 | Amount with currency symbol | `amount = "₹1500"` | `Number("₹1500")` = NaN → 400 |
| HE-42 | Amount as empty string | `amount = ""` | Frontend: 400 `Enter the paid amount.` |
| HE-43 | Amount as string "zero" | `amount = "zero"` | `Number("zero")` = NaN → 400 |
| HE-44 | Amount with decimal precision > 2 | `amount = "1500.999"` | Accepted; stored as 1500.999; no rounding enforced |
| HE-45 | Rent as negative string | `monthlyRent = "-5000"` | Parsed to -5000 → 400 `Name and payment details are required.` |
| HE-46 | Advance as negative via form | `advanceAmount = "-1"` | 400 `Advance and service fee must be valid amounts.` |
| HE-47 | moveInDate in future (1 year) | `moveInDate = "2027-06-01"` | No validation; future date accepted |
| HE-48 | moveInDate = today | `moveInDate = "2026-06-09"` | Valid |
| HE-49 | Bed count entered as 1.5 | `bedCount = 1.5` → `Math.floor` not applied | Backend `z.coerce.number().int()` would reject non-integer |
| HE-50 | Room number with only spaces | `roomNumber = "   "` after trim = "" | 400 `Each room must have a valid room number and capacity.` |

### 13E. Workflow / Sequencing Errors

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| HE-51 | Pay rent before assigning room | Tenant has no assignment; payment submitted | Payment succeeds (no room required for payment) |
| HE-52 | Assign room to already-assigned tenant | `POST /api/tenants/assign-room` when tenant has active allocation | 400 `Tenant already has an active allocation.` |
| HE-53 | Vacate tenant who is not assigned | Vacate called on tenant with no room assignment | Backend soft-deletes successfully; room free operation is no-op |
| HE-54 | Double-click vacate submit | Two `POST /api/tenants/remove` with same tenantId in quick succession | Second call hits 400 `Tenant not found.` (first already removed) |
| HE-55 | Double-click record payment | Two `POST /api/tenants/pay-rent` with identical payload | Without idempotency key: both succeed, creating duplicate payment entries |
| HE-56 | Create hostel without rooms | Rooms array empty `[]` | 400 `Please complete hostel name, address, and at least one room.` |
| HE-57 | Create tenant without hostel selected | `hostelId` empty when live session | 400 `Choose a hostel before creating the tenant.` |
| HE-58 | Assign wrong tenant ID (typo) | `tenantId = "TNT-000X"` — X is wrong digit | 400 `Tenant not found.` |
| HE-59 | Assign to soft-deleted tenant (live) | Tenant `deleted_at IS NOT NULL` | 404 `Tenant not found.` |
| HE-60 | Pay rent for vacated tenant | Post-vacate payment attempt | 400/404 `Tenant not found.` |
| HE-61 | Chose wrong hostel for tenant | Tenant assigned to hostel A; payment sent to hostel B context | Payment recorded on correct tenant regardless of hostel context |
| HE-62 | Select bed in different room | `bedId` belongs to room B; `roomNumber` = room A | Backend bed-room ownership check; mismatch → 400 |
| HE-63 | Enter transaction ID for cash | `paymentMode = "cash"` but `txnId` provided | Accepted; txnId stored but not required for cash |
| HE-64 | Skip transaction ID for UPI | `paymentMode = "upi"` but `txnId = ""` | Frontend: 400 `Transaction ID is required for non-cash payments.` |
| HE-65 | Upload receipt for cash payment | No restriction on receipt upload for cash | Receipt stored regardless of payment mode |

---

## 14. System Errors (Database & Infrastructure)

| # | Error | Trigger Condition | HTTP Status | Message / Behavior |
|---|-------|-------------------|-------------|-------------------|
| SY-01 | DB connection refused | PostgreSQL down / `PGHOST` unreachable | 500 | Backend unhandled: `ECONNREFUSED` stack trace in logs |
| SY-02 | DB connection pool exhausted | All `pg.Pool` connections in use; `pool.query` times out | 500 | `query queue is full` from pg; backend returns 500 |
| SY-03 | DB query timeout | `statement_timeout` exceeded (default none; set via `pg.Pool`) | 500 | `canceling statement due to statement timeout` |
| SY-04 | DB authentication failure | Wrong `PGPASSWORD` env var | 500 | `password authentication failed for user` |
| SY-05 | DB SSL required but not configured | Render PostgreSQL forces SSL; `ssl: false` in pool config | 500 | `SSL SYSCALL error: EOF detected` |
| SY-06 | DB disk full | PostgreSQL cannot write WAL or heap | 500 | `could not extend file: No space left on device` |
| SY-07 | DB read replica lag | Stale read returns outdated tenant record after fast create | 200 with stale data | Client sees outdated assignment status |
| SY-08 | Deadlock on concurrent updates | Two transactions update same tenant row | 500 | `ERROR: deadlock detected` → pg rolls back one transaction |
| SY-09 | Row-level lock timeout | `FOR UPDATE NOWAIT` on locked row | 500/409 | `could not obtain lock on row in relation "tenants"` |
| SY-10 | Transaction commit failure | Network drop between `COMMIT` and client ack | Uncertain | Client receives timeout; server committed; double-apply risk |
| SY-11 | JSONB column too large | `data` column > 1 GB (unlikely but possible with large files) | 500 | PostgreSQL `value too long for type character varying` |
| SY-12 | Sequence overflow (bigint) | `tenant_id_seq` wraps after 9.2 × 10^18 values | 500 | `integer out of range` |
| SY-13 | DB migration pending | Schema deployed but migration not run; missing column | 500 | `column "vacate_info" does not exist` |
| SY-14 | Duplicate key on hostel insert | Two simultaneous hostels with same PK (UUID collision) | 500 | `duplicate key value violates unique constraint` (astronomically rare) |
| SY-15 | Foreign key violation | Insert allocation for non-existent tenant_id | 500 | `insert or update on table "allocations" violates foreign key constraint` |
| SY-16 | Not-null violation | Backend code passes `NULL` to non-nullable column | 500 | `null value in column "hostel_id" violates not-null constraint` |
| SY-17 | Table not found | Wrong DB schema / missing migration | 500 | `relation "tenants" does not exist` |
| SY-18 | pg pool destroyed | Server restart while queries in flight | 500 | `Cannot use a pool after calling end on the pool` |
| SY-19 | Memory limit exceeded | Node.js process OOM on Render free tier | 503/restart | Process killed; Render restarts container; requests fail mid-flight |
| SY-20 | CPU throttling | Render free tier CPU burst limit; slow responses | Timeout/504 | Requests time out waiting for slow query |
| SY-21 | Environment variable missing | `DATABASE_URL` not set on Render | 500 | `TypeError: Cannot read properties of undefined (reading 'host')` |
| SY-22 | JWT_SECRET missing | `process.env.JWT_SECRET` undefined for token signing | 500 | `secretOrPrivateKey must have a value` |
| SY-23 | Render cold start | Backend spun down after 15 min idle; first request fails | 502/504 | Client timeout ~30s; second request succeeds |
| SY-24 | Render deploy in progress | New deploy replacing old container | 502 | `Bad Gateway` during blue-green swap |
| SY-25 | File system permission denied | Upload directory not writable | 500 | `EACCES: permission denied, open '/tmp/uploads/...'` |
| SY-26 | Temp directory full | `/tmp` partition exhausted on server | 500 | `ENOSPC: no space left on device` |
| SY-27 | Process SIGTERM during request | Render scales down mid-request | Connection drop | TCP RST; client gets `ECONNRESET` |
| SY-28 | Clock skew | Server clock ahead/behind; token `iat` in future | 401 | `jwt issued in the future` |
| SY-29 | Bcrypt hash error | Password hash fails due to invalid rounds config | 500 | `bcrypt.hash` rejects with error |
| SY-30 | Node.js version mismatch | `package.json` engine requirement not met on server | 500 | Syntax errors from unsupported language features |

---

## 15. Network & Request Errors

| # | Error | Trigger Condition | HTTP Status | Behavior |
|---|-------|-------------------|-------------|----------|
| NE-01 | Frontend fetch timeout | `fetch()` default no-timeout + slow backend response | Network error | `AbortError` or browser cancels; UI shows spinner forever |
| NE-02 | 504 Gateway Timeout | Backend request > Render/Vercel proxy timeout (30s) | 504 | `Gateway Timeout`; frontend receives HTML error page, JSON parse fails |
| NE-03 | 502 Bad Gateway | Upstream backend crashes mid-request | 502 | Frontend JSON parse fails on HTML error response |
| NE-04 | 503 Service Unavailable | Render starting new deployment | 503 | Frontend JSON parse fails |
| NE-05 | Connection refused | Backend process crashed; port not listening | Network error | `fetch` rejects with `ECONNREFUSED` |
| NE-06 | DNS resolution failure | Backend domain unreachable | Network error | `fetch` rejects with `EAI_AGAIN` or `ENOTFOUND` |
| NE-07 | SSL/TLS handshake failure | Expired or self-signed cert on backend | Network error | `SSL handshake failed`; fetch rejects |
| NE-08 | Partial response body | TCP connection cut during JSON streaming | Network error | `SyntaxError: Unexpected end of JSON input` in frontend |
| NE-09 | Partial file upload | Connection cut while uploading receipt image | Network error | Server receives incomplete multipart body; upload fails |
| NE-10 | CORS preflight rejected | Backend missing `Access-Control-Allow-Origin` header | CORS error | Browser blocks request; no HTTP status received |
| NE-11 | CORS origin mismatch | Frontend at different domain than CORS whitelist | CORS error | Browser blocks; `CORS policy: blocked` |
| NE-12 | Request body too large | `Content-Length` exceeds `express.json({ limit: "10mb" })` | 413 | `PayloadTooLargeError: request entity too large` |
| NE-13 | Multipart boundary missing | Malformed FormData without boundary header | 400 | `Bad Request: multipart parse error` |
| NE-14 | Content-Type mismatch | Sending JSON as `text/plain` to endpoint expecting JSON | 400 | Express body parser skips body; missing fields trigger validation error |
| NE-15 | Double-submit race | Fast user submits form twice before first request returns | 2× success or 409 | Idempotency key prevents duplicate tenants if key sent; no key = duplicate |
| NE-16 | Vercel function timeout | Next.js API route > 10s (Hobby) or 60s (Pro) | 504 | Vercel kills function; returns 504 to client |
| NE-17 | Vercel edge cache stale | Stale CDN cache serves old 200 for deleted tenant | 200 | UI shows deleted tenant until cache expires |
| NE-18 | ISP throttling | Slow upload on large file | Timeout | File upload > 30s triggers gateway timeout |
| NE-19 | Mobile network switch | User switches Wi-Fi → 4G mid-upload | Network error | Fetch cancelled; file upload incomplete |
| NE-20 | Proxy strips headers | Corporate proxy removes `Cookie` header | 401 | Session lost; `Unauthorized` |
| NE-21 | HTTP → HTTPS redirect loop | Misconfigured redirect; frontend stuck | Network error | Browser shows `ERR_TOO_MANY_REDIRECTS` |
| NE-22 | Large response body | Fetching all tenants for large hostel (1000+) | Slow/timeout | Frontend receives full array; no pagination; may OOM |
| NE-23 | Keep-alive connection timeout | Idle TCP connection closed by proxy mid-session | Network error | Next request on same connection fails; `ECONNRESET` |
| NE-24 | IPv6 / IPv4 mismatch | Backend listening only on IPv4; client connects IPv6 | Network error | `ECONNREFUSED` |
| NE-25 | HTTP/2 push conflict | Browser receives PUSH for stale resource | Stale data | Cached push conflicts with fresh fetch result |

---

## 16. Calculation & Business Logic Errors

### 16A. Billing Cycle & Due Date

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| CA-01 | nextDueDate off by 1 day | Monthly billing from Jan 31 → Feb 28/29 edge case | `addMonths` must handle month-end correctly; Feb 31 = Mar 3 is wrong |
| CA-02 | Weekly billing: 4 weeks vs 28 days | Weekly cycle adds 7 days; 4 payments ≠ 1 month | After 4 weeks, due date = 28 days from anchor, not month-end |
| CA-03 | Daily billing overflow in 31-day month | 31 daily payments = 31 × dailyRate; may not equal monthlyRent | Floating point: `monthlyRent / 31 * 31` ≠ `monthlyRent` |
| CA-04 | Billing anchor date drift | `billingAnchor = day 31`; February has no day 31 | Next due in Feb = Feb 28; March returns to Mar 31 |
| CA-05 | Leap year Feb 29 anchor | Tenant joins Feb 29, 2024; billing anchor = 29 | 2025 has no Feb 29; system must handle gracefully |
| CA-06 | DST transition in daily billing | Clock springs forward 1 hour; day is 23 hours | `addDays` using timestamps may skip/double a day |
| CA-07 | nextDueDate in past on creation | `paidOnDate` = today; `nextDueDate` should be 1 month ahead | If calculation reverses rent/paidDate order, due date = yesterday |
| CA-08 | nextDueDate not updating after payment | Payment recorded but `nextDueDate` not advanced | Tenant appears perpetually overdue |
| CA-09 | Monthly billing cycle from month with 31 to month with 30 | `moveInDate = 2026-03-31`; next = `2026-04-30` (not Apr 31) | Standard: clamp to last day of shorter month |
| CA-10 | Timezone offset in due date calc | Server in UTC; owner in IST (+5:30); date boundary | `2026-06-09T23:00:00Z` = `2026-06-10` in IST; wrong cycle |

### 16B. Balance & Amount Calculations

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| CA-11 | pendingBalance not initialized | Tenant created with `rentPaid = 0`, `monthlyRent = 5000` | `pendingBalance = 5000 - 0 = 5000`; confirmed correct |
| CA-12 | pendingBalance goes negative (overpayment) | Tenant pays ₹10000 against ₹5000 rent | `pendingBalance = 5000 - 10000 = -5000`; UI shows credit |
| CA-13 | advanceBalance mismatch post-refund | Refund ₹5000 from ₹3000 advanceBalance | `advanceBalance - 5000 = -2000`; system should reject or warn |
| CA-14 | Discount reducing rent to negative | `monthlyRent = 500`, `discountAmount = 600` | `effectiveRent = -100`; no guard → negative rent possible |
| CA-15 | Discount > 100% of rent | `discountPercent = 110%` | `effectiveRent = -0.1 × rent`; no cap enforced |
| CA-16 | Floating-point sum error | `0.1 + 0.2 = 0.30000000000000004` in JS | Use `Math.round(amount * 100) / 100` or integer paise arithmetic |
| CA-17 | Service fee added to rent balance | `pendingBalance = monthlyRent + serviceFee` — wrong if fee is one-time | Service fee should not recur monthly |
| CA-18 | Double-counting advance in balance | `advanceAmount` subtracted from first month rent AND stored separately | Balance could be double-reduced |
| CA-19 | Partial payment deferred balance wrong | Pay ₹3000 against ₹5000; deferred = ₹2000 | `deferred = monthlyRent - amount = 2000`; if `pendingBalance` not updated → ₹2000 still shows as pending |
| CA-20 | Refund amount > original advance | `refundAmount = 15000` when `advanceAmount = 10000` | No validation; stored as 15000; `advanceBalance` = -5000 |
| CA-21 | Tax/GST added on top of capped amount | 18% GST on ₹10,000,000 rent = ₹11,800,000 | Exceeds per-field cap; if tax added post-validation, stored over 10M |
| CA-22 | Prorated rent for partial first month | Tenant joins June 15; first month = 15/30 × rent | System does not prorate; full rent charged for partial month |
| CA-23 | rentPaid > monthlyRent on creation | Tenant paid ₹6000 for ₹5000 rent | `pendingBalance = 5000 - 6000 = -1000` (credit); valid |
| CA-24 | Integer overflow in large rent * months | `10_000_000 × 12 = 120_000_000` | JS Number handles; PostgreSQL `numeric` handles; no overflow |
| CA-25 | advanceAmount = 0 refund path | Vacate with `advanceAmount = 0`; refund checkbox checked | `refundAmount` accepted as 0; `vacateInfo.advanceRefundAmount = 0` |

### 16C. Reporting & Aggregation

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| CA-26 | Admin vacated report: wrong date filter | `period = "daily"` uses `DATE(vacated_at) = CURRENT_DATE` | Timezone mismatch: UTC midnight ≠ IST midnight; some records missing |
| CA-27 | Total advance refunded sum overflow | Sum of all refunds across all tenants | PostgreSQL `SUM(numeric)` handles; JS `reduce` may lose precision for very large sums |
| CA-28 | Count off by 1 in period filter | `>= start AND < end` vs `>= start AND <= end` | Boundary tenant (vacated exactly at period start) may be excluded |
| CA-29 | Weekly report span: Mon–Sun vs last 7 days | "This week" ambiguous: calendar week or rolling 7 days | Confirm definition and test boundary tenant on Sunday 23:59 |
| CA-30 | Report period "all" missing old records | `deleted_at IS NOT NULL` filter correct; soft-deleted rows included | If `WHERE deleted_at IS NULL` accidentally kept, vacated tenants excluded |

---

## 17. File & Upload System Errors

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| FU-01 | Zero-byte file | Upload file with size = 0 | 400 | Magic bytes check fails — no bytes to read |
| FU-02 | File renamed to bypass type check | `malware.exe` renamed `receipt.jpg` | 400 | Magic bytes `4D 5A` (MZ header) = EXE; not in allowed list |
| FU-03 | Double extension | `invoice.pdf.jpg` — OS shows as `.jpg` | 400 | MIME detected from bytes, not extension; bytes determine rejection |
| FU-04 | Path traversal in filename | `filename = "../../etc/passwd"` | 400/safe | multer sanitizes filename; stored under UUID; not vulnerable |
| FU-05 | Very long filename | `filename` = 4096 chars | 400 | OS `ENAMETOOLONG`; handled by multer or OS reject |
| FU-06 | Filename with null bytes | `filename = "receipt\x00.jpg"` | 400 | OS rejects null in path; multer error |
| FU-07 | Concurrent uploads collision | Two uploads simultaneously with same target path | One overwrites other | Using UUID-based filenames prevents collision |
| FU-08 | PDF with embedded JavaScript | PDF passes magic bytes but contains `<script>` | 200 | Stored as-is; served to admin — XSS risk in PDF viewer |
| FU-09 | HEIC image format | `image/heic` — iOS default photo format | 400 | Not in allowed MIME list → `Invalid file type` |
| FU-10 | TIFF image format | `image/tiff` | 400 | Not in allowed MIME list |
| FU-11 | BMP image format | `image/bmp` | 400 | Not in allowed MIME list |
| FU-12 | GIF image | `image/gif` — magic `GIF87a`/`GIF89a` | 400 | Not in allowed MIME list |
| FU-13 | SVG file | `image/svg+xml` | 400 | Not in allowed list; also XSS risk |
| FU-14 | Corrupt JPEG | Valid magic bytes `FF D8 FF` but truncated data | 200 | Passes validation; stored; may fail to render in browser |
| FU-15 | Corrupt PDF | `%PDF` header but truncated body | 200 | Passes magic byte check; stored; PDF viewer errors on open |
| FU-16 | Image with EXIF geolocation | Valid JPEG with GPS EXIF metadata | 200 | Stored with EXIF; privacy leak if served publicly |
| FU-17 | File upload during offline | FormData submitted while offline | Network error | Fetch fails; file not uploaded; form submit aborted |
| FU-18 | Upload after session expired | Receipt upload succeeds but parent form submit gets 401 | 401 | Payment not recorded; file orphaned on server |
| FU-19 | Unlink failure on error | Upload succeeds, but downstream error occurs; file not cleaned | 500 | Orphaned temp file; temp dir fills over time |
| FU-20 | S3/storage unavailable (live) | If backend uses S3 for proof storage; S3 returns 503 | 500 | File upload fails; payment recorded without proof |

---

## 18. Race Conditions & Concurrency

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| RC-01 | Bed double-booking | Two users submit assign-room for same bed within milliseconds | First commit wins; second gets `"Selected bed is already occupied."` 409 |
| RC-02 | Signup key double-use | Two registrations submit same signup key simultaneously | DB `UPDATE SET status = 'used' WHERE status = 'active'` is atomic; one wins, other gets 410 |
| RC-03 | Payment double-submit | Double-click on "Record Payment" before first completes | Two identical payment rows inserted; balance double-deducted |
| RC-04 | Vacate while payment in progress | Vacate request arrives while payment is still being committed | Payment may complete on now-deleted tenant; `deleted_at` set but payment row inserted |
| RC-05 | Concurrent profile edits | Two browser tabs edit same tenant profile simultaneously | `expectedUpdatedAt` optimistic lock → second save gets 409 |
| RC-06 | Hostel update during tenant create | Owner edits rooms while `POST /api/tenants` reads room inventory | Demo mode: in-memory store; read-then-write not atomic; stale room may be used |
| RC-07 | Parallel hostel creates | Two hostels submitted simultaneously for same owner | Both succeed with different IDs; no conflict |
| RC-08 | Room re-assignment mid-payment | Room assigned to tenant A; payment for tenant A records; same room re-assigned to B | Payment references tenant A's original room; no conflict (tenant-level payment) |
| RC-09 | Vacate then immediate re-add | Same person vacated and added as new tenant simultaneously | Two records created (one soft-deleted, one new); no conflict |
| RC-10 | Session cookie used from two devices | Owner logs in from mobile and desktop; both use same session | Both work; mutations from either device succeed; may overwrite each other |

---

## 19. Authentication & Session Edge Cases

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| SE-01 | Session expired mid-operation | Cookie `maxAge` elapsed while form open | 401 | `Unauthorized.` — user must re-login |
| SE-02 | Session tampered | Cookie value modified by user | 401 | `Unauthorized.` — iron-session decryption fails |
| SE-03 | Session cookie deleted manually | User clears cookies in DevTools mid-flow | 401 | Next request fails auth check |
| SE-04 | Admin token used on owner route | Admin JWT sent to `GET /api/owner-hostels` | 403/401 | `requireRoles("owner")` rejects admin token |
| SE-05 | Owner token used on admin route | Owner JWT sent to `GET /api/admin/tenants/vacated` | 403 | `requireRoles("super_admin")` rejects |
| SE-06 | JWT with wrong algorithm | `alg: "none"` or `alg: "HS256"` vs expected `RS256` | 401 | `invalid algorithm` |
| SE-07 | JWT signature invalid | Payload tampered; signature doesn't match | 401 | `invalid signature` |
| SE-08 | JWT `iss` claim mismatch | Token issued by different service | 401 | `jwt issuer invalid` |
| SE-09 | JWT expired | `exp` in past | 401 | `jwt expired` |
| SE-10 | JWT `nbf` in future | Token not yet valid | 401 | `jwt not active` |
| SE-11 | CSRF attack via form submit | Third-party site submits form to API | 401/403 | SameSite cookie policy blocks; or CSRF token mismatch |
| SE-12 | Refresh token replay | Stolen refresh token used after owner logs out | 401 | Token rotation: old refresh token invalidated on use |
| SE-13 | Admin accessing owner's hostel data | Admin directly calls `GET /api/owner-hostels` with owner session | 200 | Admin has own session; would see empty (no hostels for admin ownerId) |
| SE-14 | Wrong password attempt | `POST /api/auth/login` with wrong password | 401 | `Invalid credentials.` |
| SE-15 | Account not found on login | Email not in `owners` table | 401 | `Invalid credentials.` (deliberate: don't reveal account existence) |
| SE-16 | Owner account deactivated (future) | `status = "deactivated"` on owner record | 401 | `Account deactivated. Contact admin.` |
| SE-17 | Session shared across incognito | Incognito opens app; gets fresh session | New demo session | No cross-contamination; iron-session is per-cookie |
| SE-18 | Multiple sessions same owner | Owner logged in on 3 devices | All work | No single-session enforcement; all tokens valid until expiry |

---

## 20. Data Integrity & Consistency Errors

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| DI-01 | Orphaned allocation | Tenant vacated; `allocations` row not cleaned | `DELETE` from `allocations WHERE tenant_id = $1` in `deleteTenant`; must be present |
| DI-02 | Orphaned payment rows | Tenant vacated; payment rows still exist | By design: payment history preserved after vacate |
| DI-03 | Hostel deleted with active tenants | Owner deletes hostel while tenants assigned | Should be prevented or cascade properly |
| DI-04 | Room JSONB inconsistency | `data.rooms[0].bedCount = 2` but `beds` array has 3 items | `normalizeRoom` uses `bedCount` to rebuild beds array; extra bed lost |
| DI-05 | Bed label mismatch | `beds[0].label = "Bed 3"` when it should be "Bed 1" | Label is display-only; assignment uses `bed.id`; mismatch causes UI confusion |
| DI-06 | Tenant `advanceBalance` > `advanceAmount` | Refund logic error adds instead of subtracts | Negative validation needed: `refundAmount <= advanceBalance` |
| DI-07 | Negative `pendingBalance` without credit display | Overpayment creates negative balance; UI shows negative number | UI should show "Credit: ₹X" instead of "Pending: ₹-X" |
| DI-08 | Assignment without matching hostel room | `tenantId` assigned to `bedId` that no longer exists in hostel | After hostel room edit, old bedId invalid; assignment shows "Unassigned" |
| DI-09 | Duplicate room numbers in hostel | Two rooms both named "101" | Both stored; assign-room picker shows two "101" options; ambiguous |
| DI-10 | Tenant hostelId not matching assignment hostelId | `tenant.hostelId = "H1"` but `assignment.hostelId = "H2"` | Data inconsistency; payment recorded on H1 tenant; room shown from H2 |
| DI-11 | `nextDueDate` not updated after payment | `recordTenantPayment` updates `pendingBalance` but not `nextDueDate` | Tenant appears overdue perpetually |
| DI-12 | Soft-deleted tenant still in allocations | `deleted_at` set; `allocations` row not deleted | Bed appears occupied; new tenant cannot be assigned |
| DI-13 | Duplicate payments same minute | Two identical payments within 1 minute (no idempotency key) | Both stored; ledger shows double entry; balance doubly-reduced |
| DI-14 | vacateInfo missing moveOutDate | Vacate API called without `settlementDate` | `moveOutDate` = null in DB; admin report shows blank vacated-on date |
| DI-15 | advanceBalance not initialized | `advanceBalance` field absent from tenant record | `tenant.advanceBalance ?? tenant.advanceAmount ?? 0` fallback used correctly |

---

## 21. Frontend / UI State Errors

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| UI-01 | Stale TanStack Query cache | Payment recorded; UI not invalidated; old balance shown | `invalidateQueries` must be called in `onSuccess` |
| UI-02 | Modal opened with null tenant | `PaymentCollectionModal` rendered with `tenant = null` | Guard `if (!tenant) return null` prevents render |
| UI-03 | Form not reset after modal close | Modal closed; reopened for different tenant; old values shown | `useEffect([tenant])` resets fields on tenant change |
| UI-04 | Double-mount in StrictMode | React 18 StrictMode mounts twice; `useEffect` fires twice | Idempotent effects only; state initializers not side-effectful |
| UI-05 | Portal renders before DOM ready | `createPortal(…, document.body)` on SSR | `mounted` state guard: `useEffect(() => setMounted(true), [])` |
| UI-06 | Body scroll not restored | `useLockBodyScroll` sets `overflow: hidden`; modal closes but hook not cleaned | `useEffect` cleanup restores `overflow: ''` on unmount |
| UI-07 | Infinite loading after network error | Fetch fails; `setLoading(false)` not called in catch | Spinner never stops; user stuck |
| UI-08 | Toast not shown on success | `toast()` called before `onClose()`; component unmounted | Toast system must survive component unmount |
| UI-09 | File input not reset after cancel | User selects file, cancels, reopens; old file still selected | `receiptInputRef.current.value = ""` needed on cancel |
| UI-10 | `amount` field shows "NaN" | `tenant.monthlyRent` is `undefined`; `String(undefined)` = `"undefined"` | `String(tenant?.monthlyRent ?? 0)` needed |
| UI-11 | Date input shows wrong locale | `[color-scheme:dark]` CSS for date picker; locale formatting varies | Browser-native date picker uses system locale; cannot be fully controlled |
| UI-12 | Vacate confirm checkbox hidden on small screen | Sticky footer overlaps checkbox on iPhone SE (375px) | `pb-[max(12px,env(safe-area-inset-bottom))]` + page scroll (not modal) needed |
| UI-13 | Back button mid-submission | User presses browser back while vacate submitting | Navigation interrupts fetch; tenant may be vacated but user sees old page |
| UI-14 | Form resubmit on refresh | POST form; F5; browser warns "Resubmit?" | Forms use JS submit (no native `<form action>`); no resubmit risk |
| UI-15 | React hydration mismatch | Server renders tenant list; client has different length | `suppressHydrationWarning` or deferred render needed |
| UI-16 | Router push during render | `router.push()` called inside `useEffect` sync | Deferred to effect: no issue. Calling in render = error |
| UI-17 | `useQueryClient` outside provider | `useQueryClient()` called without `QueryClientProvider` | `Error: No QueryClient set` |
| UI-18 | `params.id` undefined | Dynamic route not matched; `useParams` returns `{}` | `params.id` = `undefined`; tenant lookup returns null; shows skeleton |
| UI-19 | Negative displayed balance | `pendingBalance = -500`; UI shows `Pending: ₹-500` | Should display as `Credit: ₹500` |
| UI-20 | Assignment modal shows occupied beds as green | `normalizeRoom` drops `occupied` flag from bed | Fixed in `src/utils/hostel-occupancy.ts` by preserving `occupied` |

---

## 22. Admin-Specific Errors

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| AD-01 | Non-super_admin accessing vacated API | `GET /api/admin/tenants/vacated` with `role = "owner"` | 403 | `Forbidden` |
| AD-02 | Invalid period filter | `?period=quarterly` — not in `["daily","weekly","monthly","all"]` | 400 | Backend returns empty results or 400 depending on validation |
| AD-03 | Admin vacated API — no results | Valid period; no tenants vacated in that window | 200 | `{ count: 0, totalAdvanceRefunded: 0, tenants: [] }` |
| AD-04 | Admin viewing hostel of deleted owner | Owner account deactivated; hostels still in DB | 200 | Records returned if FK not cascaded |
| AD-05 | Admin generating key for existing email | Signup key created for owner email already registered | 200 | Key created; owner registers → 409 on email conflict |
| AD-06 | Admin bulk export large dataset | `GET /api/admin/tenants/vacated?period=all` with 10,000+ rows | Slow/timeout | Need pagination or streaming for large result sets |
| AD-07 | Admin shell nav item missing | `UserMinus` import missing from `admin-shell.tsx` | Build error | `Cannot find name 'UserMinus'` |
| AD-08 | Admin page 404 | Route file missing at `app/admin/(protected)/vacated-tenants/page.tsx` | 404 | Page not found |
| AD-09 | Admin token proxying owner routes | `backendFetch` called with admin token on owner-only endpoint | 403 | `requireRoles("owner")` blocks |
| AD-10 | Vacated tenants page — hostel name null | Tenant vacated from deleted hostel; JOIN returns null hostel name | 200 | UI should handle `hostelName = null` gracefully |

---

## 23. Boundary & Edge Case Values

### 23A. Numeric Boundaries

| # | Field | Boundary Value | Expected Behavior |
|---|-------|----------------|-------------------|
| BC-01 | monthlyRent | 0 | Valid; `pendingBalance = 0`; tenant owes nothing |
| BC-02 | monthlyRent | 1 | Valid minimum non-zero rent |
| BC-03 | monthlyRent | 9,999,999 | Valid; under cap |
| BC-04 | monthlyRent | 10,000,000 | Valid; exactly at cap |
| BC-05 | monthlyRent | 10,000,001 | 400 `Rent amount cannot exceed 10,000,000.` |
| BC-06 | monthlyRent | Infinity | 400 (non-finite check) |
| BC-07 | monthlyRent | -Infinity | 400 (negative check) |
| BC-08 | advanceAmount | 0 | Valid; no advance collected |
| BC-09 | advanceAmount | 10,000,000 | At cap; valid |
| BC-10 | advanceAmount | 10,000,001 | 400 `Rent amount cannot exceed 10,000,000.` |
| BC-11 | bedCount | 1 | Valid minimum |
| BC-12 | bedCount | 100 | Valid; 100 beds per room allowed |
| BC-13 | bedCount | 0 | 400 |
| BC-14 | bedCount | -1 | 400 |
| BC-15 | payment amount | 0 | Valid (zero payment allowed) |
| BC-16 | payment amount | 0.01 | Valid minimum non-zero |
| BC-17 | payment amount | 10,000,000 | At cap; valid |
| BC-18 | payment amount | 10,000,000.01 | 400 |
| BC-19 | refundAmount | 0 | Valid; no refund given |
| BC-20 | refundAmount | advanceAmount + 1 | No validation; stored; `advanceBalance` goes negative |

### 23B. String Boundaries

| # | Field | Boundary Value | Expected Behavior |
|---|-------|----------------|-------------------|
| BC-21 | fullName | 1 character | Valid |
| BC-22 | fullName | 255 characters | Valid if column allows |
| BC-23 | fullName | 256 characters | DB `varchar(255)` truncates or rejects |
| BC-24 | hostelName | 1 character | Valid |
| BC-25 | hostelName | 160 characters | At backend Zod max; valid |
| BC-26 | hostelName | 161 characters | 400 Zod validation error (live) |
| BC-27 | address | 280 characters | At backend Zod max; valid |
| BC-28 | address | 281 characters | 400 Zod validation error (live) |
| BC-29 | roomNumber | 1 character | Valid |
| BC-30 | roomNumber | 20 characters | Valid |
| BC-31 | txnId | empty string, non-cash | 400 `Transaction ID is required` |
| BC-32 | txnId | 100 characters | Valid; stored as-is |
| BC-33 | password | 7 characters | 400 Zod `min(8)` |
| BC-34 | password | 8 characters | Valid minimum |
| BC-35 | password | 128 characters | At max; valid |
| BC-36 | password | 129 characters | 400 Zod `max(128)` |

### 23C. Date Boundaries

| # | Field | Boundary Value | Expected Behavior |
|---|-------|----------------|-------------------|
| BC-37 | paidOnDate | "2000-01-01" | Valid; no past-date restriction |
| BC-38 | paidOnDate | "2099-12-31" | Valid; no future-date restriction |
| BC-39 | moveInDate | same as paidOnDate | Valid |
| BC-40 | noticeGivenDate | null | Valid; stored as null; report shows blank |
| BC-41 | noticeGivenDate | future date | Accepted; no validation on notice-in-future |
| BC-42 | dateOfBirth | "2026-06-09" (today) | Valid; no age validation |
| BC-43 | dateOfBirth | "1900-01-01" | Valid; no ancient-date restriction |
| BC-44 | billingAnchor | day 29 in Feb lease | System must handle month-end clamping |
| BC-45 | paidOnDate | "2026-02-29" (non-leap) | `YYYY-MM-DD` regex passes; `new Date()` gives Mar 1; stored incorrectly |

---

## 24. Locale & Internationalization Errors

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| L-01 | Amount formatted with Indian locale | `(10000).toLocaleString("en-IN") = "10,000"` — parsed as NaN | Display only; raw number stored; no parse-from-display needed |
| L-02 | Hindi numerals in amount field | User types `१५०० ` (Hindi digits) | `Number("१५००")` = NaN → 400 |
| L-03 | Arabic numerals in date | Date picker returns "٢٠٢٦-٠٦-٠٩" | Browser date input always returns ISO format regardless of locale |
| L-04 | RTL text in LTR input | Arabic name in left-aligned text field | CSS `dir="auto"` needed for correct cursor behavior |
| L-05 | Emoji in hostel name | `hostelName = "🏠 Home PG"` | Valid; stored; displayed correctly in React |
| L-06 | Newline in tenant name | `fullName = "John\nDoe"` | Stored with newline; displayed as single line (no `<br>`) |
| L-07 | Tab character in address | `address = "12 Main\tSt"` | Stored; displayed with visible gap in UI |
| L-08 | Non-breaking space in name | `fullName = "John Doe"` | Stored; search for "John Doe" (regular space) won't match |
| L-09 | Currency symbol in rent field | `monthlyRent = "₹5000"` — prefixed by symbol | `Number("₹5000")` = NaN → 400 |
| L-10 | Thousands separator difference | European `1.500` vs Indian `1,500` vs US `1,500` | `Number("1.500")` = 1.5 → wrong rent; UI must strip separators |

---

## 25. Playwright Test-Environment-Specific Errors

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| PW-01 | Rate limiting in tests | `PLAYWRIGHT_TEST` not set; rate limiter active | All mutation tests fail after ~5 requests |
| PW-02 | Test isolation: shared demo store | Two parallel test workers mutate same demo store | Tests interfere; use `test.describe.serial` or separate contexts |
| PW-03 | Backend cold start in tests | Live mode tests; Render backend asleep | First test times out; need `beforeAll` warm-up request |
| PW-04 | `page.waitForURL` never fires | Navigation doesn't happen after button click | Test hangs until timeout; check that `router.push` is being called |
| PW-05 | File upload in headless | `page.setInputFiles()` with large file in CI | May succeed or fail depending on CI disk; use <1MB fixture |
| PW-06 | Date input incompatibility | `page.fill('[type=date]', '2026-06-09')` | Some browsers need `page.type` for date inputs |
| PW-07 | Hydration race | Test clicks button before React hydration complete | `click()` before `waitForLoadState('networkidle')` → no-op |
| PW-08 | Flaky `waitForResponse` | Network response arrives before `waitForResponse` registered | Always register listener before triggering action |
| PW-09 | Auth cookie missing in new page | New `browser.newPage()` doesn't inherit cookies | Use `browser.newContext({ storageState })` to share auth |
| PW-10 | `data-testid` mismatch | Test selects `[data-testid="vacate-confirm"]` but attribute is `"vacate-confirm-checkbox"` | Test fails with element not found; must sync testids with actual code |

---

## 26. Multi-Hostel & Ownership Boundary Errors

| # | Error | Trigger Condition | HTTP Status | Message |
|---|-------|-------------------|-------------|---------|
| MH-01 | Owner A accesses Owner B's hostel | `GET /api/owner-hostels/[id]` with cross-owner ID | 404 | `Hostel not found.` (ownership filter hides it) |
| MH-02 | Owner A pays rent for Owner B's tenant | `POST /api/tenants/pay-rent` with tenantId from another owner | 400 | `Tenant not found.` (ownership filter) |
| MH-03 | Owner A vacates Owner B's tenant | `POST /api/tenants/remove` cross-owner | 400/404 | `Tenant not found.` |
| MH-04 | Owner A assigns room in Owner B's hostel | `POST /api/tenants/assign-room` cross-owner hostelId | 400 | `Hostel room inventory not found.` |
| MH-05 | Tenant moved between owner A and B hostels | `PATCH` tenant updates `hostelId` to cross-owner hostel | 404 | `Hostel not found for this owner.` |
| MH-06 | Owner with 0 hostels creates tenant | No hostel exists; `hostelId` selection is empty | 400 | `Choose a hostel before creating the tenant.` |
| MH-07 | Owner assigns tenant to hostel with full capacity | All beds occupied across all rooms | 400 | `Selected bed is not available.` (or all beds shown as occupied) |
| MH-08 | Hostel has 1 room, 1 bed | Single bed assigned and occupied | 400 | Second tenant cannot be assigned; only bed occupied |
| MH-09 | Owner edits hostel reducing bed count | Existing tenant assigned to bed 3; room updated to 2 beds | Bed 3 reference becomes orphaned | UI shows assignment; room picker shows only 2 beds |
| MH-10 | Hostel room type changed mid-assignment | Room type changed from PG to RESIDENCE; existing multi-bed tenant stays | Existing tenant unaffected; new assignments follow RESIDENCE rules |

---

## 27. Cleanup & State Reset Errors

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| CR-01 | Demo store not reset between tests | Test creates tenant; next test expects empty store | `beforeEach` must call store reset endpoint or use fresh session |
| CR-02 | In-memory idempotency cache stale | Idempotency key cached from prev test; replay returns wrong response | Keys expire after 60s; tests must use unique keys per test |
| CR-03 | TanStack Query cache stale across tests | `queryClient.clear()` not called between test pages | Old tenant data shown from previous test |
| CR-04 | Body scroll lock not removed | Test closes modal programmatically; `overflow: hidden` remains | `useLockBodyScroll` cleanup must fire on unmount |
| CR-05 | Uploaded file not cleaned on test teardown | Test uploads receipt; server file persists | Test `afterEach` should clean `/tmp/uploads/` |
| CR-06 | DB rows not cleaned after live test | Live-mode test creates real tenants in production DB | Tests must use dedicated test hostelId and clean up with `afterAll` |
| CR-07 | Open database transactions | Test times out mid-transaction; connection returned with active txn | pg pool recycles connections; orphan txn rolls back automatically |
| CR-08 | React state not cleaned between tests | `useState` from prior test leaks into next mount | React unmounts between navigation; state reset confirmed |

---

## 28. Miscellaneous & Operational Errors

| # | Error | Trigger Condition | Expected Behavior |
|---|-------|-------------------|-------------------|
| OP-01 | Log pollution with PII | `console.log(tenant)` logs phone/email to server logs | Remove PII from logs; use structured logging |
| OP-02 | Error message reveals DB schema | `"column 'xxx' does not exist"` leaked to client | Catch all DB errors; return generic 500 message |
| OP-03 | Stack trace in API response | Unhandled `asyncHandler` error forwarded to Express default handler | `errorMiddleware` must catch and return `{ message: "Internal server error." }` |
| OP-04 | CORS wildcard in production | `Access-Control-Allow-Origin: *` allows any origin | Lock CORS to specific Vercel domain in production |
| OP-05 | No request ID in logs | Hard to trace specific request failure in logs | Add `X-Request-Id` header; log with each entry |
| OP-06 | Render free tier sleep | Backend sleeps after 15 min idle; first request slow | Implement keep-alive ping or upgrade to paid tier |
| OP-07 | Vercel preview deploy wrong env | Preview uses wrong `BACKEND_URL` pointing to old backend | Verify env vars per environment in Vercel dashboard |
| OP-08 | Missing `PLAYWRIGHT_TEST=true` in CI | Tests run rate-limited; many fail | CI `env` must include `PLAYWRIGHT_TEST=true` |
| OP-09 | Demo mode payments lost on server restart | In-memory store flushed on Node.js restart | Expected behavior for demo mode; document for users |
| OP-10 | Health check endpoint missing | `GET /health` not present; Render can't verify backend is up | Add `app.get('/health', (req, res) => res.json({ status: 'ok' }))` |
| OP-11 | No graceful shutdown | `SIGTERM` kills process; in-flight requests dropped | `process.on('SIGTERM')` should drain connections |
| OP-12 | Missing 404 catch-all route | Unknown backend routes return Express default HTML | Add `app.use('*', (req, res) => res.status(404).json({ message: 'Not found.' }))` |
| OP-13 | Sensitive env vars in Next.js client bundle | `NEXT_PUBLIC_` prefix exposes backend URL or API key | Never use `NEXT_PUBLIC_` for secrets |
| OP-14 | Stale deployment on Vercel | DNS still pointing to old deployment | `vercel --prod` ensures production alias updated |
| OP-15 | Memory leak in demo store | In-memory arrays grow unbounded if tenants never cleaned | Demo store should have max-size guard |

---

## Extended Summary by Error Category

| Category | Section(s) | Error Count |
|----------|-----------|-------------|
| Core API Errors (original) | 1–12 | ~100 |
| Human Data-Entry Errors | 13 | 65 |
| System / DB / Infrastructure | 14 | 30 |
| Network & Request | 15 | 25 |
| Calculation & Business Logic | 16 | 30 |
| File & Upload | 17 | 20 |
| Race Conditions | 18 | 10 |
| Auth & Session | 19 | 18 |
| Data Integrity | 20 | 15 |
| Frontend / UI State | 21 | 20 |
| Admin-Specific | 22 | 10 |
| Boundary & Edge Cases | 23 | 45 |
| Locale & i18n | 24 | 10 |
| Playwright Test Environment | 25 | 10 |
| Multi-Hostel / Ownership | 26 | 10 |
| Cleanup & State Reset | 27 | 8 |
| Operational | 28 | 15 |
| **TOTAL** | **All** | **~441 new + ~100 original = ~541** |

---

*Extended: 2026-06-09 | Covers human error, system failure, network fault, calculation edge cases, race conditions, boundary values, auth edge cases, data integrity, UI state, admin, i18n, Playwright specifics, multi-hostel boundaries, and operational concerns.*
