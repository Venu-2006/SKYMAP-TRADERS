# SKYMAP TRADERS

A marketplace for electronics, industrial equipment, electrical components, safety products, tools, office supplies and construction materials. The shopping experience is inspired by Snapdeal, with GST invoicing, seller onboarding and admin tooling.

| Layer | Stack |
|---|---|
| Web | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · ShadCN-style UI · Zustand · Sonner |
| API | Node.js · Express · Zod · Swagger (OpenAPI 3) |
| Data | PostgreSQL · Prisma |
| Auth | JWT access tokens + rotating httpOnly refresh cookies · Google Sign-In |
| Services | Cloudinary (images) · Razorpay (payments) · SMTP (email) |

## Build status

| # | Module | Status |
|---|---|---|
| 1 | Folder structure | ✅ |
| 2 | Database schema (every domain) | ✅ |
| 3 | Backend setup (security, errors, docs) | ✅ |
| 4 | Frontend setup (theme, layout, UI kit) | ✅ |
| 5 | Authentication & profile | ✅ |
| 6 | Products, categories, brands, reviews, search, home page | ✅ |
| 7 | Cart (server-synced), save for later, coupons, wishlist, compare | ✅ |
| 8 | Checkout: addresses, shipping options, Razorpay + Cash on Delivery, GST invoices | ✅ |
| 9 | Orders: history, tracking timeline, cancellation (auto-refund), returns | ✅ |
| 10 | Admin panel: dashboard, orders, products, categories, inventory, customers, sellers, coupons, banners, sales reports | ✅ |
| 11 | Seller portal: registration, dashboard, products, orders, commission | ✅ |
| 12 | Contact form, FAQ, About, Privacy, Terms, WhatsApp button, referral rewards | ✅ |
| 13 | Multi-language UI (English, Hindi, Tamil, Telugu, Kannada, Marathi, Bengali) | ✅ |

The Prisma schema already covers the later modules (orders, payments, coupons, sellers, payouts, banners and more), so they won't need schema rewrites.

## Languages

The header has a language switcher covering English, हिन्दी, தமிழ், తెలుగు, ಕನ್ನಡ, मराठी and বাংলা. The choice is remembered in the browser and, for signed-in users, saved to their profile so it follows them to other devices.

Translations live in one file, [frontend/src/lib/i18n/dictionaries.ts](frontend/src/lib/i18n/dictionaries.ts). To add a phrase, add its key to the `en` dictionary (TypeScript then requires it in the others) and use it via `useT()` in a Client Component or `<T k="your.key" />` in a Server Component. English and Hindi are complete; Tamil is complete for the shopping flow; Telugu, Kannada, Marathi and Bengali cover navigation, home, product, cart and checkout basics and fall back to English elsewhere.

Product names, descriptions and specifications are shown exactly as the seller entered them and are never machine-translated. The admin panel and seller portal are English only.

## Turning on the optional services

The store works without any third-party accounts. Each service switches on as soon as you add its keys to `backend/.env` (and restart the API):

| Service | Without keys | Keys to add |
|---|---|---|
| Payments | Cash on Delivery only; online option shown as unavailable | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (test keys from dashboard.razorpay.com) |
| Images | Saved to `backend/uploads` and served by the API | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Email | Printed in the API terminal | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (e.g. Gmail + app password) |
| Google Sign-In | Button hidden | `GOOGLE_CLIENT_ID` in backend **and** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env.local` (restart both) |

GST invoices use `COMPANY_NAME`, `COMPANY_GSTIN`, `COMPANY_ADDRESS`, `COMPANY_STATE` and `COMPANY_PHONE`. CGST+SGST is applied when the delivery state matches `COMPANY_STATE`, IGST otherwise.

Local uploads are fine on one server, but container hosts such as Railway wipe the disk on redeploy, so use Cloudinary in production.

## Quick start

Prerequisites: Node 20+ and PostgreSQL 14+ (or Docker).

```bash
# 1. Database — either Docker…
docker compose up -d
# …or the bundled portable Postgres (no install needed):
#   cd .devdb && npm install && node start.mjs

# 2. API
cd backend
cp .env.example .env            # then fill in the values
npm install
npx prisma migrate dev --name init
npm run prisma:seed             # categories, brands, 10 sample products, admin user
npm run dev                     # http://localhost:4000  ·  docs at /api/docs

# 3. Web (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                     # http://localhost:3000
```

Seeded admin: `admin@skymaptraders.com` / `Admin@12345`. Change this immediately, or set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before seeding.

Without SMTP settings, verification and password-reset emails are printed to the API console so you can click the links locally.

## Folder structure

```
SKYMAP Traders/
├── docker-compose.yml              # Local Postgres
├── docs/DEPLOYMENT.md              # Vercel + Railway/Supabase guide
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma           # Complete data model
│   │   └── seed.ts
│   └── src/
│       ├── index.ts                # Server boot + graceful shutdown
│       ├── app.ts                  # Express app: middleware, routes
│       ├── config/env.ts           # Zod-validated environment
│       ├── docs/swagger.ts         # OpenAPI spec from JSDoc
│       ├── lib/                    # prisma client, cloudinary
│       ├── middleware/             # auth (JWT + RBAC), validate, security, upload, error
│       ├── utils/                  # ApiError, http helpers, tokens, mailer
│       └── modules/
│           ├── auth/               # register, login, google, refresh, verify, reset
│           ├── users/              # profile, avatar, password, addresses
│           ├── products/           # listing, search, suggest, home rails, AI recs, CRUD
│           ├── categories/         # tree, breadcrumbs, admin CRUD
│           ├── brands/
│           ├── reviews/            # ratings distribution, verified-buyer reviews
│           └── marketing/          # newsletter, banners
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx            # Home
        │   ├── (auth)/             # login, register, forgot/reset password, verify email
        │   ├── account/            # Profile management (protected)
        │   ├── products/           # Listing + filters, [slug] detail
        │   └── categories/
        ├── components/
        │   ├── ui/                 # button, input, card, dropdown, skeleton, badge…
        │   ├── layout/             # header, search autocomplete, footer, theme, WhatsApp
        │   ├── auth/               # auth shell, Google button, route guard
        │   ├── product/            # card, rail, gallery+zoom, filters, reviews, purchase panel
        │   └── home/               # hero, categories, flash sale, testimonials, newsletter
        ├── lib/                    # api client, auth api, types, validation, utils
        ├── store/                  # zustand: auth, cart
        └── hooks/
```

## Architecture notes

**Authentication**
- The access token (15 min JWT) lives only in memory, so an XSS bug can't read it from storage.
- The refresh token is a random 384-bit value in an httpOnly cookie. Only its SHA-256 hash is stored. It rotates on every refresh, and reuse of a revoked token revokes all of the user's sessions (theft detection).
- The cookie-authenticated routes (`/auth/refresh`, `/auth/logout`) require a double-submit CSRF token (`X-CSRF-Token`).
- Passwords are hashed with bcrypt (cost 12). Login compares against a dummy hash when the user doesn't exist, so response timing doesn't reveal which emails are registered. Forgot-password always returns the same response for the same reason.
- Email-verification and reset tokens are single-use, hashed and short-lived. Resetting a password signs out every device.

**API security**
- Helmet headers, a CORS allow-list and a 1 MB body limit.
- Rate limits: 300 requests per 15 min per IP overall, and 20 failed attempts per 15 min on auth routes.
- Every input is validated with Zod: unknown keys are stripped and types are coerced.
- Prisma parameterizes every query, and the one raw SQL query uses a tagged template, which is also parameterized. This protects against SQL injection.
- Role-based access control: `authorize('ADMIN', 'SELLER')`. `SUPER_ADMIN` passes every check. Sellers can only change their own products, and new listings go to `PENDING_APPROVAL`.
- Errors come back in one envelope, and stack traces are hidden in production.

**Search and AI features**
- Search is multi-term: every term must match the name, SKU, tag, brand or category. The brand and price facets are computed without their own filters, so users can widen a filter again.
- Autocomplete combines products, categories, brands and popular past queries, and supports keyboard navigation.
- **Personalized home / recommendations:** the categories the user viewed recently are weighted by recency, and the rail shows top-rated products from them that the user hasn't seen.
- **Frequently bought together:** products that appear in the same orders as this one (SQL self-join on `OrderItem`).
- **Similar** products share the category and fall within ±40% of the price. **Related** products share the brand or tags.

**Money:** prices are stored as `Decimal(12,2)` in INR, and product prices include GST. The detail page shows the tax split and the HSN code. Order lines keep snapshots of price, GST rate and HSN, ready for GST invoices.

## API overview

All routes are under `/api/v1`. The full interactive reference is at `/api/docs`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register · login · google · refresh · logout · verify-email · resend-verification · forgot-password · reset-password` |
| Users | `GET/PATCH /users/me` · `POST /users/me/avatar` · `POST /users/me/password` · `GET/POST/PATCH/DELETE /users/me/addresses` |
| Products | `GET /products` (filters) · `/products/suggest` · `/products/trending-searches` · `/products/home` · `/products/recommended` · `/products/:slug` · `/:slug/similar` · `/:slug/bought-together` · `POST /:slug/view` |
| Product mgmt | `GET /products/manage/list` · `POST /products/manage` · `PATCH/DELETE /products/manage/:id` · `POST /products/manage/:id/stock` · `POST /products/manage/images` |
| Categories | `GET /categories` (tree) · `GET /categories/:slug` · admin `POST/PATCH/DELETE` |
| Brands | `GET/POST /brands` |
| Reviews | `GET /reviews/product/:id` · `GET /reviews/latest` · `POST /reviews` · `POST /reviews/:id/helpful` · `DELETE /reviews/:id` |
| Marketing | `POST /marketing/newsletter` · `GET /marketing/banners` |

## Environment variables

See [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example). Deployment values are covered in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Scripts

| Where | Command | Purpose |
|---|---|---|
| backend | `npm run dev` | API with hot reload |
| backend | `npm run build && npm start` | Production build |
| backend | `npm run prisma:migrate` | Create/apply migrations |
| backend | `npm run prisma:seed` | Seed sample data |
| backend / frontend | `npm run typecheck` | TypeScript check |
| frontend | `npm run dev` / `build` / `start` | Next.js |
