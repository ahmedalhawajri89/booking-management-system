<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CheckCircle2, Clock, TriangleAlert } from 'lucide-vue-next'
import { heroChannels, heroConflict, heroDay } from '@/data/demo'

/**
 * The one artifact behind all four scenes.
 *
 * It is deliberately *not* four components swapped by v-if: remounting a
 * board this dense flashes on every scene change. Instead one board reads
 * `scene` and `t` and moves its own parts, so the transitions are continuous
 * and the viewer's scroll is what drives them.
 *
 * Everything drawn here follows the product's own rules — same status tones,
 * same proportional timeline, same now-line — because a hero that invents its
 * own visual language is selling a screen that does not exist.
 */
const props = defineProps({
  scene: { type: Number, required: true },
  t: { type: Number, required: true },
  still: { type: Boolean, required: false },
})

const { openMin, closeMin, blocks } = heroDay
// Tuned so a 9-to-6 day fills a 100dvh stage without the board floating in
// empty space; the reduced-motion stack renders it inside normal sections,
// where the same density still reads.
const PX_PER_MIN = 0.86
const height = (closeMin - openMin) * PX_PER_MIN

const HOURS = Array.from({ length: (closeMin - openMin) / 60 + 1 }, (_, i) => openMin + i * 60)

const TONE = {
  success: 'border-success-700/25 bg-success-50 text-success-700',
  info: 'border-info-700/25 bg-info-50 text-info-700',
  warning: 'border-warning-700/30 bg-warning-50 text-warning-700',
}

const ICON = { success: CheckCircle2, info: Clock, warning: TriangleAlert }

function label(min) {
  const h24 = Math.floor(min / 60)
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(min % 60).padStart(2, '0')} ${h24 < 12 ? 'ص' : 'م'}`
}

const top = (min) => (min - openMin) * PX_PER_MIN + 12

/* --- scene 1: the day fills in ---------------------------------------- */
// Each block claims a slice of the scene, so they land one after another
// rather than all at once. `>=` matters: at t=0 the first block is already
// there, so the board never paints empty on arrival.
function blockShown(i) {
  if (props.still || props.scene > 0) return true
  return props.t * blocks.length >= i * 0.8
}

/* --- scene 2: the conflict ------------------------------------------- */
// Three beats: the booking travels toward an occupied slot, both flash as a
// conflict, then the availability engine drops it in the next free gap.
const COLLIDE_AT = 0.42
const RESOLVE_AT = 0.68

const conflictPhase = computed(() => {
  if (props.still) return 'resolved'
  if (props.scene < 1) return 'idle'
  if (props.scene > 1) return 'resolved'
  if (props.t < COLLIDE_AT) return 'travel'
  if (props.t < RESOLVE_AT) return 'clash'
  return 'resolved'
})

const ghostMin = computed(() => {
  const phase = conflictPhase.value
  if (phase === 'idle') return heroConflict.attemptMin - 150
  if (phase === 'travel') {
    // Ease in from above the target so the approach reads as intentional.
    const k = props.t / COLLIDE_AT
    return heroConflict.attemptMin - 150 * (1 - k * k)
  }
  if (phase === 'clash') return heroConflict.attemptMin
  return heroConflict.resolvedMin
})

/** The 10:20 booking is the one being landed on. */
const clashingIndex = 1
const isClashing = (i) => i === clashingIndex && conflictPhase.value === 'clash'

/* --- scene 3: every channel, one calendar ----------------------------- */
const channelsIn = computed(() => {
  if (props.still) return 1
  if (props.scene < 2) return 0
  if (props.scene > 2) return 1
  return Math.min(1, props.t * 1.6)
})

/* --- scene 4: pull back to the whole console -------------------------- */
const summaryIn = computed(() => {
  if (props.still) return 1
  if (props.scene < 3) return 0
  return Math.min(1, props.t * 2)
})

// Constrained on purpose: past roughly these values a tilted board in RTL
// starts producing horizontal overflow, and the effect stops reading as
// depth and starts reading as a broken layout.
const boardStyle = computed(() => {
  if (props.still) return {}
  const lift = props.scene === 2 ? -8 * channelsIn.value : 0
  const scale = props.scene === 3 ? 1 - 0.06 * summaryIn.value : 1
  const rot = props.scene === 2 ? 4 * channelsIn.value : 0
  return {
    transform: `perspective(1400px) translateY(${lift}px) rotateY(${rot}deg) scale(${scale})`,
  }
})

/* --- live now-line ---------------------------------------------------- */
const nowMin = ref(0)
let timer
function syncNow() {
  const d = new Date()
  const real = d.getHours() * 60 + d.getMinutes()
  nowMin.value = Math.min(closeMin - 30, Math.max(openMin + 30, real))
}
onMounted(() => {
  syncNow()
  timer = window.setInterval(syncNow, 30_000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="relative">
    <div
      class="elev-modal border-border bg-surface relative overflow-hidden rounded-[var(--radius-xl)] border transition-transform duration-500 ease-[var(--ease-out-soft)]"
      :style="boardStyle"
    >
      <header class="border-border flex items-center justify-between border-b px-4 py-3">
        <div>
          <p class="text-fg text-[13px] font-bold">{{ heroDay.title }}</p>
          <p class="text-fg-subtle text-[11px]">{{ heroDay.room }} · جدول اليوم</p>
        </div>
        <span
          class="border-success-100 bg-success-50 text-success-700 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-bold"
        >
          <span class="bg-success-700 h-1.5 w-1.5 rounded-full" />
          مباشر
        </span>
      </header>

      <div class="relative px-4 py-3" :style="{ height: `${height + 24}px` }">
        <!-- hour rail -->
        <div
          v-for="h in HOURS"
          :key="h"
          class="absolute flex items-center gap-2"
          :style="{ top: `${top(h)}px`, insetInlineStart: '16px', insetInlineEnd: '16px' }"
        >
          <span class="text-fg-subtle w-12 shrink-0 text-[10px]" data-numeric>{{ label(h) }}</span>
          <span class="bg-border h-px flex-1" />
        </div>

        <!-- the day's bookings -->
        <div
          v-for="(b, i) in blocks"
          :key="b.name"
          class="absolute overflow-hidden rounded-[var(--radius-md)] border px-2.5 py-1.5 transition-all duration-500 ease-[var(--ease-out-soft)]"
          :class="[
            TONE[b.tone],
            isClashing(i) && 'ring-danger-700 ring-offset-surface ring-2 ring-offset-1',
          ]"
          :style="{
            top: `${top(b.startMin)}px`,
            height: `${b.durMin * PX_PER_MIN}px`,
            insetInlineStart: '72px',
            insetInlineEnd: '16px',
            opacity: blockShown(i) ? 1 : 0,
            transform: blockShown(i) ? 'none' : 'translateY(10px)',
          }"
        >
          <span class="flex items-center gap-1.5">
            <component :is="ICON[b.tone]" class="h-3 w-3 shrink-0" aria-hidden="true" />
            <span class="truncate text-[11px] font-bold">{{ b.name }}</span>
          </span>
          <span v-if="b.durMin > 40" class="mt-0.5 block truncate text-[10px] opacity-75">
            {{ b.service }}
          </span>
        </div>

        <!-- the booking being placed -->
        <div
          v-if="conflictPhase !== 'idle'"
          class="elev-overlay absolute z-20 overflow-hidden rounded-[var(--radius-md)] border-2 px-2.5 py-1.5 transition-all duration-500 ease-[var(--ease-out-soft)]"
          :class="
            conflictPhase === 'clash'
              ? 'border-danger-700 bg-danger-50 text-danger-700'
              : 'border-primary-600 bg-primary-50 text-primary-700'
          "
          :style="{
            top: `${top(ghostMin)}px`,
            height: `${heroConflict.durMin * PX_PER_MIN}px`,
            insetInlineStart: '84px',
            insetInlineEnd: '28px',
          }"
        >
          <span class="flex items-center gap-1.5">
            <component
              :is="conflictPhase === 'clash' ? TriangleAlert : CheckCircle2"
              class="h-3 w-3 shrink-0"
              aria-hidden="true"
            />
            <span class="truncate text-[11px] font-bold">{{ heroConflict.name }}</span>
          </span>
          <span class="mt-0.5 block truncate text-[10px] opacity-80">
            {{ conflictPhase === 'clash' ? 'الوقت محجوز — غير متاح' : 'أقرب وقت متاح' }}
          </span>
        </div>

        <!-- now line -->
        <div
          class="pointer-events-none absolute z-10 flex items-center gap-1.5"
          :style="{ top: `${top(nowMin)}px`, insetInlineStart: '16px', insetInlineEnd: '16px' }"
        >
          <span
            class="bg-primary-600 w-12 shrink-0 rounded-full py-0.5 text-center text-[10px] font-bold text-white"
            data-numeric
          >
            {{ label(nowMin) }}
          </span>
          <span class="now-dot bg-primary-600 h-1.5 w-1.5 shrink-0 rounded-full" />
          <span class="bg-primary-500/70 h-px flex-1" />
        </div>
      </div>
    </div>

    <!-- scene 3: the three intake channels converging on that one board.
         Clear of the board's own header — overlapping it read as a glitch. -->
    <div
      class="pointer-events-none absolute -top-12 z-30 flex gap-2 transition-all duration-500"
      style="inset-inline-start: 24px"
      :style="{
        opacity: channelsIn,
        transform: `translateY(${(1 - channelsIn) * 16}px)`,
      }"
      aria-hidden="true"
    >
      <span
        v-for="c in heroChannels"
        :key="c.key"
        class="elev-overlay border-border bg-surface text-fg inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold"
      >
        <component :is="c.icon" class="text-primary-600 h-3 w-3" />
        {{ c.label }}
      </span>
    </div>

    <!-- scene 4: the operational read-out under the board -->
    <div
      class="elev-overlay border-border bg-surface absolute -bottom-8 z-30 grid grid-cols-3 gap-4 rounded-[var(--radius-lg)] border px-4 py-3 transition-all duration-500"
      style="inset-inline-start: 24px; inset-inline-end: 24px"
      :style="{ opacity: summaryIn, transform: `translateY(${(1 - summaryIn) * 14}px)` }"
      aria-hidden="true"
    >
      <div>
        <p class="text-fg text-base font-bold" data-numeric>٨٤٪</p>
        <p class="text-fg-subtle text-[10px]">الإشغال</p>
      </div>
      <div>
        <p class="text-fg text-base font-bold" data-numeric>٠</p>
        <p class="text-fg-subtle text-[10px]">حجز مزدوج</p>
      </div>
      <div>
        <p class="text-fg text-base font-bold" data-numeric>٣</p>
        <p class="text-fg-subtle text-[10px]">تحتاج إجراء</p>
      </div>
    </div>
  </div>
</template>
