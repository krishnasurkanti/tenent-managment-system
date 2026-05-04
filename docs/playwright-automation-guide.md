# Playwright Automation Guide

This project now has beginner-friendly Playwright tests for the hostel owner and super-admin flows.

## What It Checks

- Owner demo login.
- Dashboard on desktop and mobile viewports.
- Rooms, payments, and notification pages.
- Adding a tenant with generated test data.
- Recording rent payment with generated transaction data.
- Super-admin login and access-management page.
- Deep seeded data integrity: 10 extra hostels, 10 rooms per hostel, 2-3 tenants per hostel, occupied/vacant beds, all tenant identity/contact/emergency/payment fields, daily/weekly/monthly billing states, cross-hostel isolation, and ghost tenant error paths.

## Commands

Reload clean fake hostel tenant data:

```bash
npm run seed:fake
```

Install Playwright browser binaries once:

```bash
npx playwright install
```

Run all desktop and mobile automation:

```bash
npm run test:e2e
```

Run with the browser visible:

```bash
npm run test:e2e:headed
```

Open the Playwright UI runner:

```bash
npm run test:e2e:ui
```

Open the last HTML report:

```bash
npm run test:e2e:report
```

## How It Runs

Playwright starts the Next.js app automatically at:

```text
http://localhost:3000
```

If your app is already running there, Playwright reuses it.

It runs the same tests in two projects:

- `desktop-chrome`
- `mobile-chrome`

The owner tests use the built-in demo workspace button. The super-admin test reads credentials from `.env.local`.

## When A Test Fails

Playwright keeps a screenshot, video, and trace for failures. Run:

```bash
npm run test:e2e:report
```

Then open the failed test and inspect the screenshot or trace. This is usually the easiest way to learn what happened.
