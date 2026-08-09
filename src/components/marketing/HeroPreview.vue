<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CheckCircle2, Clock, TriangleAlert } from 'lucide-vue-next'

/**
 * The hero artifact is a real slice of the operator console — a day board with
 * a live now-line — not a generic browser mockup. It self-contains its data so
 * the landing page stays instant, but every visual rule comes from the product:
 * same status tones, same icons, same proportional timeline.
 */

const OPEN_MIN = 9 * 60 // 09:00
const CLOSE_MIN = 18 * 60 // 18:00
const PX_PER_MIN = 0.62

interface Block {
  name: string
  service: string
  startMin: number
  durMin: number
  tone: 'success' | 'info' | 'warning'
  icon: typeof CheckCircle2
}

const BLOCKS: Block[] = [
  {
    name: 'أحمد سعيد',
    service: 'استشارة طبية',
    startMin: 9 * 60,
    durMin: 40,
    tone: 'success',
    icon: CheckCircle2,
  },
  {
    name: 'سارة خالد',
    service: 'قص وتصفيف',
    startMin: 10 * 60 + 20,
    durMin: 60,
    tone: 'success',
    icon: CheckCircle2,
  },
  {
    name: 'محمد علي',
    service: 'استشارة طبية',
    startMin: 11 * 60 + 40,
    durMin: 40,
    tone: 'info',
    icon: Clock,
  },
  {
    name: 'نورة القحطاني',
    service: 'بانتظار التأكيد',
    startMin: 13 * 60,
    durMin: 40,
    tone: 'warning',
    icon: TriangleAlert,
  },
  {
    name: 'خالد الحربي',
    service: 'قص وتصفيف',
    startMin: 14 * 60 + 20,
    durMin: 60,
    tone: 'info',
    icon: Clock,
  },
  {
    name: 'هند العتيبي',
    service: 'حجز طاولة',
    startMin: 15 * 60 + 50,
    durMin: 90,
    tone: 'info',
    icon: Clock,
  },
]

const TONE: Record<Block['tone'], string> = {
  success: 'border-success-700/25 bg-success-50 text-success-700',
  info: 'border-info-700/25 bg-info-50 text-info-700',
  warning: 'border-warning-700/30 bg-warning-50 text-warning-700',
}

const HOURS = Array.from({ length: (CLOSE_MIN - OPEN_MIN) / 60 + 1 }, (_, i) => OPEN_MIN + i * 60)

function label(min: number): string {
  const h24 = Math.floor(min / 60)
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  const m = String(min % 60).padStart(2, '0')
  return `${h}:${m} ${h24 < 12 ? 'ص' : 'م'}`
}

/** Follows the real clock, clamped into opening hours so it is always visible. */
const nowMin = ref(0)
let timer: number | undefined

function syncNow() {
  const d = new Date()
  const real = d.getHours() * 60 + d.getMinutes()
  nowMin.value = Math.min(CLOSE_MIN - 30, Math.max(OPEN_MIN + 30, real))
}

onMounted(() => {
  syncNow()
  timer = window.setInterval(syncNow, 30_000)
})
onBeforeUnmount(() => clearInterval(timer))

const height = (CLOSE_MIN - OPEN_MIN) * PX_PER_MIN
const nowTop = computed(() => (nowMin.value - OPEN_MIN) * PX_PER_MIN)
const nowLabel = computed(() => label(nowMin.value))
</script>

<template>
  <!-- py gives the floating cards room to hang off the board edges -->
  <div class="relative py-9">
    <!-- board -->
    <div
      class="elev-modal relative overflow-hidden rounded-[var(--radius-xl)] border border-gray-200 bg-white"
    >
      <header class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <p class="text-[13px] font-bold text-gray-900">جدول اليوم</p>
          <p class="text-[11px] text-gray-500">غرفة ١ · ٦ حجوزات</p>
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
          :style="{
            top: `${(h - OPEN_MIN) * PX_PER_MIN + 12}px`,
            insetInlineStart: '16px',
            insetInlineEnd: '16px',
          }"
        >
          <span class="w-12 shrink-0 text-[10px] text-gray-400" data-numeric>{{ label(h) }}</span>
          <span class="h-px flex-1 bg-gray-100" />
        </div>

        <!-- bookings -->
        <div
          v-for="(b, i) in BLOCKS"
          :key="b.name"
          class="absolute overflow-hidden rounded-[var(--radius-md)] border px-2.5 py-1.5"
          :class="TONE[b.tone]"
          :style="{
            top: `${(b.startMin - OPEN_MIN) * PX_PER_MIN + 12}px`,
            height: `${b.durMin * PX_PER_MIN}px`,
            insetInlineStart: '72px',
            insetInlineEnd: '16px',
            animationDelay: `${i * 90}ms`,
          }"
        >
          <span class="flex items-center gap-1.5">
            <component :is="b.icon" class="h-3 w-3 shrink-0" aria-hidden="true" />
            <span class="truncate text-[11px] font-bold">{{ b.name }}</span>
          </span>
          <span v-if="b.durMin > 40" class="mt-0.5 block truncate text-[10px] opacity-75">
            {{ b.service }}
          </span>
        </div>

        <!-- now line -->
        <div
          class="pointer-events-none absolute z-10 flex items-center gap-1.5"
          :style="{ top: `${nowTop + 12}px`, insetInlineStart: '16px', insetInlineEnd: '16px' }"
        >
          <span
            class="bg-primary-600 w-12 shrink-0 rounded-full py-0.5 text-center text-[10px] font-bold text-white"
            data-numeric
          >
            {{ nowLabel }}
          </span>
          <span class="now-dot bg-primary-600 h-1.5 w-1.5 shrink-0 rounded-full" />
          <span class="bg-primary-500/70 h-px flex-1" />
        </div>
      </div>
    </div>

    <!-- floating proof cards, anchored to the board -->
    <div
      class="elev-overlay absolute top-1.5 hidden items-center gap-2 rounded-[var(--radius-lg)] border border-gray-200 bg-white px-2.5 py-1.5 sm:flex"
      style="inset-inline-start: 20px"
    >
      <span
        class="bg-success-50 text-success-700 flex h-7 w-7 items-center justify-center rounded-full"
      >
        <CheckCircle2 class="h-3.5 w-3.5" />
      </span>
      <span>
        <span class="block text-[11px] font-bold text-gray-900">حجز مؤكد تلقائياً</span>
        <span class="block text-[10px] text-gray-500">قبل ٤ دقائق</span>
      </span>
    </div>

    <div
      class="elev-overlay absolute bottom-1.5 hidden items-center gap-2 rounded-[var(--radius-lg)] border border-gray-200 bg-white px-2.5 py-1.5 sm:flex"
      style="inset-inline-end: 20px"
    >
      <span
        class="bg-warning-50 text-warning-700 flex h-7 w-7 items-center justify-center rounded-full"
      >
        <TriangleAlert class="h-3.5 w-3.5" />
      </span>
      <span>
        <span class="block text-[11px] font-bold text-gray-900">تعارض مكتشَف</span>
        <span class="block text-[10px] text-gray-500">قبل حدوثه</span>
      </span>
    </div>
  </div>
</template>
