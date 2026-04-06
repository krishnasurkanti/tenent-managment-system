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
- Express API (local backend scaffold): `http://localhost:4000`

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
JWT_SECRET=your-jwt-secret
API_PORT=4000
ADMIN_USERNAME=owneradmin
ADMIN_PASSWORD=Owner@123
```

The Next.js app login uses `ADMIN_USERNAME` and `ADMIN_PASSWORD`. If you do not set them, it falls back to:

- Username: `owneradmin`
- Password: `Owner@123`

## Vercel Deployment

This project root is ready to deploy on Vercel as a Next.js app.

- Root directory: project root
- Framework preset: `Next.js`
- Build command: `npm run build`

Important:

- The Next.js frontend and app routes deploy cleanly on Vercel.
- The Express backend inside `backend/` is not the runtime used by Vercel for the frontend deployment.
- If you need the standalone Express backend in production, deploy it separately on a VPS, Railway, Render, or a similar Node host.
- Add `ADMIN_USERNAME` and `ADMIN_PASSWORD` in Vercel project environment variables if you want custom login credentials.

## Notes

- `src/app` is the active Next.js app directory.
- Local backup folders from the source project were not copied into this project.
- The UI and core logic were preserved while fixing build and deployment blockers.
