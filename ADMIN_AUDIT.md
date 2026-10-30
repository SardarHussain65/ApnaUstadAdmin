# ApnaUstad Admin — Audit (Phase 0)

_Date: 2026-10-27. Scope: `ApnaUstadAdminWebsite/`, `ApnaUstadBackend/`, and how `ApnaUstadApp/` consumes the API._

## 1. Confirmed stack (repo is the source of truth)

| Layer | Docs said | Repo actually has |
|---|---|---|
| Admin framework | TanStack Start + Router, React 19 | ✅ `@tanstack/react-start ^1.167`, `react-router ^1.168`, React 19.2 |
| Styling | Tailwind 4, Radix | ✅ Tailwind 4.2 (`@theme inline`), Radix primitives, shadcn-style `components/ui` |
| Build | Vite 7, Nitro, Docker + Cloudflare | ✅ Vite 7 via `@lovable.dev/vite-tanstack-config`, `nitro` beta, `wrangler.jsonc`, `Dockerfile` |
| Data | TanStack Query | ✅ `@tanstack/react-query` (hooks in `src/lib/api-hooks.ts`, 1.5k lines) |
| Charts | Recharts | ✅ `recharts ^2.15` |
| Forms | RHF + Zod | Installed (`react-hook-form`, `zod`) but routes mostly use hand-rolled `useState` forms |
| Missing | — | `motion`, `@tanstack/react-table`, `@tanstack/react-virtual`, `socket.io-client` (added in Phase 1), `maplibre-gl`, `@sentry/react`, Playwright, Vitest (Vitest added) |
| Lockfiles | — | **Both** `package-lock.json` and `bun.lock` exist (bun.lock is stale). npm is used; installs need `--legacy-peer-deps` (peer clash: `@lovable.dev/vite-tanstack-config` pins vite <9 vs `@tanstack/react-start` optional vite ≥ 8). |
| Backend | Node 20, Express 5, TS, Mongoose, Zod, Socket.IO, node-cron | ✅ Express 5.2, Mongoose 9, Zod 4, Socket.IO 4.8, node-cron 4, Helmet, express-rate-limit, firebase-admin (FCM), ImageKit, Resend, winston. **No Twilio/Cloudinary/Stripe** (backend README is outdated). |

## 2. Admin routes (`src/routes`)

`/login`, `/` (public landing, 854 lines), and a guarded `_admin` layout containing:
`dashboard`, `reports`, `users`, `workers` (index + `$id`), `onboarding`, `verification`, `specialty-requests`, `jobs`, `bookings`, `payments`, `wallets`, `disputes`, `promos`, `categories`, `reviews`, `notifications`, `support`, `audit`, `admins`, `settings`, `platform-config`.
`/admin` is redirected to `/login` in `server.ts` and the 404 component.

## 3. API calls per page (admin → backend `/api/v1/admin/*`)

| Page | Endpoints |
|---|---|
| Shell (sidebar badges) | 8 separate list calls with `limit=1` (support, jobs, bookings, workers, top-ups, disputes, verification, specialty) → replace with one `GET /admin/dashboard/action-counts` |
| Dashboard | `GET /dashboard/stats` |
| Reports | `/reports/revenue`, `/reports/bookings`, `/reports/workers`, `/reports/users` |
| Customers | `GET /users`, `/users/:id`, `PATCH /users/:id/status` |
| Professionals | `GET /workers`, `/workers/:id`, `PATCH /workers/:id`, `/status`, `/verify`, certificates & specialties review, `GET /reviews?workerId` |
| Onboarding | `GET /workers/onboarding` |
| Identity reviews | `GET /verification/requests`, `PATCH …/review` |
| Specialty requests | `GET /specialty-requests`, `PATCH /workers/:w/specialties/:c/review`, `/profession-requests` |
| Jobs | `GET /jobs`, `/jobs/:id`, `PATCH /status`, `/cancel`, **`DELETE /jobs/:id` (hard delete?)** |
| Bookings | `GET /bookings`, `/bookings/:id`, `/bookings/:id/messages`, `PATCH /status`, `POST /cancel` |
| Payments | `GET /payments`, `/payments/summary` |
| Wallets | `/wallets`, `/wallets/summary`, `/wallets/:workerId`, `POST recharge`, `POST adjust`, `/wallet-settings`, `/wallet-payment-methods`, `/wallet-topups` (+ approve/reject/summary) |
| Disputes | `GET /disputes`, `/disputes/:id`, `PATCH /resolve` |
| Promos | CRUD-ish: `GET/POST /promos`, `PATCH /:id/status`, `DELETE` |
| Services | `/categories` CRUD |
| Reviews | `GET /reviews`, `PATCH /flag`, `DELETE` |
| Notifications | `GET /notifications`, `POST /notifications/global` |
| Support | `/support/requests` (list/reply/status/priority) |
| Audit | `GET /audit-logs` |
| Admins | `/admins` list/create/status/delete (superadmin) |
| Platform config | `/platform-settings` |
| Auth | `POST /login`, `GET/PATCH /me`, `POST /change-password` |

**Not present on the backend yet** (needed by the redesign): dashboard summary with previous period, timeseries, action-counts, export/streaming CSV, bulk actions, global search, live ops, reveal-CNIC, admin notifications centre, 2FA, logout-all, cookie sessions, `BookingEvent`/`JobEvent`.

## 4. Shared components (before Phase 1)

- `components/admin/`: `AdminShell` (421 lines, sidebar+topbar+notification popover all inline), `ActionCenter`, `AdminPageHeader` (hero banner), `AdminPageLoader`, `BookingContextPanel`, `CommandPalette` (own nav list, duplicate of sidebar), `DataTable` (client-side pagination only, no sorting/selection/URL state), `Drawer` (custom modal/drawer), `ui.tsx` (Button/Badge/StatusBadge/StatCard/EmptyState/ErrorState/Input…).
- `components/ui/`: ~50 stock shadcn primitives.
- Formatting: `fmtPKR` (`₨` + `toLocaleString`) in `format.ts`; used by ~20 files → inconsistent decimals (`Rs5,251.5`).
- `mock-data.ts` still exports mock arrays and `fmtPKR` re-export.

## 5. Auth handling

- `POST /admin/login` returns `{ token, admin }`; token + user stored in **`localStorage`** (`adminToken`, `adminUser`); sent as `Authorization: Bearer`.
- Route guard (`_admin.tsx`) only checks that a token exists, then calls `/admin/me`; on 401 `api.ts` clears storage and fires `admin:unauthorized`.
- Server: `adminAuthMiddleware` verifies JWT + `Admin` lookup + `status`; `requirePermission(...)` uses `config/adminPermissions.ts` (role→permission map). The same map is **duplicated by hand** in `src/lib/admin-permissions.ts` → drift risk. `superadmin` and `admin` both have `*`.
- No idle timeout, no refresh/rotation, no logout-all, no 2FA, no lockout (only `authLimiter`). Helmet is on; no CSP tuned for the admin; `/api` limiter 500/15min per IP.
- `AdminAuditLog` exists with `recordAdminAction(req, {action, entityType, entityId, reason, metadata})` but reasons are optional and not enforced per action.

## 6. Things found broken / risky

**Data & correctness**
1. Fake growth badges (dashboard passes precomputed `*Change`; legacy `StatCard` rendered them verbatim).
2. Trend charts: windowed to last 7 days, not zero-filled, no empty state.
3. Single-segment donut artifact; no centre label/legend.
4. Reports "monthly revenue" with 1 point renders only dots.
5. `userController.ts:630` stores `G-<ts>-<rand>` in `User.phone` (required + unique) for Google sign-ups. Customer list shows it verbatim; cities show `N/A`/`Mountain View`.
6. Mixed money formatting across pages.
7. Job "client offer" vs "selected quote" differ with no explanation.
8. Generic "No records found" everywhere.
9. Sidebar subtitle "CONTROL CENTER" clipped; sidebar nav scrolled with no affordance.

**Safety & security**
10. CNIC shown in plain text in admin worker/verification views.
11. `DELETE /admin/jobs/:id` and one-click deactivate/revoke without reason.
12. JWT in `localStorage`.
13. Export CSV = current page only (`lib/csv.ts` client-side).
14. 8 badge polling queries on every page.

**Build / type health (pre-existing, from in-progress profession-request work)**
- `tsc` errors: `api-hooks.ts:626` (params possibly undefined), `_admin.workers.$id.tsx` (`Worker.certificates` missing from type), `routes/index.tsx:828` (`"/admin"` is not a typed route).
- `console.error` in `_admin.support.tsx` ×3 (+ framework error handlers).
- Backend has uncommitted WIP (`adminProfessionRequestController`, `ProfessionRequest`, worker model/routes) — **not touched** and not committed by this work.

## 7. Mobile-app safety check

`ApnaUstadApp` talks to `/api/v1/{users,workers,bookings,jobs,reviews,otp,messages,notifications,payments,preferences,support,wallet,user-wallet,disputes,promos}`; it never calls `/api/v1/admin/*`. Rule for all backend work: **additive only** (new `/admin/*` routes or optional params); do not change shapes of non-admin routes. The phone placeholder fix touches `userController` (Google sign-in), so it must keep the mobile contract: the `phone` field stays in responses, becoming `null`/absent rather than a fake string, and the schema change (`phone` optional + sparse unique) is verified against the app's profile screens in Phase 2.

## 8. Roadmap status

| Phase | Status |
|---|---|
| 1 Audit + foundation | ✅ (this phase) |
| 2 Backend core | next |
| 3 Dashboard + Reports | pending |
| 4 Tables + drawers | pending |
| 5 Queues | pending |
| 6 Missing flows | pending |
| 7 Hardening | pending |
