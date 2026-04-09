# Tenant Management System

Next.js tenant and hostel management app with the current owner dashboard UI, local Next API routes for the frontend workflows, and an Express backend scaffold kept in `backend/`.

## Local Development

Install dependencies:

```bash
npm install
```

Run frontend and backend together:

```bash
npm run dev:full
```

Main app:

- Frontend: `http://localhost:3000`
- Express API (Render backend): `https://hostel-backend-qa1e.onrender.com`

For normal frontend development and Vercel-parity local testing, use:

```bash
npm run dev
```

## Production Commands

Build the Next.js app:

```bash
npm run build
```

Start the Next.js frontend:

```bash
npm run start
```

Start the Express backend separately:

```bash
npm run start:api
```

## Environment

Create a local env file from `.env.example` and provide:

```env
MONGODB_URI=your-mongodb-uri
API_PORT=4000
ACCESS_TOKEN_SECRET=your-long-random-access-secret
REFRESH_TOKEN_SECRET=your-long-random-refresh-secret
SUPER_ADMIN_NAME=Platform Admin
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=change-me
CORS_ORIGIN=http://localhost:3000
BACKEND_URL=https://hostel-backend-qa1e.onrender.com
NEXT_PUBLIC_API_URL=https://hostel-backend-qa1e.onrender.com
VITE_API_URL=https://hostel-backend-qa1e.onrender.com
REACT_APP_API_URL=https://hostel-backend-qa1e.onrender.com
REDIS_URL=redis://127.0.0.1:6379
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxx
```

There are no hardcoded credentials. Create users via backend bootstrap/env and the auth APIs.

## Admin Billing Razorpay (Backend)

Razorpay is wired for **admin billing invoices only** (not tenant payments):

- `POST /api/admin/razorpay/create-order` (super_admin only)
- `POST /api/admin/razorpay/webhook` (signature-verified callback)

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` to enable it.

## Vercel Deployment

This project root is ready to deploy on Vercel as a Next.js app.

- Root directory: project root
- Framework preset: `Next.js`
- Build command: `npm run build`

Important:

- The Next.js frontend and app routes deploy cleanly on Vercel.
- The Express backend inside `backend/` is not the runtime used by Vercel for the frontend deployment.
- If you need the standalone Express backend in production, deploy it separately on a VPS, Railway, Render, or a similar Node host.
- Add `SUPER_ADMIN_USERNAME` (or `SUPER_ADMIN_EMAIL`) and `SUPER_ADMIN_PASSWORD` in Vercel project environment variables for admin login.

## Notes

- `src/app` is the active Next.js app directory.
- Local backup folders from the source project were not copied into this project.
- The UI and core logic were preserved while fixing build and deployment blockers.
