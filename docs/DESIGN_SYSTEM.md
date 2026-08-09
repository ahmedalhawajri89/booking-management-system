# Design System — "Operator" Design Language

The design language for this product, written for an Arabic-first, RTL, information-dense booking tool. It is not a general SaaS kit; every rule below exists because of something an operator does with this screen.

---

## 0. Principles

1. **Time is the primary axis.** Layouts are organised by *when*, not by category. Vertical rhythm on operational screens maps to the clock.
2. **Status before beauty.** A booking's state must be readable in under a second, from across a desk, and without relying on colour.
3. **Density is a feature.** An operator scanning 40 bookings is not served by generous whitespace. Card padding shrinks and line-height tightens on operator surfaces.
4. **Gradient is a brand moment, not a UI material.** It belongs on the marketing surface, the logo and a single hero CTA. It never appears on a nav item, a table cell or a badge.
5. **Two surfaces, two temperatures.** Guest screens are warm and spacious; operator screens are neutral and tight. Same tokens, different application.
6. **Motion confirms, never decorates.** Every transition answers "did that work?" — nothing loops, nothing floats on an operator screen.

---

## 1. Colour

### 1.1 Structure

Three layers. Components consume **semantic** tokens; only the theme file touches primitives.

```
primitive   --orange-500, --rose-500, --stone-200 …   raw values, never used in components
semantic    --color-surface, --color-primary …        what components reference
component   --btn-primary-bg …                        only when a component needs its own hook
```

### 1.2 Palette

**Brand — orange** (retained from the current build; it is distinctive and warm without reading as a generic blue SaaS)

| Token | Value | Use |
|---|---|---|
| `primary-50` | `#fff8f1` | tinted row, selected state fill |
| `primary-100` | `#ffedd5` | badge background |
| `primary-200` | `#fed7aa` | borders on primary surfaces |
| `primary-500` | `#f97316` | icons, accents, focus ring |
| `primary-600` | `#ea580c` | **primary button, links** |
| `primary-700` | `#c2410c` | hover / pressed |
| `primary-900` | `#7c2d12` | text on primary tints |

**Accent — rose** `accent-50…900` (`#fff1f2` → `#881337`). Reserved for the brand gradient and destructive-adjacent emphasis. Not a second brand colour.

**Neutrals — warm stone.** Overrides Tailwind's cool grey so neutrals share the brand's temperature.

| Token | Value | Use |
|---|---|---|
| `gray-50` | `#fbfaf9` | app background |
| `gray-100` | `#f6f4f2` | subtle fill, table head |
| `gray-200` | `#eae6e2` | **default border** |
| `gray-300` | `#d9d3cd` | strong border, dividers |
| `gray-400` | `#b0a69e` | placeholder, disabled text |
| `gray-500` | `#857a72` | metadata, axis labels |
| `gray-600` | `#64594f` | body text |
| `gray-700` | `#4b423a` | emphasis |
| `gray-900` | `#221c18` | headings, numbers |

### 1.3 Semantic tokens

| Token | Light value | Meaning |
|---|---|---|
| `--color-bg` | `gray-50` | Page background |
| `--color-surface` | `#ffffff` | Card, drawer, table |
| `--color-surface-sunken` | `gray-100` | Table head, inset panel |
| `--color-border` | `gray-200` | Default separation |
| `--color-border-strong` | `gray-300` | Emphasised separation |
| `--color-text` | `gray-900` | Primary text |
| `--color-text-muted` | `gray-500` | Metadata |
| `--color-success` | `#047857` | Completed, paid |
| `--color-warning` | `#b45309` | Pending, deposit |
| `--color-danger` | `#be123c` | No-show, destructive |
| `--color-info` | `#1d4ed8` | Confirmed, neutral notice |
| `--color-focus` | `primary-500` | Focus ring, all interactives |

Success/warning/danger/info are deliberately **darker than their Tailwind defaults** so that text on a 50-level tint clears 4.5:1.

### 1.4 Rules

- Semantic colours are never used decoratively. Green means *completed or paid* — nothing else.
- Every status tint pairs a `-50` background with a `-700`-weight foreground, verified ≥ 4.5:1.
- The gradient (`--gradient-sunset`) is permitted in exactly four places: logo mark, marketing hero CTA, marketing section wash, guest confirmation screen. **Zero** occurrences inside `/app`.

---

## 2. Typography

**Family:** Cairo — one family for Arabic and Latin, so mixed strings do not shift baseline.
**Numerals:** Western digits with `font-variant-numeric: tabular-nums` on every number that sits in a column (prices, counts, times, IDs) so digits align vertically.

| Role | Size / line-height | Weight | Use |
|---|---|---|---|
| `display` | 48–72 / 1.15 | 800 | Marketing hero only |
| `h1` | 24 / 1.3 | 700 | Screen title |
| `h2` | 20 / 1.35 | 700 | Section heading |
| `h3` | 16 / 1.4 | 700 | Card heading, drawer section |
| `body` | 14 / 1.6 | 400 | Default operator text |
| `body-lg` | 16 / 1.7 | 400 | Guest-facing prose |
| `label` | 13 / 1.4 | 600 | Form labels, table headers |
| `meta` | 12 / 1.4 | 500 | Timestamps, helper text |
| `mono-num` | 14 / 1.4 | 600 tabular | Prices, times, references |

Operator base is **14 px**, guest base is **16 px** — the density difference from §0.3, expressed in type.

Rules: never more than three sizes per screen region · headings never exceed two weights · Arabic never letter-spaced (it breaks glyph joining) · line length capped at 72ch for prose.

---

## 3. Spacing

4 px base. Permitted values only:

```
0 · 1(4) · 2(8) · 3(12) · 4(16) · 5(20) · 6(24) · 8(32) · 10(40) · 12(48) · 16(64) · 24(96)
```

| Context | Padding | Gap |
|---|---|---|
| Operator card | `4` (16) | `3` (12) |
| Guest card | `6`–`8` (24–32) | `4` (16) |
| Table cell | `3 4` (12/16) | — |
| Drawer | `5` (20) | `5` (20) |
| Form field stack | — | `4` (16) |
| Page section | `6` (24) | `6` (24) |
| Marketing section | `24` (96) vertical | `8` (32) |

Anything outside the scale (`py-3.5`, `py-2.5` — both present in the current build) is a bug.

---

## 4. Radius

Radius encodes **how permanent** a surface is. Larger radius = more transient / more decorative.

| Token | Value | Applies to |
|---|---|---|
| `radius-sm` | 4 px | Badges, chips, tags |
| `radius-md` | 8 px | **Buttons, inputs, selects, table row hover** |
| `radius-lg` | 12 px | Cards, panels, drawer sections |
| `radius-xl` | 16 px | Modals, drawers, elevated overlays |
| `radius-full` | 9999 px | Avatars, dots, pill toggles **only** |

Rule: a container's radius is always ≥ the radius of what it contains. Buttons are **never** `rounded-full` on an operator surface — pills read as filters, and confusing the two costs the operator a click.

---

## 5. Borders & elevation

**Prefer a border to a shadow.** On a dense screen, shadows accumulate into visual mud.

| Level | Treatment | Use |
|---|---|---|
| `flat` | `1px solid border` | Cards, tables, panels — the default |
| `raised` | `0 1px 2px rgb(28 20 14 / .06)` | Hover on an interactive card |
| `overlay` | `0 8px 24px rgb(28 20 14 / .10)` | Dropdown, popover, tooltip |
| `modal` | `0 24px 48px rgb(28 20 14 / .16)` | Drawer, dialog |

Four levels, no more. Shadows are always warm-tinted (`28 20 14`), never neutral black — a cool shadow on a warm surface reads as dirt.

---

## 6. Iconography

- **Lucide**, exclusively. 1.5 px stroke, `currentColor`.
- Sizes: 14 (inline with meta) · 16 (buttons, table) · 20 (nav, section headings) · 24 (empty states).
- Every status has a **fixed** icon (see IA §3). The mapping never varies by screen.
- Directional icons use logical direction: in RTL, "next" points left, "back" points right. Implemented via a `dir`-aware wrapper, not hardcoded per-view.
- An icon alone is never a label. Icon-only controls carry `aria-label` **and** a tooltip.

---

## 7. Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `instant` | 80 ms | `linear` | Hover, focus ring |
| `fast` | 140 ms | `cubic-bezier(.2,0,.2,1)` | Button press, checkbox, chip |
| `base` | 200 ms | `cubic-bezier(.2,0,0,1)` | Dropdown, tooltip, tab |
| `slow` | 280 ms | `cubic-bezier(.16,1,.3,1)` | Drawer, modal, sheet |
| `page` | 180 ms | `ease-out` | Route change (fade + 4 px rise) |

Rules:
- Nothing on an operator screen animates on a loop. The floating hero cards are guest-only.
- Drawers slide from the **inline-end** edge (right in RTL) — a logical property, so it inverts correctly if LTR is ever added.
- Any state change the user did not initiate is announced, not just animated.
- All of the above collapse to `0ms` under `prefers-reduced-motion: reduce`.

---

## 8. Component inventory

### 8.1 Primitives — build first, everything else depends on them

| Component | Variants | States | Notes |
|---|---|---|---|
| `Button` | `primary` `secondary` `ghost` `danger` | default · hover · active · focus-visible · disabled · **loading** | Sizes `sm`(32) `md`(40) `lg`(48). Replaces all 8 current signatures. |
| `IconButton` | same | + tooltip | Min 40×40 hit area even at 32 px visual |
| `Input` | text · tel · email · number · textarea | + `invalid` · `readonly` | Owns its label, hint and error; wires `aria-invalid` + `aria-describedby` |
| `Select` | native-backed | as Input | Native on mobile |
| `SearchInput` | — | + `clearable` · `loading` | Debounced, `/` shortcut |
| `DateStrip` | 7-day / range | + `disabled` days | `radiogroup`, arrow-key navigable |
| `TimeSlotGrid` | — | `available` · `selected` · `taken` · `past` | `radiogroup`; taken slots stay visible but disabled — absence is information |
| `StatusBadge` | booking · payment | — | **colour + label + icon**, always all three |
| `Avatar` | sm · lg | — | Initial-free monogram, gradient only here |
| `Card` | `flat` `interactive` | + hover | Operator padding by default |
| `Drawer` | end-side | open · closing | Focus trap, `Esc`, restores focus, `role="dialog"` |
| `Modal` | centred | — | Confirmations only |
| `ConfirmDialog` | default · danger | — | Names the object being acted on |
| `Toast` | success · error · info | + undo action | Destructive actions always ship an undo |
| `EmptyState` | `first-run` `no-results` `error` | — | Three genuinely different messages |
| `Skeleton` | text · row · card · block | — | Matches the real layout's geometry |
| `Tabs` | underline | — | Roving tabindex |
| `Tooltip` | — | — | 300 ms delay, never the only label |

### 8.2 Domain components

| Component | Composes | Where |
|---|---|---|
| `BookingRow` | StatusBadge, Avatar, Button | Bookings table |
| `BookingCard` | StatusBadge, Avatar | Mobile list, Today |
| `BookingBlock` | StatusBadge | Calendar |
| `BookingDetail` | Drawer, StatusBadge, Timeline, Button | Detail drawer |
| `BookingForm` | Select, DateStrip, TimeSlotGrid, CustomerPicker | Create / reschedule |
| `CustomerPicker` | SearchInput + inline create | Booking form |
| `CustomerProfile` | Drawer, stats, BookingCard list | Customers |
| `DayTimeline` | BookingBlock, now-line | Today, calendar day |
| `AttentionList` | BookingCard + reason + action | Today |
| `OccupancyBar` | — | Today |
| `FilterBar` | Chips, Select, DateRange | Bookings |
| `HistoryTimeline` | — | Detail drawer |

### 8.3 Button spec (the pattern all primitives follow)

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| `primary` | `primary-600` | white | — | One per view. **Solid, not gradient.** |
| `secondary` | `surface` | `gray-700` | `border` | Default operator action |
| `ghost` | transparent | `gray-600` | — | Toolbar, row actions |
| `danger` | `surface` | `danger` | `danger/30` | Cancel, no-show — never solid red |

| State | Treatment |
|---|---|
| hover | `primary-700` / surface → `gray-50` |
| active | scale `.98`, 80 ms |
| focus-visible | 2 px `--color-focus` ring, 2 px offset — **identical on every variant** |
| disabled | 45% opacity, `cursor-not-allowed`, no hover |
| loading | spinner replaces the leading icon, label persists, width locked, `aria-busy` |

Accessibility: real `<button>` · `Enter`/`Space` · icon-only requires `aria-label` · destructive requires confirmation · never disabled without an explanation nearby.

---

## 9. Data display

**Tables** — sticky header · `tabular-nums` on numeric columns · row hover `primary-50/40` · entire row activates the drawer · a real `<button>` inside the row for keyboard users · numeric columns aligned to the inline-end · **max 6 columns** before something moves into the drawer.

**Charts** — one accent colour, no rainbow · grid at 7% opacity · always a text summary alongside so the insight does not depend on sight · RTL-aware axis order · no chart where a single number would do.

**Density** — comfortable (48 px rows) is the default; compact (36 px) is a user preference, persisted.

---

## 10. Responsive

| Breakpoint | Width | Shift |
|---|---|---|
| `base` | <640 | Single column, bottom tab bar, drawers become full-screen sheets, tables become cards |
| `sm` | ≥640 | Two-column forms |
| `md` | ≥768 | Icon rail returns, tables return |
| `lg` | ≥1024 | Rail expands, Today becomes two columns |
| `xl` | ≥1280 | Calendar week view, max content width 1440 |

Rules: touch targets ≥ 44×44 below `md` · primary action becomes a sticky bottom bar on mobile · never hide functionality at a breakpoint without relocating it · test at 320 px.

---

## 11. RTL

- Use **logical properties only** — `ms-*`/`me-*`, `ps-*`/`pe-*`, `start`/`end`. No `ml-*`, `pr-*`, `left-*`.
- `dir="rtl"` on `<html>`; **LTR islands** (`dir="ltr"` + `text-align: start`) for phone, email, IBAN and reference codes, so the caret and punctuation behave.
- Dates and times formatted through `date-fns` with the `ar` locale — one source, never hand-built strings.
- Prices formatted with `Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' })` — never string-concatenated.
- Icons that imply direction resolve through the logical wrapper (§6).
- Charts, sliders and progress bars are explicitly direction-aware; they do not inherit correctly.

---

## 12. Accessibility floor

Non-negotiable, checked before any screen is called done:

- **Focus visible on every interactive element**, one consistent ring, never removed.
- Full keyboard path: `Tab` order matches visual order · `Esc` closes overlays · `Enter`/`Space` activate · arrow keys inside grids and tabs.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI boundaries and icons carrying meaning.
- **Status never colour-alone** — the icon and label are load-bearing.
- Every input has a real `<label>`; errors are inline, referenced by `aria-describedby`, and marked `aria-invalid`.
- Drawers/modals: focus trapped, `role="dialog"`, `aria-labelledby`, focus restored to the trigger on close.
- Async results announced via `aria-live="polite"`; errors via `assertive`.
- Motion honours `prefers-reduced-motion`.
- Touch targets ≥ 44×44 on touch viewports.

---

## 13. What this system forbids

To keep the product from drifting back into generic-SaaS shape:

| ✅ Do | ❌ Don't |
|---|---|
| Solid `primary-600` for the primary action | Gradient buttons on operator screens |
| Border-first separation | Stacked shadows for hierarchy |
| Radius by permanence (§4) | One radius everywhere, or a new one per component |
| Status = colour + label + icon | Colour-only status dots |
| Day timeline as the dashboard | Four stat cards + a chart + a table |
| Empty states that explain and offer an action | "No data" |
| Drawers that keep the operator in place | A route change for every detail view |
| Numbers in `tabular-nums` | Proportional digits in a column |
| Logical properties | `left`/`right` in an RTL product |

---

## 14. Marketing layer

The guest-facing extension of the system. It shares every token with the operator side but applies them at a different density and temperature (see §0.5). Nothing in this section is permitted inside `/app`.

### 14.1 Section rhythm

| Token | Value | Use |
|---|---|---|
| `.section` | `py-20` → `md:py-28` | Vertical rhythm for every landing section |
| `.section-inner` | `max-w-6xl` | Content measure — narrower than the operator's `max-w-7xl` |
| `.section-divider` | gradient hairline, fades at both ends | Separation without a table-like rule |

Sections alternate three backgrounds so the page has cadence without stripes: `bg-gray-50` (default) → `bg-white` → `.surface-soft` (warm wash). Never two identical backgrounds in a row.

### 14.2 Editorial type

| Class | Size | Use |
|---|---|---|
| `.display-xl` | 40 → 72px, 800 | Hero headline only, once per page |
| `.display-lg` | 30 → 48px, 800 | Section headline |
| `.lede` | 18 → 20px, 400 | The paragraph under a headline |

Arabic display type needs `pb-[0.14em]` inside any clipping container — descenders sit below the Latin baseline and get cut otherwise.

### 14.3 Motion: scroll reveal

`v-reveal` — a directive, not a library (`src/directives/reveal.ts`).

| Usage | Effect |
|---|---|
| `v-reveal` | Fade + 26px rise |
| `v-reveal="120"` | Same, delayed 120ms — use for stagger |
| `v-reveal.scale` | Rise + settle from 96%; for large artifacts |
| `v-reveal.blur` | Rise + de-blur; hero only |

Rules: one shared `IntersectionObserver` for the page · elements unobserve after revealing (reveal is once, never on scroll-back) · `rootMargin: -12%` so motion anticipates the fold · **under `prefers-reduced-motion` the directive is a no-op and content renders visible** · stagger steps are 70–110ms, never more than 4 in a chain.

| Pattern | Component | Notes |
|---|---|---|
| Reading progress | `ScrollProgress` | rAF-throttled, passive listener, `scaleX` on a `transform` — no layout thrash |
| Parallax | Hero only | Max 120px travel, `0.12`–`0.5` coefficients, disabled under reduced motion |
| Count-up | `useCountUp` | easeOutExpo, fires once on 40% visibility; suffix stays outside the animated node so width never jumps |
| Sticky walkthrough | `StepsSection` | Visual pins, steps scroll; active step from an observer at `-45% 0px -45% 0px`, never a scroll-offset calculation |
| Marquee | `.marquee` | Masked at both ends, pauses on hover, direction flips in RTL via a separate keyframe |

The one looping animation permitted on the page is the now-line pulse in the hero artifact, because it communicates liveness rather than decorating.

### 14.4 Section patterns

| Pattern | Component | Job |
|---|---|---|
| Hero | `HeroSection` + `HeroPreview` | Hook + a **real product artifact**, never a generic browser mockup |
| Proof | `ProofBar` | Four counted figures + sector marquee |
| Problem → fix | `PainSection` | Struck-through pain beside the concrete mechanism |
| Bento capabilities | `FeaturesSection` | Two lead cards at `col-span-3`, six compact at `col-span-2` |
| Product tour | `ShowcaseSection` | Tabbed schematics built from real tokens |
| Walkthrough | `StepsSection` | Sticky visual + scrolling steps |
| Use cases | `TestimonialsSection` | Labelled illustrative, never fabricated testimonials |
| Pricing | `PricingSection` | Monthly/yearly switch, one featured tier |
| FAQ | `FaqSection` | `grid-template-rows: 0fr → 1fr` accordion |
| Closing | `FinalCta` | The only full-bleed gradient block on the page |

### 14.5 Honesty rules

Non-negotiable, because a marketing page that overpromises makes the product look worse on first use:

- Every capability claimed must exist in the build and be reachable from the demo.
- Illustrative content is labelled illustrative. No invented customer names, logos or testimonials.
- Figures are either derived from the product's behaviour or framed as targets — never presented as measured results the product has not produced.

### 14.6 Accessibility of the marketing layer

Tabs are real `role="tablist"`/`tab`/`tabpanel` · the FAQ uses `<button>` with `aria-expanded` + `aria-controls` and a `role="region"` panel · the pricing switch is `role="switch"` with `aria-checked` · included/excluded plan features carry an `sr-only` clarifier so the icon is not the only signal · the marquee is `aria-hidden` (decorative, duplicated by the caption) · all reveal, parallax and count-up motion collapses under `prefers-reduced-motion`.

