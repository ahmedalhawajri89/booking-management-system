# Booking Management System — Vue 3

An Arabic-first (RTL) booking management product: a guest booking flow and a dense operator console, built on a real domain model with a live availability engine.

Rebuilt from a Next.js prototype after a full UX/UI audit. The audit, information architecture, design system and implementation plan are in [`docs/`](./docs).

---

## What it actually does

**For the customer**

- Books online in three steps, seeing only genuinely free times
- Gets a quotable reference (`BK-2026-0431`)
- Looks the booking up later at `/booking/:reference` (verified by phone) and can cancel it
- A refresh mid-flow does not lose the draft

**For the operator**

- **Today** — what needs action, the day as a proportional timeline with a now-line, what's next, and live occupancy
- **Calendar** — day and agenda views over the same data
- **Bookings** — search by reference, name or phone, with quick filters and facets
- **Booking detail** — a drawer that is the single source of truth: status-aware actions (confirm · reschedule · complete · no-show · cancel), payment recording, contact, and a full audit trail. Destructive actions ship an undo.
- **Customers** — profiles with lifetime stats derived from bookings, never invented
- Keyboard: `/` focuses search, `N` opens the create drawer, `Esc` closes overlays

---

## Architecture

```
src/
├── types/         Domain model — ISO instants, minor-unit money, machine-value statuses
├── lib/
│   ├── availability.ts  The slot engine: business hours − duration − buffer − existing bookings
│   ├── format.ts        Every user-visible number and date (Intl + date-fns/ar)
│   ├── status.ts        Status → label + icon + tone, and legal transitions
│   └── clone.ts
├── data/
│   ├── catalog.ts       Services, resources, business hours
│   ├── seed.ts          Demo data anchored to "today", including a deliberate conflict
│   └── repository.ts    The persistence seam — swap for an HTTP client, nothing else changes
├── stores/        Pinia: bookings, customers, auth
├── components/
│   ├── ui/        Button, Input, SearchInput, StatusBadge, Drawer, ConfirmDialog, EmptyState, Skeleton
│   └── booking/   DateStrip, TimeSlotGrid, BookingRow, DayTimeline, detail & form drawers
├── layouts/       OperatorLayout (rail → icons → bottom tabs)
└── views/         Guest: Home, Booking, MyBooking · Operator: Today, Calendar, Bookings, Customers, Settings
```

### Availability is computed, never stored

```
slots = grid(businessHours[weekday], 30min)
      − slots that would end after closing
      − slots overlapping a pending/confirmed booking on that resource
      − slots in the past
```

One function feeds the guest wizard, the operator form, conflict detection and the occupancy bar — so they cannot disagree.

### Swapping in a real backend

`src/data/repository.ts` is the only file that knows where data lives. It ships a `localStorage` implementation behind a `Repository` interface; replacing it with a Laravel/REST client requires no change in any component or store.

---

## Design system

Documented in [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md), implemented in `src/assets/main.css`.

- **Two surfaces, one system** — the guest side is warm and spacious; the operator side is neutral and dense. Gradient is a brand moment on marketing screens and appears **zero times** inside `/app`.
- **Radius encodes permanence** (badge 4 → button 8 → card 12 → drawer 16), not decoration.
- **Border-first elevation** — four shadow levels, warm-tinted, because stacked shadows turn a dense screen to mud.
- **Status is never colour-alone** — always tone + label + icon.
- Warm stone neutrals override Tailwind's cool greys so every surface shares one temperature.

### Accessibility

One global `:focus-visible` ring · every icon-only control has an accessible name · drawers trap focus, close on `Esc` and restore focus · date and time pickers are `radiogroup`s with arrow-key navigation · inputs own their label, error, `aria-invalid` and `aria-describedby` · skip-to-content link · `prefers-reduced-motion` honoured · touch targets ≥ 44 px.

### RTL

Logical properties throughout (`ms/me`, `ps/pe`, `inset-inline-*`) · LTR islands for phone, email and reference codes · dates via `date-fns/ar`, money via `Intl.NumberFormat('ar-SA')` · drawers slide from the inline-end edge so the direction inverts correctly.

---

## Tech stack

**Vue 3.5 (Composition API, `<script setup>`) · TypeScript · Vite 6 · Tailwind CSS 4 · Pinia · Vue Router 4 · date-fns · lucide-vue-next · vue-sonner**

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # vue-tsc + production build
npm run type-check
npm run format       # prettier with Tailwind class sorting
npm run qa           # end-to-end walkthrough + screenshots at 4 widths
```

Sign in with any email and a 6+ character password — the demo session is local only.

`npm run qa` drives a real browser through the guard redirect, the 404, the full guest booking flow, the reference lookup, sign-in, the operator search, the detail drawer and a status change, then captures three viewport sizes and fails loudly on any console error.

---

## Author

**Ahmed Al-Hawajiri** — Full-Stack Web Developer · Palestine

---

<div dir="rtl">

### نبذة

نظام إدارة حجوزات عربي (RTL) مبني على نموذج بيانات حقيقي ومحرك توافر يحسب الأوقات المتاحة من ساعات العمل ومدة الخدمة والحجوزات القائمة — فيكشف التعارضات ويمنع الحجز المزدوج.

يضم واجهة عميل لحجز موعد ومتابعته لاحقاً برقم مرجعي، ولوحة مشغّل تعرض ما يحتاج إجراءً وجدول اليوم كخط زمني، مع درج تفاصيل يمثّل المصدر الوحيد للحقيقة لكل حجز.

</div>
