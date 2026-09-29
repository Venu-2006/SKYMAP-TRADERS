# Deploying SKYMAP TRADERS

GitHub stores the code; it cannot run the site. GitHub Pages serves static files
only, so it can host neither the Express API nor PostgreSQL.

This guide uses three free services, all connected to the GitHub repo:

| Piece | Service | Free tier |
|---|---|---|
| Website (Next.js) | **Vercel** | Yes, generous |
| API (Express) | **Render** | Yes — sleeps after 15 min idle, ~50 s to wake |
| PostgreSQL | **Neon** | Yes, 0.5 GB |

Total cost: ₹0. Expect the first visit after an idle period to be slow while the
Render service wakes; paying for Render's Starter plan (about $7/month) removes
that.

Do the steps in order: **database → API → website → link them together**.

---

## 1. Database on Neon (5 minutes)

1. Sign up at [neon.tech](https://neon.tech) with your GitHub account.
2. Create a project — name it `skymap`, region **Singapore** (closest to India).
3. On the dashboard, open **Connection string** and copy **two** URLs:
   - **Pooled** (the default; host contains `-pooler`) → this is `DATABASE_URL`
   - **Direct** (toggle off "Connection pooling"; no `-pooler`) → this is `DIRECT_URL`

   Both look like `postgresql://user:password@host.neon.tech/neondb?sslmode=require`.
   Keep them somewhere safe for the next step.

Prisma needs both: the app runs through the pooler, while migrations need the
direct connection.

## 2. API on Render (10 minutes)

1. Sign up at [render.com](https://render.com) with GitHub and allow access to
   the `SKYMAP-TRADERS` repo.
2. **New → Blueprint**, pick the repo. Render reads [`render.yaml`](../render.yaml)
   and prepares a service called `skymap-api` (free plan, Docker, health check
   on `/health`).
3. Fill in the values it asks for:
   - `DATABASE_URL` — the **pooled** Neon URL
   - `DIRECT_URL` — the **direct** Neon URL
   - `CORS_ORIGINS` — leave as `https://localhost` for now; you will set the real
     value in step 4 once Vercel gives you a domain
   - `CLIENT_URL` — same, fill in later
   - `API_PUBLIC_URL` — `https://skymap-api.onrender.com` (adjust if you renamed
     the service)
   - The rest (Google, Cloudinary, Razorpay, SMTP) can stay empty — see
     "Optional services" in the README.

   The two JWT secrets are generated for you; you never need to see them.
4. Click **Apply**. The first build takes 3–5 minutes. On start, the container
   runs `prisma migrate deploy`, which creates every table in Neon.
5. Check it: open `https://skymap-api.onrender.com/health` — you should see
   `{"status":"ok",...}`. The API docs are at `/api/docs`.

### Seed the catalog once

From your own machine, pointing at Neon:

```bash
cd backend
DATABASE_URL="<direct Neon URL>" DIRECT_URL="<direct Neon URL>" \
SEED_ADMIN_EMAIL="you@yourdomain.com" SEED_ADMIN_PASSWORD="<a strong password>" \
npm run prisma:seed
```

On Windows PowerShell:

```powershell
cd backend
$env:DATABASE_URL="<direct Neon URL>"; $env:DIRECT_URL=$env:DATABASE_URL
$env:SEED_ADMIN_EMAIL="you@yourdomain.com"; $env:SEED_ADMIN_PASSWORD="<a strong password>"
npm run prisma:seed
```

This adds the 7 categories, brands, sample products, coupons, FAQs and your
admin account. **Set those two SEED_ variables** — otherwise you get the public
default password from the repo.

## 3. Website on Vercel (5 minutes)

1. Sign up at [vercel.com](https://vercel.com) with GitHub, then **Add New →
   Project** and import `SKYMAP-TRADERS`.
2. Set **Root Directory** to `frontend`. Vercel detects Next.js by itself.
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = `https://skymap-api.onrender.com/api/v1`
   - `NEXT_PUBLIC_SITE_URL` = your Vercel URL, e.g. `https://skymap-traders.vercel.app`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` = `917010942325`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — leave empty until you set up Google Sign-In
4. **Deploy**. Note the URL it gives you.

## 4. Point the API at the website (important)

Back in Render → `skymap-api` → **Environment**, set:

- `CORS_ORIGINS` = `https://skymap-traders.vercel.app` (add your custom domain
  too, comma-separated, no trailing slashes)
- `CLIENT_URL` = the same main URL — it is used in verification and password
  reset emails

Save; Render restarts automatically. **Until this is right, the site loads but
every API call fails** with a CORS error in the browser console.

Then set `NEXT_PUBLIC_SITE_URL` in Vercel to the same URL if you have not, and
redeploy.

## 5. Check it end to end

1. Open your Vercel URL — products should appear (first load may be slow while
   Render wakes).
2. Register an account. The verification email only prints to the Render logs
   until SMTP is configured; you can still use the site.
3. Sign in as the admin you seeded → `/admin` should show the dashboard.
4. Add to cart → checkout with Cash on Delivery → the order appears in
   `/admin/orders` and the GST invoice downloads.

---

## After it is live

**Custom domain.** In Vercel → Settings → Domains, add `skymaptraders.com` and
follow the DNS instructions. Then add the domain to `CORS_ORIGINS` and
`CLIENT_URL` on Render.

**Images.** Uploads currently save to the API's own disk, and **Render wipes that
disk on every deploy**, so product photos would disappear. Before you add real
products, set the three `CLOUDINARY_*` variables on Render — the code switches to
Cloudinary automatically.

**Payments.** Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on Render to turn on
online payments. Use test keys first; switch to live keys only after a test order
works.

**Cookies across two domains.** The site (Vercel) and API (Render) are different
domains, so the sign-in cookie is sent with `SameSite=None; Secure`. This works,
but Safari and some privacy blockers restrict third-party cookies. For the most
reliable setup, put the API on a subdomain of your own domain — in Render →
Settings → Custom Domain, add `api.skymaptraders.com`, then update
`NEXT_PUBLIC_API_URL`, `CORS_ORIGINS` and `API_PUBLIC_URL` to match.

**Keeping it awake.** Render's free service sleeps after 15 minutes idle. A free
uptime monitor (for example UptimeRobot) pinging `/health` every 10 minutes keeps
it responsive. This uses up free instance hours, so it suits a demo rather than a
busy store.

**Deploys.** Both hosts watch the repo: every `git push` to `main` redeploys the
website and the API. [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
type-checks and builds both apps first, so a broken commit is visible in GitHub
before it reaches production.

**Database migrations.** When the Prisma schema changes, run
`npx prisma migrate dev --name <what-changed>` locally and commit the generated
folder in `backend/prisma/migrations`. Render applies it on the next deploy.

## Production checklist

- [ ] Admin password changed from the seeded default
- [ ] `CORS_ORIGINS` lists only your real domains
- [ ] Cloudinary configured before real product photos are uploaded
- [ ] Razorpay live keys only after a successful test payment
- [ ] Neon backups: the free plan keeps 24 hours of history — export regularly if
      the data matters
- [ ] Test data from development deleted (sample orders, the "Test Tools Co"
      seller)
