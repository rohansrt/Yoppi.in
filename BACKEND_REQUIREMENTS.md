# YOPPI Backend Integration Requirements

> **Purpose of this document:** This is the starting context for a Claude Code session building the YOPPI backend. Paste this whole file in, or point Claude Code at it, and it should have everything needed to scaffold the backend: recommended stack, auth model, database schema, API surface, env vars, and deployment plan.

## 1. What YOPPI Is

YOPPI ("The Play Operating System for India") is a B2B **Sports-Infrastructure-as-a-Service** platform for institutions — schools, colleges, corporate campuses, gated societies/clubs. It audits, maintains, supplies, and manages sports equipment/assets for these institutions under three service lines: **Care**, **Lease**, and **Asset Management**, sold as three plan tiers: **Essential**, **Plus**, **Elite** (pricing is currently "confirmed after a free facility review" — no public price yet).

## 2. Current State of the Frontend

The frontend (`yoppi.in`) is a **static, framework-free site**: plain HTML5 + CSS + vanilla JS. No React/Next/Vite, no `package.json`, no build step, no npm dependencies. It's deployed on **GitHub Pages** with a custom domain (`CNAME` → `yoppi.in`). There is currently **no backend integration at all**:

- `signup.html` — an institution enquiry form. `preventDefault()`s on submit and shows a fake "success" message. No data is sent anywhere.
- `contact.html` — a contact/enquiry form. Same fake-submit behavior.
- `services.html` — three static pricing-tier cards (Essential/Plus/Elite) with a "Book Now" → sports-checklist modal → "Continue" button that links to `contact.html`, capturing nothing.
- "Login" — a modal literally titled **"Sample login only"** that links straight to a static `dashboard.html`. No credential check, no session, no auth code of any kind exists.
- `dashboard.html` — a fully hardcoded sample dashboard (fake org, fake KPIs, fake charts, fake maintenance tickets) with zero data fetching.

**Implication:** there is nothing to migrate. This is a greenfield backend build. The frontend gives us exact field names and the shape of the data model to design around (detailed below), but no existing API contracts, auth logic, or state management to preserve.

This document only covers backend requirements. Wiring the frontend forms/pages to the new backend is a separate follow-up task — not in scope here.

## 3. Recommended Stack: Supabase

Given the constraints — **stay as close to $0 as possible**, **login must be genuinely robust**, **database design matters**, and **the frontend is and will remain static (GitHub Pages, no server-side rendering, no build step)** — the recommendation is:

**Supabase** (managed Postgres + built-in Auth + Row Level Security + auto-generated REST/GraphQL API + Edge Functions).

Why, over the alternatives:
- **vs. hand-rolled Node/Express + JWT/bcrypt**: reaches "robust auth" (email verification, password reset, refresh-token session handling, abuse protection, MFA-ready) with near-zero custom auth code, instead of re-implementing all of that by hand. Free hosting for a custom Node server (Render/Railway free tiers) also sleeps after inactivity, causing cold-start delays on the first request — a bad look for a login flow.
- **vs. Firebase (Auth + Firestore)**: Firebase Auth is comparably mature, but Firestore is NoSQL and a materially worse fit for this data — it's inherently relational (organizations → users → equipment → maintenance tickets → vendors, all with real foreign keys and multi-tenant access rules). Postgres + RLS is the right tool here.
- **No server to run at all**: Supabase is called directly from static frontend JS over HTTPS (using the public anon key, protected by Row Level Security — this is the intended, secure usage pattern, not a secret leak). Anything needing elevated privilege (e.g. multi-table signup transactions) runs as a Supabase Edge Function, not a separate hosted server.
- **Cost**: free tier covers this stage comfortably — 500MB database, 50,000 monthly active auth users, 500K Edge Function invocations/month.
- **Known free-tier caveat**: a Supabase free project **pauses after 7 days of zero API activity** and needs a manual (or scripted) un-pause. Fine pre-launch; worth a cheap uptime ping (e.g. a free cron pinging a health endpoint) once there's real traffic to avoid this.

If the backend engineer strongly prefers a custom server for some reason, the schema and auth requirements below still apply — just implement equivalent behavior (email verification, password reset, session/refresh tokens, RLS-equivalent per-org authorization) by hand.

## 4. Authentication Requirements ("robust login")

This is the highest-priority piece. Requirements:

- **Email + password** as the primary login method, via Supabase Auth.
- **Email verification required** before first login — no account should be usable until the email is confirmed.
- **Forgot / reset password flow** — standard email-link reset.
- **Session handling** via Supabase's JS client SDK — refresh tokens handled automatically by the SDK, no manual token storage/rotation logic needed in the frontend.
- **Rate limiting / abuse protection** on signup and login. Supabase has baseline protection; additionally, since `signup.html` and `contact.html` are public unauthenticated forms, add **CAPTCHA** (e.g. hCaptcha, free tier) on both to prevent spam submissions filling the database.
- **Role-based authorization**, enforced at the **database level via Postgres Row Level Security policies**, not just app-level checks:
  - `org_admin` — the first user created when an institution signs up. Full access to their own org's data.
  - `org_staff` — additional users invited by an `org_admin` within the same org. Scoped to that org.
  - `yoppi_ops` — internal YOPPI staff. Cross-org access (needed for account management, vendor coordination, support).
  - `vendor` — external repair/maintenance vendors. Scoped only to maintenance tickets assigned to them, nothing else.
  - Every table with org-specific data needs an RLS policy restricting rows to `profiles.org_id = auth.uid()'s org_id`, except for `yoppi_ops` which bypasses that restriction.
- **Account creation model**: **self-service signup with password.** The current `signup.html` has no password field (it's a sales-lead-only form) — this is intentionally being upgraded, not migrated. The extended signup should, in one atomic operation:
  1. Create a Supabase Auth user (email + password, triggers verification email)
  2. Create the `organizations` row from the form fields
  3. Create the `profiles` row linking the new auth user to the new org as `org_admin`
  4. Create an `enquiries` row recording the original lead data
  
  This should be a single Postgres function or Edge Function so it's atomic (an org shouldn't exist without its admin user, or vice versa).
- **Not required at launch, flag as V2/optional**: magic-link login, Google OAuth (plausible since institution staff likely use Google Workspace), phone/OTP login, MFA. Design the `profiles`/auth setup so these can be added later without a schema change.

## 5. Database Schema

Derived directly from frontend form fields and hardcoded dashboard content — every field below traces back to something in the FE markup.

```
organizations
  id                        uuid PK
  name                      text                 -- FE: "org-name"
  org_type                  enum(school, college_university, corporate_campus, gated_society_club, other)  -- FE: "org-type"
  city                      text                 -- FE: "city"
  headcount_range           enum(under_500, 500_2000, 2000_5000, 5000_plus)  -- FE: "headcount"
  plan_id                   uuid FK -> plans, nullable
  subscription_renewal_date date, nullable
  created_at                timestamptz

profiles
  id            uuid PK, FK -> auth.users
  org_id        uuid FK -> organizations
  full_name     text        -- FE: "contact-person"
  designation   text        -- FE: "designation"
  phone         text        -- FE: "phone"
  role          enum(org_admin, org_staff, yoppi_ops, vendor)
  created_at    timestamptz

plans
  id          uuid PK
  name        text            -- Essential / Plus / Elite
  features    text[]
  sla_hours   int             -- 72 / 48 / 24 from FE services.html
  price       numeric, nullable  -- unset today ("confirmed after free facility review")

sports
  id     uuid PK
  name   text   -- seed: Basketball, Football, Cricket, Badminton, Table Tennis, Swimming (hardcoded list in FE booking modal)

org_sports   (join table: which sports an org has equipment for)
  org_id     uuid FK -> organizations
  sport_id   uuid FK -> sports

equipment
  id                 uuid PK
  org_id             uuid FK -> organizations
  category           enum(racquet, gym_fitness, team_sports, consumables)  -- from dashboard donut chart categories
  name               text
  sport_id           uuid FK -> sports, nullable
  location           text
  status             text
  last_maintained_at timestamptz

maintenance_tickets   -- FE: dashboard "Needs Attention" table
  id            uuid PK
  org_id        uuid FK -> organizations
  equipment_id  uuid FK -> equipment
  location      text
  description   text        -- FE: "What's Wrong"
  status        enum(being_fixed, waiting_on_vendor, scheduled, fixed)
  vendor_id     uuid FK -> vendors, nullable
  created_at    timestamptz
  resolved_at   timestamptz, nullable

maintenance_schedule   -- FE: dashboard "Upcoming Maintenance" timeline
  id                   uuid PK
  org_id               uuid FK -> organizations
  scheduled_date       date
  title                text
  description          text
  related_equipment_id uuid FK -> equipment, nullable

vendors
  id            uuid PK
  name          text
  contact_info  text

enquiries    -- captures both signup-form leads and the "Book Now" plan+sports booking flow
  id                uuid PK
  org_name          text
  org_type          text
  city              text
  contact_person    text
  designation       text
  email             text
  phone             text
  headcount_range   text
  interest          enum(care, lease, asset_management)  -- FE: "interest"
  selected_sports   uuid[]                                -- from booking modal checklist
  source            enum(signup, plan_booking)
  created_at        timestamptz

contact_submissions   -- FE: contact.html
  id          uuid PK
  name        text
  org         text
  email       text
  phone       text
  role        enum(sports_head_pe_teacher, facilities_admin_manager, principal_director, hr_corporate_wellness, vendor_partner, other)
  message     text, nullable
  created_at  timestamptz

notifications   -- FE: dashboard bell icon with unread dot, currently unwired
  id          uuid PK
  profile_id  uuid FK -> profiles
  message     text
  read        boolean default false
  created_at  timestamptz
```

**RLS policy rule for every org-scoped table** (`organizations`, `profiles`, `equipment`, `maintenance_tickets`, `maintenance_schedule`, `notifications`): a user may only read/write rows where `org_id` matches their own `profiles.org_id`, except `yoppi_ops` role, which bypasses this restriction. `vendors` should be readable by any authenticated user but only writable by `yoppi_ops`. `maintenance_tickets` assigned to a `vendor` should additionally be readable/updatable by that vendor's account, scoped to `vendor_id = auth.uid()`.

## 6. API Surface

With Supabase, most of this is **auto-generated REST/GraphQL directly from the schema + RLS** — not hand-written route handlers. What needs custom logic:

- **Auth** (`signup`, `login`, `logout`, `reset-password`) — handled via the Supabase Auth **client SDK**, not custom REST endpoints.
- **`POST /rpc/signup_organization`** (Postgres function or Edge Function) — the atomic "create auth user + org + profile + enquiry" operation described in §4. This is the one piece of custom backend logic that genuinely needs writing.
- **`POST /enquiries`** — for the contact form and the plan-booking flow (auto-generated table insert via Supabase client, RLS allows anonymous insert on this table only).
- **`POST /contact_submissions`** — same pattern, anonymous insert allowed.
- **Dashboard reads** — `GET` on `equipment`, `maintenance_tickets`, `maintenance_schedule`, `organizations` (auto-generated, RLS-scoped to caller's org). A KPI summary (sports covered count, equipment count, "needs attention" count) can be a Postgres view or a lightweight Edge Function aggregating these.

## 7. Environment Variables / Secrets

| Variable | Used where | Notes |
|---|---|---|
| `SUPABASE_URL` | Frontend + backend | Public, safe to embed in static FE JS |
| `SUPABASE_ANON_KEY` | Frontend | Public, safe to embed — protected by RLS, this is the intended usage pattern |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend/Edge Functions only | **Never** expose to the frontend — bypasses RLS |
| `HCAPTCHA_SECRET` | Edge Function verifying signup/contact submissions | Only needed if CAPTCHA is added |

Note: the frontend currently has **no env/config handling whatsoever** (fully static HTML, no build step) — the Supabase URL and anon key will need to be embedded directly as constants in the FE JS files. This is expected and safe for Supabase's public anon key.

## 8. Deployment & Cost

- **Backend**: Supabase free tier — fully hosted, no server to deploy or maintain. Schema changes ship via Supabase CLI migrations or the dashboard SQL editor.
- **Frontend**: stays exactly as-is — GitHub Pages, custom domain `yoppi.in`, no build step, no changes to hosting.
- **Total infrastructure cost at this stage: $0.** If custom logic beyond RLS/auto-API is needed later (sending emails, complex transactions), use **Supabase Edge Functions** (free tier: 500K invocations/month) rather than standing up and paying for a separate server.

## 9. Open Questions to Confirm Early in the Backend Build

1. Exact pricing for Essential/Plus/Elite plans (currently unset in the FE — "confirmed after a free facility review").
2. Is `org_staff` invite functionality (an `org_admin` inviting teammates) needed at launch, or can it be deferred?
3. Does the `vendor` role need real login access at launch, or can vendors be managed purely by `yoppi_ops` staff initially (with self-service vendor login as V2)?
