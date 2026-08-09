# Information Architecture — Booking Management System

Derived from the functionality that exists or is explicitly implied by the current code. Nothing here assumes a feature the product cannot support once the domain model in §2 is in place.

---

## 1. Two shells, one product

The product serves two audiences with opposite needs. They must not share a layout.

| | **Guest shell** | **Operator shell** |
|---|---|---|
| Who | The customer booking an appointment | The business managing the day |
| Sessions | One, a few minutes long | All day, continuous |
| Density | Low — one decision per screen | High — many bookings at a glance |
| Primary goal | Complete one booking | Find, judge and act on bookings fast |
| Chrome | Marketing navbar + footer | Persistent rail + context bar |
| Routes | `/`, `/book`, `/booking/:ref` | `/app/*` |

The current build renders the operator dashboard inside a marketing-adjacent layout. Splitting the shells is the first structural change.

---

## 2. Domain model

The vocabulary the whole IA depends on. Money is stored in minor units, durations in minutes, times in ISO 8601 — never as display strings.

```ts
type BookingStatus  = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
type PaymentStatus  = 'unpaid' | 'deposit_paid' | 'paid' | 'refunded'
type BookingChannel = 'online' | 'phone' | 'walk_in'

interface Service {
  id: string
  name: string
  durationMin: number        // 30
  priceMinor: number         // 15000  → 150.00 ر.س
  bufferMin: number          // clean-up gap after the appointment
  resourceIds: string[]      // which rooms/staff can deliver it
  isActive: boolean
}

interface Resource {         // room, chair, practitioner — the thing that can be double-booked
  id: string
  name: string
  isActive: boolean
}

interface Customer {
  id: string
  name: string
  phone: string              // the identity key in this market
  email?: string
  notes?: string
  createdAt: string
}

interface Booking {
  id: string
  reference: string          // human-quotable, e.g. BK-2026-0431
  customerId: string
  serviceId: string
  resourceId: string
  startAt: string            // ISO — the single source of truth for "when"
  endAt: string              // derived: startAt + durationMin + bufferMin
  status: BookingStatus
  paymentStatus: PaymentStatus
  priceMinor: number         // snapshot at booking time; services change price
  channel: BookingChannel
  notes?: string
  createdAt: string
  updatedAt: string
  history: BookingEvent[]    // append-only audit trail
}

interface BookingEvent {
  at: string
  type: 'created' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed'
       | 'no_show' | 'payment_recorded' | 'note_added'
  summary: string
  from?: string              // for reschedules and status changes
  to?: string
}

interface BusinessHours {    // per weekday, drives availability
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  open: string               // "09:00"
  close: string              // "18:00"
  isClosed: boolean
}
```

**Availability is computed, never stored.** For a given service, resource and date:

```
slots = grid(businessHours[weekday], step = 15min)
      − slots that would end after close
      − slots overlapping any booking on that resource where status ∈ {pending, confirmed}
      − slots in the past
```

This one function makes conflict detection, the calendar and the wizard all correct from the same source.

---

## 3. Status system

Status is the most-read piece of information in the product. It is never communicated by colour alone.

| Status | Arabic | Icon | Tone | Meaning | Allowed transitions |
|---|---|---|---|---|---|
| `pending` | بانتظار التأكيد | `Clock` | warning | Requested, not yet accepted | → confirmed, cancelled |
| `confirmed` | مؤكد | `CheckCircle2` | info | Accepted and scheduled | → completed, no_show, cancelled |
| `completed` | مكتمل | `CircleCheckBig` | success | Service delivered | → *(terminal)* |
| `cancelled` | ملغي | `XCircle` | neutral-muted | Called off by either side | → *(terminal)* |
| `no_show` | لم يحضر | `UserX` | danger | Customer did not arrive | → *(terminal)* |

| Payment | Arabic | Icon | Tone |
|---|---|---|---|
| `unpaid` | غير مدفوع | `CircleDashed` | neutral |
| `deposit_paid` | عربون مدفوع | `CircleDotDashed` | warning |
| `paid` | مدفوع | `BadgeCheck` | success |
| `refunded` | مسترجع | `Undo2` | neutral-muted |

**Needs-attention rule** — a booking demands operator action when any of:
- `status = pending` and `startAt` is within 24 h
- `status = confirmed`, `startAt` is in the past, and it was never completed or marked no-show
- `paymentStatus = unpaid` and `startAt` is within 2 h
- a scheduling conflict exists on its resource

This predicate is what the dashboard is built around — not a metric.

---

## 4. Booking lifecycle

```
                    ┌─────────── online (guest wizard) ────────┐
                    │                                          ▼
  availability ──►  request  ──►  PENDING  ──confirm──►  CONFIRMED  ──►  service window
                    ▲                 │                     │                  │
                    │                 │ cancel              │ reschedule       ├─► COMPLETED
       phone / walk-in (operator)     ▼                     ▼                  │
       creates as CONFIRMED       CANCELLED           new startAt              └─► NO_SHOW
                                                    (history entry)

  payment runs alongside: unpaid ─► deposit_paid ─► paid ─► refunded
```

Two entry points, deliberately different:
- **Guest** books online → lands in `pending` → operator confirms.
- **Operator** books by phone or for a walk-in → created directly as `confirmed`; no approval round-trip.

---

## 5. Navigation

### 5.1 Guest shell

```
/                     الرئيسية        marketing landing
/book                 احجز موعدك      booking flow
/booking/:reference   حجزي            lookup by reference + phone → view / cancel
```

`/booking/:reference` closes the loop the product currently leaves open: today a customer books and can never see that booking again.

### 5.2 Operator shell — `/app`

Primary rail (5 destinations — the ceiling before a rail stops being scannable):

| Order | Route | Label | Icon | Why it earns a slot |
|---|---|---|---|---|
| 1 | `/app` | اليوم | `Sun` | The default working surface |
| 2 | `/app/calendar` | التقويم | `CalendarDays` | Time is the product's main axis |
| 3 | `/app/bookings` | الحجوزات | `ListChecks` | Find anything, any date, any status |
| 4 | `/app/customers` | العملاء | `Users` | Identity and history |
| 5 | `/app/settings` | الإعدادات | `Settings` | Services, hours, resources |

Deliberately **not** in the rail: "التقارير المالية" — reporting on ~4 seed bookings is a vanity screen. It returns when there is data worth reporting.

Global, present in the context bar on every operator screen:
- **Search** (`/`) — reference, customer name, phone
- **New booking** (`N`) — opens the create drawer over the current screen
- **Needs attention** badge — count of the §3 predicate, links to the filtered list

### 5.3 Overlays, not pages

Anything that must preserve the operator's place is a drawer, never a route change:

| Overlay | Trigger | Width |
|---|---|---|
| Booking detail | Any booking row / calendar block | 480 px → full-screen sheet on mobile |
| Create booking | `N` or "حجز جديد" | 520 px → full-screen sheet |
| Reschedule | From booking detail | 480 px |
| Customer profile | Any customer name | 480 px |
| Confirm destructive | Cancel / no-show | centred dialog, 400 px |

---

## 6. Screens

### 6.1 `/app` — Today

Built around the operator's questions, in the order they are asked. **Not** a stat-card grid.

```
┌─ context bar ──────────────────────────────────────────────────┐
│  الأحد ٩ أغسطس      [ بحث / ]      [ يحتاج إجراء ٣ ]   [ حجز جديد ]│
├────────────────────────────────────────────────────────────────┤
│  ▸ يحتاج إجراء              only rendered when count > 0         │
│    3 bookings, each with its reason and a one-tap resolution    │
├──────────────────────────────┬─────────────────────────────────┤
│  ▸ الجدول الزمني لليوم        │  ▸ التالي                        │
│    hour rail 09:00→18:00     │    the next 3 bookings           │
│    booking blocks by status  │                                  │
│    free gaps shown as gaps   │  ▸ نبض اليوم                     │
│    ── now line ──            │    booked / free hours,          │
│                              │    occupancy bar, unpaid count   │
└──────────────────────────────┴─────────────────────────────────┘
```

The day timeline **is** the dashboard. Availability is legible as literal empty space rather than as a number.

### 6.2 `/app/calendar`

Day · Week · Agenda (month deferred to P2 — it cannot show times, which is what this business reads).

- Resource columns in day view when more than one resource exists
- Status-coloured blocks with icon + customer + service
- Click empty space → create drawer pre-filled with that time
- Conflicts drawn as an overlap badge, not silently stacked
- Drag-to-reschedule: **P3** — needs an undo path before it is safe

### 6.3 `/app/bookings`

The find-anything surface.

- Quick filters: اليوم · الأسبوع · بانتظار التأكيد · غير مدفوع · يحتاج إجراء
- Facets: status, payment, service, resource, date range
- Sort: date, created, customer
- Row → detail drawer
- Desktop table ↔ mobile card list, same data, same actions
- Empty state distinguishes *no bookings yet* from *no results for this filter* — different messages, different CTAs

### 6.4 Booking detail drawer — single source of truth

```
BK-2026-0431                                   [مؤكد] [مدفوع]
──────────────────────────────────────────────────────────
الأحد ٩ أغسطس ٢٠٢٦ · ١٠:٠٠ ص – ١٠:٣٠ ص · غرفة ١
استشارة طبية متخصصة · ١٥٠٫٠٠ ر.س
──────────────────────────────────────────────────────────
العميل    أحمد سعيد · ٠٥٠ ١٢٣ ٤٥٦٧  → customer profile
ملاحظات   …
──────────────────────────────────────────────────────────
السجل     أُنشئ ٧ أغسطس · أُكِّد ٧ أغسطس · دفع ٨ أغسطس
──────────────────────────────────────────────────────────
[ تأكيد ]  [ إعادة جدولة ]  [ تسجيل دفعة ]  [ اتصال ]   [ إلغاء ]
   ▲ primary action varies by status        destructive, last, muted
```

The action row is **status-aware**: a `pending` booking leads with تأكيد; a `confirmed` one that has already started leads with إكمال / لم يحضر.

### 6.5 `/app/customers`

List → profile drawer: contact, lifetime stats (total bookings, completed, no-shows, spend), upcoming bookings, full history. Every number is derived from bookings — nothing invented.

### 6.6 `/app/settings`

Services (name, duration, price, buffer, active) · Business hours per weekday · Resources · Account. These are the inputs the availability engine reads, so they are functional, not decorative.

---

## 7. User flows

### 7.1 Guest books online

```
/ → احجز الآن → /book
  ├ 1 الخدمة        cards; price and duration visible immediately
  ├ 2 الموعد        7-day strip → real slots for that service+date
  ├ 3 بياناتك       name, phone (required), email, notes — bound to the store
  └ 4 تأكيد         reference shown + "احفظ هذا الرقم" + link to /booking/:reference
                    booking created with status=pending, channel=online
```

Draft is persisted, so a refresh or an accidental back does not destroy progress.

### 7.2 Operator creates a booking (phone / walk-in)

**One screen, not a stepper.** Target: under 20 seconds.

```
N → create drawer
  service ▾   date ▸  slot ▸        ← slots recompute live from availability
  customer: search by phone → existing, or inline "add new" (name + phone)
  price auto-filled from service · editable
  payment: unpaid | deposit | paid
  notes
  [ إنشاء الحجز ]  → created as confirmed
```

### 7.3 Confirm a pending booking

`/app` → يحتاج إجراء → row → drawer → تأكيد → status `confirmed`, history entry appended, toast with undo.

### 7.4 Reschedule

Drawer → إعادة جدولة → date + slot picker showing only genuinely free times → confirm → old and new times both written to history.

### 7.5 Cancel

Drawer → إلغاء → confirmation dialog naming the customer and time → status `cancelled`, history entry, undo toast.

### 7.6 Find a booking

Search (`/`) accepts reference, name or phone → results grouped by upcoming / past → Enter opens the drawer.

---

## 8. Route map

| Route | Shell | Guard | Screen |
|---|---|---|---|
| `/` | guest | — | Landing |
| `/book` | guest | — | Booking flow |
| `/booking/:reference` | guest | reference + phone | My booking |
| `/login` | auth | redirect if signed in | Sign in |
| `/register` | auth | redirect if signed in | Sign up |
| `/app` | operator | `requiresAuth` | Today |
| `/app/calendar` | operator | `requiresAuth` | Calendar |
| `/app/bookings` | operator | `requiresAuth` | Bookings |
| `/app/customers` | operator | `requiresAuth` | Customers |
| `/app/settings` | operator | `requiresAuth` | Settings |
| `/:pathMatch(.*)*` | guest | — | **404 page** (not a silent redirect) |

Overlay state (`?booking=BK-…`) lives in the query string so a drawer is linkable and survives refresh.

---

## 9. Responsive strategy

| Element | ≥1280 | 1024–1279 | 768–1023 | <768 |
|---|---|---|---|---|
| Operator rail | expanded | icons + labels | icon rail | **bottom tab bar** |
| Context bar | full | full | search → icon | search → icon, title truncates |
| Today | 2 columns | 2 columns | stacked | stacked, timeline first |
| Calendar | week | week | day | agenda |
| Bookings | table | table | table (scroll) | **card list** |
| Drawers | 480–520 px | 480 px | 60% | **full-screen sheet** |
| Detail actions | inline row | inline row | inline row | **sticky bottom bar** |

Mobile is a different arrangement of the same information — never the desktop layout scaled down.
