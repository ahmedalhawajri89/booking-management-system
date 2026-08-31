# UI/UX Audit — Booking Management System

**Audited build:** Vue 3.5 · JavaScript · Vite 6 · Tailwind CSS 4 · Pinia · Vue Router 4
**Scope:** 23 source files · 2,221 LOC · 6 routes · 12 components
**Method:** static inspection of every route, component, store and type; runtime walkthrough of all six routes and the full booking wizard; measured token/consistency counts across the codebase.

---

## 0. Headline finding

> The product is currently a **marketing site with a public booking wizard and a static admin mock-up** — not a booking management system.

Three facts establish this, and they gate everything else in this document:

1. **There is no data layer.** A search for `fetch(`, `axios`, `localStorage`, `sessionStorage`, `indexedDB` across `src/` returns **0 results**. Nothing is ever read or written.
2. **The two halves of the app are not connected.** `BookingView` collects a service, a date and a time, then `submit()` waits 1,500 ms and advances a step counter. It never produces a booking record. `DashboardView` renders a *separate* hardcoded array (`recentBookings`). Booking something in the wizard has no effect anywhere in the product.
3. **The domain model cannot express a booking.** There is no `Booking` entity, no `Customer` entity, no availability model, and no payment concept. What exists is a display-shaped `BookingRecord` (see §3).

Everything below is written against that reality. The visual layer is in good shape; the **product layer is missing**, and no amount of UI polish substitutes for it.

---

## 1. Current state

### 1.1 Routes

| Route | View | Purpose | Auth | Verdict |
|---|---|---|---|---|
| `/` | `HomeView` | Marketing landing | public | Complete for its purpose |
| `/booking` | `BookingView` | 3-step public booking wizard | public | Functional UI, no persistence |
| `/dashboard` | `DashboardView` | Operator overview | **none** | Static mock-up |
| `/login` | `LoginView` | Sign in | public | Cosmetic — no auth |
| `/register` | `RegisterView` | Sign up | public | Cosmetic — no auth |
| `/profile` | `ProfileView` | Account settings | **none** | Local-only form |
| `/:pathMatch(.*)*` | → `/` | Catch-all | — | Silent redirect, no 404 page |

**`/dashboard` and `/profile` are publicly reachable.** There are no navigation guards. `LoginView.handleLogin()` performs a presence check on two fields and calls `router.push('/dashboard')` — any string passes.

### 1.2 Component inventory

| Component | LOC | Reusable? | Notes |
|---|---|---|---|
| `AppNavbar` | 49 | marketing only | No mobile menu |
| `AppFooter` | 69 | marketing only | 16 dead links live here and elsewhere |
| `AppLogo` | 19 | yes | Good |
| `UserAvatar` | 16 | yes | Good |
| `BrandIcon` | 34 | yes | Good |
| `ServiceCard` | 56 | booking only | Good |
| `BookingSummary` | 120 | booking only | Step logic duplicated 3× inline |
| `StatCard` | 32 | dashboard only | Good |
| `BookingsChart` | 94 | dashboard only | Good |

**There is no shared primitive layer.** No `Button`, `Input`, `Select`, `Badge`, `Table`, `Modal`, `Drawer`, `EmptyState`. Every screen re-declares those from raw Tailwind, which is the root cause of §2.1.

---

## 2. UI problems

### 2.1 P0 — The same button is written eight different ways

Measured across the codebase, the primary action button has **8 distinct class signatures**:

| # | Padding | Weight | Radius | Focus ring |
|---|---|---|---|---|
| 1 | `px-4 py-2.5` | medium | `xl` | ❌ |
| 2 | `px-6 py-2.5` | medium | `xl` | ❌ |
| 3 | `px-4 py-3` | medium | `xl` | ❌ |
| 4 | `px-8 py-3.5` | bold | `xl` | ❌ |
| 5 | `px-10 py-3.5` | bold | `xl` | ❌ |
| 6 | `px-6 py-3.5` | bold | `xl` | ❌ |
| 7 | `px-4 py-3.5` | bold | `xl` | ✅ |
| 8 | `px-8 py-4` | bold | `full` | ❌ |

Six padding pairs, two weights, two radii — and **only 1 of 8 defines a focus ring**. The same is true of inputs (three styles), cards (`glass-card` vs. ad-hoc `border + bg-white` vs. `rounded-2xl border-2`) and status pills.

### 2.2 P1 — No radius or elevation rule

| Token | Distinct values in use |
|---|---|
| Radius | 6 — `rounded`, `md`, `lg`, `xl`, `2xl`, `full` |
| Shadow | 7 — `shadow`, `sm`, `md`, `lg`, `xl`, `2xl`, `none` |

Radius and elevation are chosen per-element rather than by meaning, so nothing communicates hierarchy. Elevation in particular is decorative: a stat card and a modal-weight surface can carry the same shadow.

### 2.3 P1 — Gradient is over-applied for an operational tool

`btn-sunset` (a four-stop gradient) is applied **11 times**, including to the sidebar's active nav item, sub-navigation items, table badges and the notification dot. On a marketing page this reads as brand; on a dense operations screen it produces competing focal points and makes it impossible to tell which action on screen is the primary one. The brief explicitly asks to avoid "excessive gradients" — the operator surface currently violates that.

### 2.4 P2 — Feature-card colour chips drift outside the system

`HomeView` assigns six ad-hoc gradient pairs (`from-amber-400 to-orange-500` … `from-pink-400 to-fuchsia-500`) inline in the view. They are not tokens, they are not reusable, and `fuchsia` sits outside the declared palette.

---

## 3. UX problems

### 3.1 P0 — The domain model is display-shaped, not data-shaped

```ts
// src/types/index.js — as it exists today
interface Service       { price: string; duration: string; /* "150 ر.س", "30 دقيقة" */ }
type BookingStatus =    'مكتمل' | 'قادم' | 'ملغي'   // Arabic labels used as the enum
interface BookingRecord { id; customer: string; service: string; date: string; status }
```

Consequences, each of which blocks a core requirement in the brief:

| Field | Stored as | What it prevents |
|---|---|---|
| `price` | `"150 ر.س"` | Any sum, sort, revenue figure or payment reconciliation |
| `duration` | `"30 دقيقة"` | End-time calculation → **no conflict detection, no calendar blocks** |
| `date` | `"اليوم، 10:00 ص"` | Sorting, filtering, date-range queries, calendar placement |
| `status` | Arabic literal | Localisation, status transitions, machine logic |
| `customer` | `string` name | Customer profiles, booking history, dedupe, contact actions |
| — | *(absent)* | `paymentStatus`, `notes`, `resource`, `createdAt`, `updatedAt`, audit history |

**Nothing in §5–§9 of the brief (calendar, conflict detection, filtering, customer history, payment status) is implementable until this is fixed.** This is the single highest-priority item in the audit.

### 3.2 P0 — No availability model

`timeSlots` is a flat array of 11 Arabic strings, identical for every date and every service. The wizard offers `05:30 م` on a fully-booked Friday exactly as it offers it on an empty Monday. There is no concept of business hours, capacity, resource, or an existing booking blocking a slot.

### 3.3 P0 — The dashboard cannot answer the operator's questions

The brief asks the dashboard to answer: *what is happening today, what is next, what needs action, what is late or pending, what is availability, what are the alerts.* The current dashboard answers **none** of them. It shows three vanity metrics (today's bookings / total customers / monthly revenue), a weekly trend chart and four rows of "recent bookings" — the exact `Sidebar + 4 stat cards + chart + table` shape the brief names as the thing to avoid. There is no "needs attention" concept anywhere in the codebase.

### 3.4 P0 — No booking detail view

There is no route, drawer or modal that shows a single booking. The operator cannot open a booking, let alone confirm, reschedule, cancel, take payment or contact the customer. The row-level `⋯` button in the dashboard table has no handler.

### 3.5 P0 — No customers, no search, no filtering

The sidebar links for **المواعيد**, **العملاء** and **التقارير المالية** are `href="#"`. The dashboard search input has no `v-model` and no handler. There is no way to find a booking by ID, customer, date, status or service.

### 3.6 P1 — Zero empty, loading and error states

Grep for skeleton/empty/error patterns across all views returns **two results**, both `toast.error` calls in auth forms. Every list and card renders as if data is always present and instant. When the data layer arrives, every screen will need these states retrofitted — cheaper to design them now.

### 3.7 P1 — Wizard state is destroyed on navigation

`BookingView` calls `booking.reset()` in `onUnmounted`. A user who reaches step 3 and taps back loses everything with no warning and no draft recovery.

### 3.8 P1 — Wizard collects contact details it never reads

Step 3's four fields (first name, last name, phone, notes) have no `v-model`. They are decorative. The confirmation screen then promises *"تم إرسال تفاصيل الموعد إلى بريدك الإلكتروني ورقم جوالك"* — a message about data the app never captured.

### 3.9 P2 — Booking wizard is 3 steps where 1 screen would do

Three services, one resource, eleven fixed slots. For an operator creating a booking on behalf of a walk-in customer, a stepper is the wrong shape: it hides the price until step 3 and prevents changing the service without walking back. The brief asks explicitly to minimise steps.

---

## 4. Navigation problems

| # | Problem | Severity |
|---|---|---|
| 1 | **16 dead `href="#"` links** across footer, dashboard sidebar and profile sub-nav | P0 |
| 2 | Dashboard sidebar is `hidden lg:flex` → **no navigation at all below 1024 px** | P0 |
| 3 | Marketing navbar links are `hidden md:flex` with **no hamburger** → dead end below 768 px | P0 |
| 4 | No breadcrumbs, no back affordance, no active-route indication outside the sidebar | P1 |
| 5 | Two disconnected shells (marketing vs. app) with no switch between them | P1 |
| 6 | 404s silently redirect to `/` — the user is never told the URL was wrong | P2 |
| 7 | Profile's own sub-navigation (الإشعارات / الأمان / سجل الحجوزات) is 4 dead links | P1 |

---

## 5. Accessibility problems

Total ARIA/`role` attributes in the entire codebase: **11**, across 4 of 23 files.

| # | Problem | WCAG | Severity |
|---|---|---|---|
| 1 | **7 icon-only buttons**; only some carry `aria-label` | 4.1.2 | P0 |
| 2 | Focus styles on **1 of 8** primary buttons; no global `:focus-visible` | 2.4.7 | P0 |
| 3 | Status conveyed by **colour + text only, no icon or shape** — fails the brief's own §10 rule | 1.4.1 | P0 |
| 4 | `ServiceCard` is a `<button>` wrapping headings — announced as one long string | 4.1.2 | P1 |
| 5 | Date/time pickers are unlabelled `<button>` grids, not a `radiogroup`; no arrow-key navigation | 2.1.1 | P1 |
| 6 | Toasts are the only error channel; not tied to inputs via `aria-describedby`/`aria-invalid` | 3.3.1 | P1 |
| 7 | Step changes are not announced (no live region) | 4.1.3 | P1 |
| 8 | Gradient-on-white pill text (`+18% هذا الأسبوع`, white on `#fbbf24`) is below 4.5:1 | 1.4.3 | P1 |
| 9 | Several tap targets below 44×44 (`⋯` action, notification bell) | 2.5.5 | P2 |
| 10 | No skip-to-content link | 2.4.1 | P2 |

### RTL-specific

| # | Problem | Severity |
|---|---|---|
| 1 | `dir="rtl"` set once on `<html>`; **no LTR islands** for the phone/email inputs that carry `dir="ltr"` but sit inside RTL labels — caret and validation read incorrectly | P1 |
| 2 | Directional icons (`ArrowLeft` used for "next", `ArrowRight` for "back") are hardcoded rather than logical — they are correct for RTL by accident and will invert wrongly if LTR is ever added | P1 |
| 3 | Numerals are Western in Arabic copy with no explicit policy; dates come from `date-fns/locale/ar` while prices are hand-written strings — two different formatting sources | P2 |
| 4 | Chart axis is LTR-ordered inside an RTL layout; the tooltip sets `rtl: true` but the scale does not | P2 |

---

## 6. Responsive problems

| Breakpoint | State | Severity |
|---|---|---|
| < 768 px | Marketing nav links vanish; no menu | P0 |
| < 1024 px | **Dashboard has no navigation whatsoever** | P0 |
| < 1024 px | Hero mock-up `hidden lg:block` — a 600 px empty column is reserved then hidden | P2 |
| all | Bookings table has no mobile treatment — horizontal scroll only, no card fallback | P1 |
| all | `BookingSummary` sidebar becomes a stacked block on mobile, pushing the actual form far down | P1 |
| all | Dashboard chart is fixed `h-72` at every width | P2 |
| all | 5 of 15 components declare no responsive behaviour at all | P2 |

---

## 7. What is genuinely good (keep)

- **Token layer exists and works.** `--color-primary-*`, `--color-accent-*`, warm neutral override and gradient recipes are centralised in `main.css`. Re-theming is a one-file edit.
- **Clean architecture.** `views / components / stores / data / types / router` separation is correct and the store is a proper state machine.
- **Zero external runtime assets.** Avatars and brand marks are inline SVG components.
- **Documented end-to-end.** The domain model lives as JSDoc `@typedef`s in `src/types/index.js`, which editors read through `jsconfig.json`.
- **Motion is restrained** and respects `prefers-reduced-motion`.
- **Route-level code splitting** is already in place.

---

## 8. Priority matrix

### P0 — Critical (product does not function)

| ID | Item | Blocks |
|---|---|---|
| P0-1 | Real domain model — `Booking`, `Customer`, `Service`, `Resource`, `Payment`, ISO dates, numeric money/duration, machine-value statuses | Everything |
| P0-2 | Data layer — seeded repository + Pinia stores, persisted, single source of truth | Everything |
| P0-3 | Connect the wizard to the store so a booking actually exists after confirmation | Core loop |
| P0-4 | Availability engine — business hours + duration + existing bookings → real slots, conflict detection | Calendar, booking |
| P0-5 | Booking detail (drawer) with the real action set | Operations |
| P0-6 | Workflow dashboard — today / next / needs-attention / availability | Brief §4, §11 |
| P0-7 | Bookings list with search + filters | Brief §9 |
| P0-8 | Mobile navigation for both shells | Usability below 1024 px |
| P0-9 | Route guards + honest auth state | Security posture |
| P0-10 | Primitive component layer (`Button`, `Input`, `Badge`, …) | Consistency |
| P0-11 | Focus-visible system + accessible names | WCAG 2.4.7 / 4.1.2 |
| P0-12 | Status system: colour **+ label + icon** | WCAG 1.4.1, brief §10 |

### P1 — High

| ID | Item |
|---|---|
| P1-1 | Customers list + customer profile with booking history |
| P1-2 | Calendar (day / week / agenda) with status-coloured blocks |
| P1-3 | Empty / loading / error / partial states for every data surface |
| P1-4 | Quick-create booking from a single screen (operator path) |
| P1-5 | Radius + elevation scale with semantic rules |
| P1-6 | De-gradient the operator surface; reserve gradient for brand moments |
| P1-7 | Responsive table → card pattern |
| P1-8 | Draft preservation for the public wizard |
| P1-9 | Wire step-3 fields to the store; make the confirmation message true |
| P1-10 | Logical RTL properties + LTR islands for phone/email |
| P1-11 | Inline field validation with `aria-invalid` / `aria-describedby` |

### P2 — Medium

Reschedule flow · payment status transitions · saved filters · booking history/audit trail · notifications surface · 404 page · settings screen · keyboard grid navigation for date/time · chart responsive height · numeral policy.

### P3 — Low

Bulk actions · drag-and-drop rescheduling in calendar · CSV export · print view · command palette (⌘K) · onboarding empty-state tour.

---

## 9. Scoring

| Dimension | Score | Note |
|---|---|---|
| Visual craft | 8/10 | Cohesive palette, clean typography, restrained motion |
| Design system maturity | 3/10 | Tokens exist; no primitives, no rules, 8 button variants |
| Information architecture | 2/10 | 3 of 6 operator destinations are dead links |
| Product completeness | 2/10 | No data layer, no CRUD, no detail view |
| Accessibility | 3/10 | 11 ARIA attributes total; focus and status-colour failures |
| Responsive | 4/10 | No navigation below 1024 px |
| **Overall** | **3.7/10** | A well-styled prototype, not yet a product |

The gap is not visual. It is structural.
