# Ordo Website — Next.js Migration Plan

## Current State

- Static HTML/CSS/JS landing page on GitHub Pages
- 3 Supabase Edge Functions (Deno): waitlist-signup, create-checkout, stripe-webhook
- Supabase Postgres (waitlist table with RLS)
- Stripe Checkout for $80 pre-orders
- Resend for transactional emails
- Domain: ai.ordospaces.com

## Target State

- Next.js 15 App Router (TypeScript, Tailwind CSS v4)
- API Routes replace Supabase Edge Functions
- Supabase stays as the database (Postgres) — no reason to move
- Stripe, Resend integrations move into Next.js API routes
- Deploy on Vercel (CDN, previews, analytics, edge)
- Analytics, error monitoring, legal pages added

---

## Phase 1: Project Setup

### 1.1 Initialize Next.js
- `npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint`
- Keep existing files (git-tracked) alongside until migration is done
- Add `@supabase/supabase-js`, `stripe`, `resend` as npm dependencies

### 1.2 Environment Variables
- Create `.env.local` with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `RESEND_API_KEY`
  - `NEXT_PUBLIC_SITE_URL=https://ai.ordospaces.com`
- Update `.env.example` with these keys (no values)
- Add `.env.local` to `.gitignore`

### 1.3 Folder Structure
```
src/
  app/
    layout.tsx          — Root layout (fonts, metadata, nav, footer, grain overlay)
    page.tsx            — Landing page (hero, features, how-it-works, use-cases, mission, waitlist)
    privacy/page.tsx    — Privacy Policy
    terms/page.tsx      — Terms of Service
    refund/page.tsx     — Refund Policy
    api/
      waitlist-signup/route.ts
      create-checkout/route.ts
      stripe-webhook/route.ts
    globals.css         — Tailwind + custom CSS (migrated from styles.css)
    sitemap.ts          — Dynamic sitemap generation
    robots.ts           — Dynamic robots.txt generation
  components/
    nav.tsx
    footer.tsx
    hero.tsx
    features.tsx
    social-proof.tsx
    how-it-works.tsx
    use-cases.tsx
    mission.tsx
    waitlist.tsx
    terminal-demo.tsx
    grain-overlay.tsx
  lib/
    supabase.ts         — Supabase client (server + browser)
    stripe.ts           — Stripe client
    resend.ts           — Resend client
    emails/
      welcome.tsx       — Welcome email template (React Email)
      preorder-confirm.tsx — Pre-order confirmation email template
  hooks/
    use-scroll-reveal.ts
    use-word-reveal.ts
```

---

## Phase 2: Frontend Migration

### 2.1 Root Layout (`layout.tsx`)
- Google Fonts via `next/font/google` (Instrument Sans, Instrument Serif, JetBrains Mono)
- Global metadata: title, description, OG tags, Twitter cards, JSON-LD structured data
- Favicon setup via `app/icon.jpg`
- Nav and Footer as shared components
- Film grain overlay component

### 2.2 Landing Page Components
Migrate each HTML section to a React Server Component:

| Section | Component | Notes |
|---------|-----------|-------|
| Navigation | `nav.tsx` | Client component (scroll state, mobile toggle) |
| Hero | `hero.tsx` | Server component, image via `next/image` for hardware.webp |
| Social proof strip | `social-proof.tsx` | Server component |
| Features grid | `features.tsx` | Server component, card hover glow needs thin client wrapper |
| Lifestyle break | `lifestyle-break.tsx` | Server component |
| How it works | `how-it-works.tsx` | Server component |
| Terminal demo | `terminal-demo.tsx` | Client component (stagger animation) |
| Use cases | `use-cases.tsx` | Server component |
| Mission | `mission.tsx` | Server component |
| Waitlist + preorder | `waitlist.tsx` | Client component (form state, fetch calls) |
| Footer | `footer.tsx` | Server component |

### 2.3 Styling Migration
- Use Tailwind CSS v4 for utility classes
- Migrate CSS custom properties (--accent, --bg, --text, etc.) to Tailwind theme config or keep as CSS variables in `globals.css`
- Complex animations (grain, word-reveal, shimmer) stay as custom CSS in `globals.css`
- Remove the standalone `assets/css/styles.css` after migration

### 2.4 Animations & Interactivity
- Scroll reveal: custom `useScrollReveal` hook using IntersectionObserver
- Word-by-word reveal: custom `useWordReveal` hook
- Parallax on device image and lifestyle section: scroll listener in client component
- Feature card hover glow: onMouseMove handler in client component
- Terminal line stagger: IntersectionObserver in client component
- Smooth anchor scrolling: native CSS `scroll-behavior: smooth` (already works)

### 2.5 Images
- Move `hardware.webp` and `assets/images/ordo.jpg` to `public/`
- Use `next/image` with proper `width`, `height`, `alt`, `priority` (hero image)
- Add OG image to `public/og-image.png` (currently referenced but missing)

---

## Phase 3: Backend Migration (API Routes)

### 3.1 `POST /api/waitlist-signup`
Port from `supabase/functions/waitlist-signup/index.ts`:
- Validate name + email
- Insert into Supabase `waitlist` table via service_role key
- Handle duplicate email (Postgres 23505 → 409)
- Fire-and-forget welcome email via Resend
- Return `{ success: true }`

### 3.2 `POST /api/create-checkout`
Port from `supabase/functions/create-checkout/index.ts`:
- Look up waitlist entry by email
- Verify not already paid
- Create Stripe Checkout Session ($80, payment mode)
- Return `{ url: session.url }`

### 3.3 `POST /api/stripe-webhook`
Port from `supabase/functions/stripe-webhook/index.ts`:
- Verify Stripe signature (use `stripe.webhooks.constructEvent` — the official SDK method)
- Handle `checkout.session.completed`
- Update waitlist entry (paid=true, stripe_session_id, amount_paid)
- Send confirmation email via Resend
- Return `{ received: true }`

### 3.4 Email Templates
- Migrate inline HTML email strings to React Email components (`@react-email/components`)
- `welcome.tsx` — waitlist welcome email
- `preorder-confirm.tsx` — payment confirmation email
- Render with `render()` from `@react-email/render` before sending via Resend

---

## Phase 4: Legal Pages

### 4.1 Privacy Policy (`/privacy`)
Must cover:
- What data you collect (name, email, payment info via Stripe)
- How it's used (waitlist communication, order fulfillment)
- Third parties (Stripe for payments, Resend for email, Supabase for storage)
- Data retention
- Contact info (hello@ordospaces.com)

### 4.2 Terms of Service (`/terms`)
Must cover:
- Pre-order nature (product not yet shipped)
- No guarantee on delivery timeline
- Limitation of liability
- Governing law

### 4.3 Refund Policy (`/refund`)
Must cover:
- Pre-order refund window (full refund before shipping)
- Post-delivery return policy
- How to request a refund (email)
- Processing timeline

---

## Phase 5: Infrastructure & Monitoring

### 5.1 Vercel Deployment
- Connect GitHub repo to Vercel
- Set environment variables in Vercel dashboard
- Configure custom domain `ai.ordospaces.com`
- Remove CNAME file (Vercel handles DNS)
- Enable Vercel Analytics (built-in, free tier)

### 5.2 Analytics
- Add Vercel Analytics (`@vercel/analytics`) — page views, web vitals, zero config
- Add Vercel Speed Insights (`@vercel/speed-insights`) — Core Web Vitals monitoring
- Consider PostHog later for funnel analysis (waitlist → preorder conversion)

### 5.3 Error Monitoring
- Add Sentry (`@sentry/nextjs`) for error tracking in both client and API routes
- Configure source maps upload
- Set up Slack alerts for errors

### 5.4 SEO
- `app/sitemap.ts` — generates sitemap dynamically
- `app/robots.ts` — generates robots.txt dynamically
- `app/opengraph-image.tsx` or static `public/og-image.png`
- Structured data (JSON-LD) in layout metadata

---

## Phase 6: Cleanup

- Delete `index.html`, `assets/`, `hardware.webp` from root (moved to `public/` and components)
- Delete `supabase/functions/` (replaced by API routes)
- Keep `supabase/config.toml` and `supabase/migrations/` (still using Supabase DB)
- Delete `CNAME` (Vercel handles domain)
- Delete old `robots.txt` and `sitemap.xml` (generated by Next.js now)
- Update `.gitignore` for Next.js (`.next/`, `node_modules/`, etc.)
- Remove Python-related ignores from `.gitignore`

---

## Implementation Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
  Setup     Frontend   Backend    Legal     Infra     Cleanup
```

Each phase is independently deployable. The site works on Vercel after Phase 2 with the old Supabase Edge Functions still running. Phase 3 swaps the backend. Phase 4-5 add polish. Phase 6 removes dead files.

---

## Dependencies to Install

```
# Core
next react react-dom typescript @types/react @types/node

# Styling
tailwindcss @tailwindcss/postcss

# Backend
@supabase/supabase-js stripe resend @react-email/components @react-email/render

# Monitoring
@vercel/analytics @vercel/speed-insights @sentry/nextjs

# Dev
eslint eslint-config-next
```
