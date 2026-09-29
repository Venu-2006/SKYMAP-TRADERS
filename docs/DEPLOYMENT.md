# Deployment guide

Production topology:

| Piece | Host | Notes |
|---|---|---|
| Frontend (Next.js) | Vercel | Root directory `frontend` |
| API (Express) | Railway | Root directory `backend`, uses `backend/Dockerfile` |
| PostgreSQL | Railway Postgres **or** Supabase | Any Postgres 14+ |
| Images | Cloudinary | Product photos, avatars |
| Payments | Razorpay | Wired up in the Checkout module (phase 7) |

## 1. Database

**Railway:** add a PostgreSQL service to the project and copy its `DATABASE_URL`.

**Supabase:** under Project Settings → Database, copy the **connection pooling** URI (port 6543) and append `?pgbouncer=true&connection_limit=1`. Put the direct URI (port 5432) in `DIRECT_URL` and add `directUrl = env("DIRECT_URL")` to the `datasource` block in `schema.prisma`, so migrations bypass the pooler.

## 2. API on Railway

1. New service → Deploy from GitHub repo → set **Root Directory** to `backend`. Railway detects the Dockerfile.
2. Set the variables from `backend/.env.example`. In production:
   - `NODE_ENV=production`
   - `CORS_ORIGINS=https://your-domain.com,https://your-project.vercel.app`
   - `CLIENT_URL=https://your-domain.com` (used in email links)
   - Generate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` with
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
3. Deploy. The container runs `prisma migrate deploy` on start.
4. Seed once from your machine: `DATABASE_URL=<prod url> npm run prisma:seed -w backend`, then **immediately change the admin password**. You can set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to avoid the defaults.
5. Health check path: `/health`. API docs are served at `/api/docs`.

> **Cookies across sites:** the refresh cookie is `SameSite=None; Secure` in production, so the API must be served over HTTPS. For the most robust setup, put the API on a subdomain of the storefront (for example `api.your-domain.com`); Safari's tracking prevention can block third-party cookies on `*.up.railway.app`.

## 3. Frontend on Vercel

1. Import the repo and set **Root Directory** to `frontend` (framework: Next.js).
2. Environment variables:
   - `NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1`
   - `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same as backend>`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER=91XXXXXXXXXX`
3. Deploy. The build does not need the API to be reachable; pages that are pre-rendered fill in through ISR on the first request.

## 4. Google Sign-In

Google Cloud Console → APIs & Services → Credentials → **OAuth client ID (Web)**:
- Authorized JavaScript origins: `http://localhost:3000`, `https://your-domain.com`
- Use the client ID for both `GOOGLE_CLIENT_ID` (API) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (web).

## 5. Email (SMTP)

Any SMTP provider works (Gmail app password, Amazon SES, Resend SMTP, Brevo). If `SMTP_HOST` is empty, the API logs emails to the console instead, which is handy in development.

## 6. Cloudinary

Copy the cloud name, API key and secret from the Cloudinary dashboard into the API variables. Uploads go to the `skymap/products` and `skymap/avatars` folders.

## Production checklist

- [ ] Strong, unique JWT secrets
- [ ] `CORS_ORIGINS` lists only your real domains
- [ ] Seeded admin password changed
- [ ] HTTPS on both frontend and API
- [ ] Database backups enabled (Railway / Supabase point-in-time recovery)
- [ ] Razorpay switched from test to live keys (phase 7)
