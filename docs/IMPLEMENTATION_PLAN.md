# Implementation Plan

Ordered so that each phase is usable on its own and nothing is built twice. Dependencies run strictly downward — no phase reaches back up.

---

## Phase 0 — Foundation *(P0, blocks everything)*

**Domain + data layer.** Without this the product cannot manage bookings; with it, every later phase is straightforward.

- Rewrite `types/` per IA §2 — ISO dates, `priceMinor`, `durationMin`, machine-value statuses
- `Customer`, `Resource`, `BusinessHours`, `BookingEvent` entities
- `lib/availability.ts` — the slot engine and conflict detection
- `lib/format.ts` — `Intl` money/date/time, one source of truth
- Seed data: ~30 bookings across past/today/future, 12 customers, 3 services, 2 resources — enough for empty, sparse and dense states to be real
- Pinia stores: `bookings`, `customers`, `services`, `auth` — persisted to `localStorage` behind a repository interface so a real API can replace it without touching components

**Done when:** `availability(service, resource, date)` returns correct slots and a booking created in one place is visible everywhere.

---

## Phase 1 — Design system in code *(P0)*

- Token layer restructured to primitive → semantic (DS §1)
- Radius, elevation, spacing and type scales enforced
- Primitives: `Button`, `IconButton`, `Input`, `Select`, `SearchInput`, `StatusBadge`, `Card`, `Drawer`, `Modal`, `ConfirmDialog`, `Toast`, `EmptyState`, `Skeleton`, `Tabs`, `Tooltip`
- Global `:focus-visible` ring
- Gradient removed from every operator surface

**Done when:** one `Button` component replaces all 8 signatures and focus is visible everywhere.

---

## Phase 2 — Shells & navigation *(P0)*

- Split `GuestLayout` / `OperatorLayout` / `AuthLayout`
- Operator rail (expanded → icon → bottom tabs) with active state
- Context bar: search, needs-attention badge, new-booking
- Route guards + honest auth store
- Mobile menu for the marketing navbar
- Real 404 page
- Every `href="#"` either wired or removed

**Done when:** every destination is reachable at 320 px and no dead link remains.

---

## Phase 3 — Today *(P0)*

Attention list · day timeline with now-line · next-up · occupancy. Empty, loading and error states designed alongside, not after.

---

## Phase 4 — Bookings *(P0)*

Filterable list · quick filters and facets · table ↔ card responsive swap · both empty states (first-run vs. no-results).

---

## Phase 5 — Booking detail drawer *(P0)*

Status-aware action row · history timeline · confirm / reschedule / cancel / payment / contact · undo on destructive actions · linkable via `?booking=`.

---

## Phase 6 — Create & reschedule *(P0)*

Single-screen operator create (target < 20 s) · customer picker with inline create · live availability · reschedule reusing the same slot picker.

---

## Phase 7 — Calendar *(P1)*

Day · week · agenda · resource columns · status-coloured blocks · click-empty-space to create · conflict indicator.

---

## Phase 8 — Customers *(P1)*

List with search · profile drawer with derived lifetime stats and full booking history.

---

## Phase 9 — Guest flow rebuild *(P1)*

Wizard bound to the real store · draft persistence · fields actually captured · reference number issued · `/booking/:reference` lookup so the customer can see and cancel their own booking.

---

## Phase 10 — Settings *(P2)*

Services · business hours · resources — the inputs the availability engine reads.

---

## Phase 11 — Responsive pass *(P0/P1)*

Every screen at 320 / 768 / 1024 / 1440. Bottom tabs, full-screen sheets, sticky action bars, card fallbacks.

---

## Phase 12 — Accessibility pass *(P0/P1)*

Keyboard path · focus traps · live regions · labels and error wiring · contrast verification · RTL logical properties and LTR islands.

---

## Phase 13 — QA *(P0)*

`vue-tsc` clean · zero console errors · every route and flow walked · automated screenshots at four widths · axe pass · final visual review against DS §13.

---

## Sequencing

```
Phase 0 ──► Phase 1 ──► Phase 2 ──┬─► Phase 3 ──► Phase 5 ──► Phase 6
                                  ├─► Phase 4 ──────┘
                                  ├─► Phase 7
                                  ├─► Phase 8
                                  ├─► Phase 9
                                  └─► Phase 10
                                          └──► 11 ──► 12 ──► 13
```

Phases 0–6 constitute the minimum honest "booking management product". 7–10 complete it. 11–13 are quality gates applied to whatever exists.

---

## Risk register

| Risk | Mitigation |
|---|---|
| The rewrite breaks the marketing page, which is currently the strongest asset | Guest shell is touched only in Phase 9; landing page keeps its gradient identity |
| Scope creep into a real backend | Repository interface with a `localStorage` implementation — swappable, not required |
| Seed data too clean to expose edge cases | Seed deliberately includes a conflict, a no-show, an unpaid imminent booking and a past-uncompleted booking |
| Calendar is the largest single build | Day view first; week and agenda are additive |
