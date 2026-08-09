# Booking Management System

An Arabic-first appointment booking system: customers book a service online without creating an account, and the business manages the whole day from one console.

Built as a complete product rather than a screen mockup — the availability logic, conflict detection and status workflow are all real.

---

## What it does

**For the customer.** Picks a service, sees only the times that are genuinely free, books in four steps and gets a reference code. No sign-up required. The code can be used later to look the booking up, or to cancel it.

**For the operator.** Opens on a day board showing today's schedule against a live now-line. A *needs attention* queue surfaces bookings that are unconfirmed or unpaid. Status and payment can be changed in one click, with undo. Search covers customer name, phone and reference.

---

## The part that matters

Most booking demos store a time as text and let you double-book. This one does not.

**Availability is computed, not stored.** Free slots are generated from the service duration, the buffer time needed between appointments, the resource being booked and the business hours for that weekday. Past times on the current day are excluded automatically.

**Conflicts are detected with half-open interval overlap** — `aStart < bEnd && bStart < aEnd` — so an appointment ending at 10:00 and one starting at 10:00 do not collide, while any real overlap does. Only pending and confirmed bookings block; cancelled ones free their slot immediately.

**The domain model is machine-readable.** Times are ISO 8601 instants, money is stored in minor units, and statuses are machine values rendered through one label map. That is what makes the calendar, the filters and the totals possible at all.

---

## Features

- Guest booking flow with live slot generation and a reference code
- Booking lookup and cancellation by reference, no account needed
- Operator day board with a live now-line and proportional timeline
- Needs-attention queue for unconfirmed and unpaid bookings
- Status and payment workflow with undo on every change
- Conflict detection across services, resources and buffer times
- Customer directory with booking history
- Business hours and service settings
- Full RTL layout using CSS logical properties, with LTR islands for phone numbers
- Keyboard-accessible drawers, focus traps and `prefers-reduced-motion` support

---

## Tech stack

**Vue 3.5** with `<script setup>` · **TypeScript** · **Vite 6** · **Tailwind CSS 4** (`@theme` tokens) · **Pinia** · **Vue Router 4** with route guards · **date-fns** with the Arabic locale · **lucide-vue-next** · **vue-sonner** · **Playwright** for the end-to-end run.

Data lives behind a repository interface, currently backed by `localStorage`. Swapping in a real HTTP API means replacing one file — nothing above it changes.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # production build
npm run qa           # automated Playwright walkthrough
npm run format       # Prettier with the Tailwind class sorter
```

No backend or database is required. Seed data regenerates for the current day on first load, so the schedule is never empty.

---

## Project structure

```
src/
  types/index.ts            domain model — the source of truth
  lib/availability.ts       slot generation, overlap and occupancy
  data/repository.ts        persistence seam (localStorage today, HTTP later)
  data/seed.ts              realistic seed data, re-dated daily
  stores/bookings.ts        Pinia store: queries, mutations, undo
  views/                    public pages and the /app operator console
  components/booking/       drawers, timeline, slot picker
  components/marketing/     landing page sections
  components/ui/            base button, input, drawer, badge
  directives/reveal.ts      scroll-reveal, one shared IntersectionObserver
docs/
  UI_UX_AUDIT.md            what was wrong and why
  INFORMATION_ARCHITECTURE.md
  DESIGN_SYSTEM.md          tokens, elevation, status colour rules
  IMPLEMENTATION_PLAN.md
scripts/qa.mjs              end-to-end walkthrough across 3 viewports
```

---

## Author

**Ahmed Al-Hawajiri** — Full-Stack Developer
[GitHub](https://github.com/ahmedalhawajri89) · [LinkedIn](https://www.linkedin.com/in/ahmedalhawajri)

Licensed under the MIT License.

---

<div dir="rtl">

## نبذة بالعربية

نظام حجز مواعيد عربي بالكامل. الزبون يحجز خدمة أونلاين بدون إنشاء حساب ويستلم رقماً مرجعياً، وصاحب النشاط يدير يومه كامل من لوحة واحدة.

**الجزء المهم في المشروع** ليس الشكل، بل المنطق: المواعيد المتاحة تُحسب لحظياً من مدة الخدمة والفاصل الزمني بين المواعيد وساعات العمل، والتعارض يُكتشف بتداخل الفترات نصف المفتوحة — فموعد ينتهي 10:00 وآخر يبدأ 10:00 لا يتعارضان، بينما أي تداخل حقيقي يُرفض. النتيجة أن المورد لا يمكن حجزه مرتين.

الأوقات مخزّنة بصيغة ISO 8601 والمبالغ بالوحدات الصغرى والحالات بقيم برمجية — وهذا ما يجعل التقويم والفلاتر والمجاميع ممكنة أصلاً.

**التقنيات:** Vue 3 و TypeScript و Tailwind CSS 4 و Pinia و Vite، مع اختبارات Playwright. طبقة البيانات معزولة خلف واجهة واحدة، فاستبدال التخزين المحلي بـ API حقيقي يتطلب تعديل ملف واحد فقط.

المشروع مرفق بتوثيق مكتوب: تدقيق تجربة المستخدم، معمارية المعلومات، ونظام التصميم.

</div>
