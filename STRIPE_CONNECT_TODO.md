# Stripe Connect Integration — Full TODO

This document catalogs every piece of the Stripe Connect integration for Athli. Coaches connect their existing Stripe account to Athli, which pulls in their products/prices and displays them to clients in the mobile app. Clients pay via Stripe Checkout (opened in an in-app browser). Athli takes **no platform fee** — it's a passthrough that provides a nice UI and tracks payment history.

**Key tech choices:**
- **Stripe Connect Express** — Stripe handles KYC, coaches manage products in their own Stripe Dashboard
- **Stripe Checkout via `expo-web-browser`** — no native Stripe SDK needed on mobile
- **Physical service exemption** — fitness coaching is exempt from Apple/Google IAP (App Store guideline 3.1.3)
- **Webhooks as source of truth** — don't rely on client-side callbacks for payment status
- **Both one-time and recurring** supported from day one

**Core business rules:**
- One Stripe account per coach (enforced at DB level)
- Coaches can **assign** specific packages to specific clients, OR clients can **browse** the coach's full package library and self-select
- If **no package is assigned** to a client → full access, no payment wall
- If a package **is assigned** → client must have an active payment/subscription to access the app
- On subscription lapse → 1-day grace period with notification → then payment wall (client can only see payment/package screens, nothing else)
- Multiple packages can be assigned to one client simultaneously

---

## 1. FOUNDATION

### 1.1 Install Stripe
```bash
cd apps/service && npm install stripe
```

### 1.2 Environment Variables
Add to `apps/service/src/config/env.ts`:
- `STRIPE_SECRET_KEY` — `sk_test_...` / `sk_live_...`
- `STRIPE_WEBHOOK_SECRET` — `whsec_...`

### 1.3 Stripe Service Singleton
- [ ] Create `apps/service/src/services/stripe.service.ts` — follow the pattern of `supabase.service.ts`

### 1.4 Raw Body Parser for Webhooks
- [ ] In `apps/service/src/loaders/express.ts`, add **before** `express.json()`:
  ```typescript
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
  ```
  The webhook needs the raw body buffer for Stripe signature verification.

### 1.5 Route Skeleton
- [ ] Create `apps/service/src/api/v1/payments/payments.routes.ts`
- [ ] Create `apps/service/src/api/v1/payments/payments.controller.ts`
- [ ] Register in `apps/service/src/api/v1/routes/index.ts`:
  ```typescript
  v1Router.use('/payments', paymentsRouter);
  ```

### 1.6 Database Migration

**Tables:**

**`coach_stripe_accounts`** — links coach to Stripe Express account (one per coach)
| Column | Type | Notes |
|--------|------|-------|
| `coach_id` | UUID PK | FK → user_profiles (PK enforces one account per coach) |
| `stripe_account_id` | TEXT UNIQUE | `acct_xxx` |
| `onboarding_complete` | BOOLEAN | default false |
| `charges_enabled` | BOOLEAN | default false |
| `payouts_enabled` | BOOLEAN | default false |
| `details_submitted` | BOOLEAN | default false |
| `default_currency` | TEXT | |
| `country` | TEXT | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**`coach_packages`** — cached mirror of coach's Stripe Products/Prices
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `coach_id` | UUID FK | |
| `stripe_product_id` | TEXT | `prod_xxx` |
| `stripe_price_id` | TEXT | `price_xxx` |
| `name` | TEXT | product name |
| `description` | TEXT | |
| `amount_cents` | INTEGER | |
| `currency` | TEXT | |
| `interval` | TEXT | `one_time` / `week` / `month` / `year` |
| `interval_count` | INTEGER | e.g. 1 for monthly, 3 for quarterly |
| `is_active` | BOOLEAN | |
| `sort_order` | INTEGER | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**`client_package_assignments`** — coach assigns packages to specific clients
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `coach_id` | UUID FK | the assigning coach |
| `client_id` | UUID FK | the assigned client |
| `package_id` | UUID FK | → coach_packages |
| `assigned_at` | TIMESTAMPTZ | when coach assigned it |
| `is_active` | BOOLEAN | default true, coach can unassign |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

> **Access rule:** If a client has ANY active `client_package_assignments` rows, they must have a corresponding successful payment or active subscription for at least one of them to access the app. If they have ZERO assignment rows, they have full access (no payment required).

**`payments`** — every one-time payment attempt and outcome
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `coach_id` | UUID FK | |
| `client_id` | UUID FK | |
| `package_id` | UUID FK | nullable |
| `stripe_checkout_session_id` | TEXT UNIQUE | |
| `stripe_payment_intent_id` | TEXT UNIQUE | |
| `amount_cents` | INTEGER | |
| `currency` | TEXT | |
| `status` | TEXT | `pending`/`succeeded`/`failed`/`refunded`/`disputed`/`cancelled` |
| `failure_reason` | TEXT | |
| `paid_at` | TIMESTAMPTZ | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**`client_subscriptions`** — recurring subscriptions
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `coach_id` | UUID FK | |
| `client_id` | UUID FK | |
| `package_id` | UUID FK | nullable |
| `stripe_subscription_id` | TEXT UNIQUE | `sub_xxx` |
| `stripe_customer_id` | TEXT | `cus_xxx` |
| `status` | TEXT | `active`/`past_due`/`cancelled`/`unpaid`/`trialing` |
| `current_period_start` | TIMESTAMPTZ | |
| `current_period_end` | TIMESTAMPTZ | |
| `cancel_at_period_end` | BOOLEAN | |
| `cancelled_at` | TIMESTAMPTZ | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**`stripe_webhook_events`** — idempotency tracking
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | Stripe event ID `evt_xxx` |
| `type` | TEXT | e.g. `checkout.session.completed` |
| `processed_at` | TIMESTAMPTZ | |
| `payload` | JSONB | full event for debugging |

**Views:**
- [ ] **`coach_payment_analytics`** — per coach: total revenue, successful/failed counts, paying client count, last payment date
- [ ] **`coach_client_payment_summary`** — per coach+client: total paid, successful/failed counts, last payment/failure date
- [ ] **`client_access_status`** — per client: has assignments?, has valid payment/subscription?, grace period status. Used by the mobile app to determine if access is granted or payment wall should show.

**RLS policies:**
- [ ] `coach_stripe_accounts` — coach sees own only
- [ ] `coach_packages` — coach manages own; clients can view active packages of their assigned coach
- [ ] `client_package_assignments` — coach manages where `coach_id = auth.uid()`; client reads where `client_id = auth.uid()`
- [ ] `payments` — coach sees where `coach_id = auth.uid()`; client sees where `client_id = auth.uid()`
- [ ] `client_subscriptions` — same pattern as payments
- [ ] `stripe_webhook_events` — service role only

### 1.7 Shared Types
- [ ] Create `packages/shared-types/src/schemas/payment-schema.ts` with types for packages, payments, subscriptions, assignments, access status, analytics

---

## 2. COACH STRIPE ONBOARDING

### Backend Endpoints

**`POST /payments/connect/onboard`** (Coach auth)
- [ ] `stripe.accounts.create({ type: 'express' })` → get `acct_xxx`
- [ ] Insert into `coach_stripe_accounts`
- [ ] `stripe.accountLinks.create({ account, type: 'account_onboarding', return_url, refresh_url })` → get onboarding URL
- [ ] Return onboarding URL to frontend

**`GET /payments/connect/status`** (Coach auth)
- [ ] Read from `coach_stripe_accounts` where `coach_id = userId`

**`POST /payments/connect/dashboard-link`** (Coach auth)
- [ ] `stripe.accounts.createLoginLink(stripeAccountId)` → return URL

### Webhook
- [ ] Handle `account.updated` → update `charges_enabled`, `payouts_enabled`, `details_submitted`, `onboarding_complete` in `coach_stripe_accounts`

### Web Frontend
- [ ] Add "Payments" section under Settings → Business in `apps/web/app/settings/layout.tsx`
- [ ] Create `apps/web/app/settings/business/payments/page.tsx`:
  - Not connected → "Connect Stripe" button (redirects to Stripe onboarding)
  - Connected → green status badge, "Open Stripe Dashboard" button, account details
- [ ] Handle return from Stripe onboarding (callback URL back to settings page)

---

## 3. PACKAGE SYNC & MANAGEMENT

### Backend Endpoints

**`POST /payments/packages/sync`** (Coach auth)
- [ ] `stripe.products.list({ limit: 100 }, { stripeAccount })` → get all products
- [ ] For each active product, `stripe.prices.list({ product, active: true }, { stripeAccount })` → get prices
- [ ] Upsert into `coach_packages` (match on `stripe_product_id` + `stripe_price_id`)
- [ ] Mark packages not in Stripe as `is_active = false`

**`GET /payments/packages`** (Coach auth)
- [ ] Read from `coach_packages` where `coach_id = userId`

**`POST /payments/packages`** (Coach auth) — optional, for creating from within Athli
- [ ] `stripe.products.create({ name, description }, { stripeAccount })`
- [ ] `stripe.prices.create({ product, unit_amount, currency, recurring? }, { stripeAccount })`
- [ ] Insert into `coach_packages`

**`PATCH /payments/packages/:id`** / **`DELETE /payments/packages/:id`** (Coach auth)
- [ ] Update/archive in Stripe + update local cache

### Package Assignment Endpoints

**`POST /payments/packages/:packageId/assign`** (Coach auth)
- [ ] Body: `{ clientIds: string[] }` — assign package to one or more clients
- [ ] Insert into `client_package_assignments`
- [ ] Send notification to assigned clients

**`DELETE /payments/packages/:packageId/assign/:clientId`** (Coach auth)
- [ ] Soft-delete (set `is_active = false`) the assignment
- [ ] Does NOT cancel any active subscription — just removes the requirement

**`GET /payments/packages/:packageId/assignments`** (Coach auth)
- [ ] List all clients assigned to this package, with their payment status

**`GET /payments/clients/:clientId/assignments`** (Coach auth)
- [ ] List all packages assigned to a specific client, with payment status for each

### Webhook
- [ ] Handle `product.updated`, `price.updated` → sync cache

### Web Frontend
- [ ] Create `apps/web/app/settings/business/payments/packages/page.tsx`
- [ ] Package list with sync button, create/edit dialog, deactivate toggle
- [ ] Per-package: "Assign to clients" dialog — multi-select from coach's client list
- [ ] Per-client (athlete detail page): show assigned packages + payment status

---

## 4. WEBHOOK HANDLER

### Implementation

The webhook endpoint (`POST /payments/webhook`) must:
- [ ] **Not** use `supabaseAuthenticate` middleware (Stripe calls this, not a user)
- [ ] Verify signature: `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)`
- [ ] Check idempotency: skip if `stripe_webhook_events` already has this event ID
- [ ] Process event based on type
- [ ] Insert into `stripe_webhook_events`
- [ ] Return 200 immediately

### Events to Handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | If mode=payment: mark payment `succeeded`, set `paid_at`. If mode=subscription: create `client_subscriptions` row |
| `checkout.session.expired` | Mark payment `cancelled` |
| `payment_intent.payment_failed` | Mark payment `failed`, store `failure_reason` |
| `account.updated` | Update coach's connection status fields |
| `charge.refunded` | Mark payment `refunded` |
| `charge.dispute.created` | Mark payment `disputed` |
| `invoice.paid` | Insert a new `payments` row for the subscription invoice |
| `invoice.payment_failed` | Update subscription to `past_due`, start grace period logic |
| `customer.subscription.updated` | Sync subscription status, period dates |
| `customer.subscription.deleted` | Mark subscription `cancelled` |
| `product.updated` / `price.updated` | Sync `coach_packages` cache |

### Testing
```bash
stripe listen --forward-to localhost:3002/api/v1/payments/webhook
stripe trigger checkout.session.completed
```

---

## 5. CLIENT ACCESS GATING & PAYMENT WALL

This is the core access-control layer. Determines whether a client can use the app or sees a payment wall.

### Access Logic

```
1. Check: does this client have any active `client_package_assignments`?
   - NO  → full access, no payment required
   - YES → continue to step 2

2. Check: does the client have a `succeeded` one-time payment OR `active` subscription
   for at least one of their assigned packages?
   - YES → full access
   - NO  → continue to step 3

3. Check: is the client within the 1-day grace period?
   (subscription `current_period_end` + 1 day > now, or subscription status = `past_due`)
   - YES → show grace period warning banner, but allow access
   - NO  → payment wall
```

### Backend Endpoint

**`GET /payments/client/access`** (Client auth)
- [ ] Returns: `{ hasAccess: boolean, inGracePeriod: boolean, gracePeriodEndsAt?: string, assignedPackages: Package[], availablePackages: Package[] }`
- [ ] `assignedPackages` = packages assigned by coach to this client (with payment status for each)
- [ ] `availablePackages` = all active packages from the coach's library (for browsing/self-selecting)
- [ ] Called on app launch to determine if client can proceed or sees the payment wall

### Mobile App — Payment Wall

- [ ] On app launch / auth check, call `GET /payments/client/access`
- [ ] If `hasAccess = false` and `inGracePeriod = false`:
  - Show full-screen payment wall — client cannot navigate anywhere else
  - Display assigned packages (if any) with "Pay Now" buttons
  - Display coach's full package library with "Subscribe" / "Buy" buttons
  - Each button → `POST /payments/client/checkout` → Stripe Checkout via `expo-web-browser`
- [ ] If `inGracePeriod = true`:
  - Show warning banner at top of app: "Your subscription expires on X. Please renew."
  - Allow normal app usage
- [ ] If `hasAccess = true`:
  - Normal app, no interruption

### Grace Period & Notifications

- [ ] When subscription enters `past_due` (via webhook): start 1-day grace period
- [ ] Send push notification: "Your subscription has expired. You have 24 hours to renew before losing access."
- [ ] After 24 hours with no renewal: next app launch shows payment wall

---

## 6. CLIENT PAYMENT FLOW — MOBILE

### Backend Endpoints

**`GET /payments/client/packages`** (Client auth)
- [ ] Look up coach via `coach_client_assignments` where `client_id = userId`
- [ ] Returns two lists:
  - `assignedPackages`: from `client_package_assignments` joined with `coach_packages`, includes payment status
  - `availablePackages`: all `coach_packages` where `coach_id = coachId` and `is_active = true`

**`POST /payments/client/checkout`** (Client auth)
- [ ] Body: `{ packageId }`
- [ ] Look up coach + package + coach's `stripe_account_id`
- [ ] Determine mode: `'payment'` (one-time) or `'subscription'` (recurring)
- [ ] Create Stripe Checkout Session:
  ```typescript
  stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: 'athlimobile://payment-success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'athlimobile://payment-cancel',
    metadata: { coach_id, client_id, package_id, payment_id }
  }, { stripeAccount })
  ```
- [ ] Insert `payments` row with status `pending`
- [ ] Return `{ checkoutUrl: session.url }`

**`GET /payments/client/history`** (Client auth)
- [ ] Read from `payments` where `client_id = userId`, ordered by `created_at DESC`

**`GET /payments/client/subscriptions`** (Client auth)
- [ ] Read from `client_subscriptions` where `client_id = userId`

**`POST /payments/client/subscriptions/:id/cancel`** (Client auth)
- [ ] `stripe.subscriptions.update(subId, { cancel_at_period_end: true }, { stripeAccount })`

### Mobile App

**Service:**
- [ ] Create `apps/mobile/services/payment-service.ts` — API calls for all client payment endpoints

**Payments Screen** (accessible from profile or payment wall):
- [ ] Coach's assigned packages (with pay status per package)
- [ ] Coach's full package library (browse and self-select)
- [ ] "Pay" / "Subscribe" button per package → Stripe Checkout via `expo-web-browser`
- [ ] Payment history list
- [ ] Active subscriptions with cancel option

**Deep links:**
- [ ] Handle `athlimobile://payment-success` and `athlimobile://payment-cancel` — show success/cancel state, refetch payment history + access status

---

## 7. COACH PAYMENT DASHBOARD — WEB

### Backend Endpoints

**`GET /payments/analytics`** (Coach auth)
- [ ] Query `coach_payment_analytics` view
- [ ] Compute: this month's revenue, last month's revenue, month-over-month change

**`GET /payments/history`** (Coach auth)
- [ ] Query `payments` where `coach_id = userId`, paginated, filterable by status/client/date range

**`GET /payments/clients/:clientId/history`** (Coach auth)
- [ ] Per-client payment history

### Web Frontend

**New top-level "Payments" page** — add to main sidebar alongside Home, Athletes, Training, etc.

- [ ] Create `apps/web/app/payments/page.tsx`:
  - **Summary cards**: Total revenue, this month's revenue, active subscriptions count, paying clients count
  - **Payment history table** (use ag-grid like the athletes page): date, client name, package, amount, status badge
  - **Filters**: status, client, date range
  - **Per-client breakdown**: click a client row to see their payment history
  - **Failed payment alerts**: highlight overdue/failed payments
- [ ] Add payment status indicator on athlete detail page (`/athletes/[clientId]/overview`):
  - Show assigned packages, payment status, subscription end dates
  - "Assign package" button on athlete detail page

---

## 8. PAYMENT REQUESTS & NOTIFICATIONS

### Backend

**`POST /payments/request/:clientId`** (Coach auth)
- [ ] Body: `{ packageId }` (optional — if omitted, send generic "you have a payment due" notification)
- [ ] If packageId provided: create a Checkout Session + return the URL
- [ ] Send push notification to client via existing notification system with the payment link

### Mobile
- [ ] Handle payment request notification → tap opens the payment flow

---

## PRIORITY ORDER

| Priority | Phase | Reason |
|----------|-------|--------|
| P0 | Foundation (#1) | Everything depends on this |
| P0 | Coach onboarding (#2) | Coaches must connect Stripe before anything else works |
| P1 | Webhook handler (#4) | Source of truth for all payment state |
| P1 | Package sync & assignment (#3) | Coaches need products visible + assignable before clients can pay |
| P1 | Access gating (#5) | Core business rule — determines app access |
| P1 | Client payment flow (#6) | Core payment capability |
| P2 | Coach dashboard (#7) | Visibility into revenue and payment status |
| P3 | Payment requests (#8) | Nice-to-have for coach-initiated billing |

---

## ESTIMATED EFFORT

| Phase | Days |
|-------|------|
| 1 — Foundation | ~2 |
| 2 — Coach onboarding | ~2-3 |
| 3 — Package sync & assignment | ~2-3 |
| 4 — Webhooks | ~2 |
| 5 — Access gating & payment wall | ~2-3 |
| 6 — Mobile payment flow | ~2-3 |
| 7 — Coach dashboard | ~3 |
| 8 — Payment requests | ~1-2 |
| **Total** | **~16-21** |

---

## TECHNICAL DECISIONS NEEDED

1. **Deep link scheme** — Is `athlimobile://` already registered in the Expo config, or does it need to be set up?
2. **Stripe Connect account type** — Express (recommended) vs Standard? Express means Stripe handles KYC/dashboard, Standard gives coaches more control but more complexity.
3. **Customer creation** — Should we create Stripe Customers on the connected account for each client? Needed for subscriptions, optional for one-time payments. Probably yes.
4. **Multi-coach scenario** — Can a client be assigned to multiple coaches? If so, they might have multiple payment sources. Current schema assumes one coach per client via `coach_client_assignments`.
5. **Currency handling** — Do we force the coach's default currency, or let Stripe auto-detect based on client location?
6. **Refund flow** — Should coaches be able to issue refunds from within Athli, or only from the Stripe Dashboard?
7. **Self-selected packages** — When a client buys a package from the coach's library (not assigned by coach), should that auto-create a `client_package_assignments` row? Probably yes, so the coach can see what the client bought.
