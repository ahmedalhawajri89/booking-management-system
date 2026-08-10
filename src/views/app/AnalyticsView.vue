<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { subDays, startOfDay } from 'date-fns'
import {
  BarChart3,
  CalendarRange,
  CircleSlash,
  Clock4,
  TrendingUp,
  UserX,
  Wallet,
} from 'lucide-vue-next'
import type { ChartConfiguration } from 'chart.js'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import KpiCard from '@/components/analytics/KpiCard.vue'
import BaseChart from '@/components/analytics/BaseChart.vue'
import DemandHeatmap from '@/components/analytics/DemandHeatmap.vue'
import { useBookingsStore } from '@/stores/bookings'
import { businessHours, serviceById } from '@/data/catalog'
import { chartColors } from '@/composables/useChartTheme'
import { money } from '@/lib/format'
import {
  byChannel,
  byStatus,
  computeKpis,
  dailySeries,
  demandHeatmap,
  topServices,
} from '@/lib/analytics'

/**
 * The operational read-out. TodayView answers "what do I do now"; this
 * answers "how is the business doing", which is a different question and
 * deserves a different screen rather than a row of tiles bolted onto Today.
 *
 * Every figure is derived in src/lib/analytics.ts from bookings already in
 * the store. Nothing here is invented, which is also why there is no
 * "vs. last period" delta — the range is user-chosen, so the comparison
 * period would be arbitrary.
 */
const store = useBookingsStore()
const route = useRoute()
const router = useRouter()

const RANGES = [
  { value: '7', label: '٧ أيام' },
  { value: '30', label: '٣٠ يوماً' },
  { value: '90', label: '٩٠ يوماً' },
] as const

const days = ref(String(route.query.range ?? '30'))
watch(days, (v) => router.replace({ query: { ...route.query, range: v } }))

const range = computed(() => {
  const n = Number(days.value) || 30
  return { from: startOfDay(subDays(new Date(), n - 1)), to: new Date() }
})

onMounted(() => store.load())

const kpis = computed(() => computeKpis(store.items, range.value, businessHours))
const series = computed(() => dailySeries(store.items, range.value))
const channels = computed(() => byChannel(store.items, range.value))
const statuses = computed(() => byStatus(store.items, range.value))
const services = computed(() => topServices(store.items, range.value))

const FROM_HOUR = 8
const TO_HOUR = 20
const heatmap = computed(() => demandHeatmap(store.items, range.value, FROM_HOUR, TO_HOUR))

const pct = (n: number) => `${Math.round(n * 100)}%`

/* --------------------------------------------------------------- charts */

const revenueChart = computed<ChartConfiguration>(() => {
  const c = chartColors()
  return {
    type: 'line',
    data: {
      labels: series.value.map((p) => p.label),
      datasets: [
        {
          label: 'الإيراد المحصَّل (ر.س)',
          data: series.value.map((p) => p.revenueMinor / 100),
          borderColor: c.primary,
          backgroundColor: c.primarySoft,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          yAxisID: 'y',
        },
        {
          label: 'عدد الحجوزات',
          data: series.value.map((p) => p.bookings),
          borderColor: c.accent,
          borderDash: [4, 4],
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
        y: { position: 'right', grid: { color: c.grid }, beginAtZero: true },
        // Counts and money on one chart need separate scales, or the smaller
        // series flattens against the axis of the larger one.
        y1: { position: 'left', grid: { display: false }, beginAtZero: true },
      },
      plugins: { legend: { display: false } },
    },
  }
})

const CHANNEL_LABELS = { online: 'الموقع', phone: 'الهاتف', walk_in: 'الاستقبال' } as const

const channelChart = computed<ChartConfiguration>(() => {
  const c = chartColors()
  return {
    type: 'doughnut',
    data: {
      labels: Object.keys(channels.value).map(
        (k) => CHANNEL_LABELS[k as keyof typeof CHANNEL_LABELS],
      ),
      datasets: [
        {
          data: Object.values(channels.value),
          backgroundColor: [c.primary, c.accent, c.info],
          borderWidth: 2,
          borderColor: c.surface,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14 } } },
    },
  }
})

const STATUS_LABELS = {
  pending: 'بانتظار',
  confirmed: 'مؤكد',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  no_show: 'لم يحضر',
} as const

const statusChart = computed<ChartConfiguration>(() => {
  const c = chartColors()
  return {
    type: 'bar',
    data: {
      labels: Object.keys(statuses.value).map(
        (k) => STATUS_LABELS[k as keyof typeof STATUS_LABELS],
      ),
      datasets: [
        {
          data: Object.values(statuses.value),
          backgroundColor: [c.warning, c.info, c.success, c.muted, c.danger],
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { position: 'right', grid: { color: c.grid }, beginAtZero: true },
      },
      plugins: { legend: { display: false } },
    },
  }
})

const servicesChart = computed<ChartConfiguration>(() => {
  const c = chartColors()
  return {
    type: 'bar',
    data: {
      labels: services.value.map((s) => serviceById(s.serviceId)?.name ?? s.serviceId),
      datasets: [
        {
          data: services.value.map((s) => s.revenueMinor / 100),
          backgroundColor: c.primary,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: c.grid }, beginAtZero: true },
        y: { grid: { display: false } },
      },
      plugins: { legend: { display: false } },
    },
  }
})

const summary = computed(
  () =>
    `${kpis.value.bookingCount} حجز خلال ${days.value} يوماً، ` +
    `إشغال ${pct(kpis.value.occupancy)}، ` +
    `محصَّل ${money(kpis.value.revenueCollected)}.`,
)
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="type-h3 text-fg">التحليلات</h1>
        <p class="text-fg-subtle text-[13px]">أرقام مشتقة من حجوزاتك، لا تقديرات.</p>
      </div>
      <BaseTabs v-model="days" :items="[...RANGES]" label="المدى الزمني" size="sm" />
    </header>

    <ErrorState v-if="store.error" :message="store.error" @retry="store.load(true)" />

    <div v-else-if="store.isLoading" class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonBlock v-for="n in 6" :key="n" variant="card" />
      </div>
    </div>

    <EmptyState
      v-else-if="kpis.bookingCount === 0"
      :icon="CalendarRange"
      variant="no-results"
      title="لا حجوزات في هذه الفترة"
      description="جرّب مدى زمنياً أوسع، أو أنشئ حجزاً لترى الأرقام تتحرك."
    />

    <template v-else>
      <p class="sr-only">{{ summary }}</p>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="نسبة الإشغال"
          :value="pct(kpis.occupancy)"
          hint="متوسط أيام العمل فقط"
          :icon="TrendingUp"
        />
        <KpiCard
          label="الإيراد المحصَّل"
          :value="money(kpis.revenueCollected)"
          hint="حجوزات مدفوعة بالكامل"
          :icon="Wallet"
          tone="success"
        />
        <KpiCard
          label="مستحق غير محصَّل"
          :value="money(kpis.revenueOutstanding)"
          hint="مؤكدة أو مكتملة وغير مدفوعة"
          :icon="Clock4"
          tone="warning"
        />
        <KpiCard
          label="معدّل عدم الحضور"
          :value="pct(kpis.noShowRate)"
          hint="من الحجوزات التي حُسمت"
          :icon="UserX"
          :tone="kpis.noShowRate > 0.15 ? 'danger' : 'neutral'"
        />
        <KpiCard
          label="معدّل الإلغاء"
          :value="pct(kpis.cancellationRate)"
          hint="من إجمالي الحجوزات"
          :icon="CircleSlash"
        />
        <KpiCard
          label="وسيط مهلة الحجز"
          :value="`${Math.round(kpis.medianLeadHours)} ساعة`"
          hint="بين إنشاء الحجز وموعده"
          :icon="BarChart3"
        />
      </div>

      <section class="surface p-4">
        <h2 class="type-h3 text-fg mb-4">الإيراد وعدد الحجوزات</h2>
        <BaseChart
          :config="revenueChart"
          :height="280"
          summary="مخطط خطي يقارن الإيراد المحصَّل بعدد الحجوزات يومياً خلال الفترة المختارة."
        />
      </section>

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="surface p-4">
          <h2 class="type-h3 text-fg mb-4">قنوات الحجز</h2>
          <BaseChart
            :config="channelChart"
            :height="240"
            :summary="`توزيع الحجوزات: الموقع ${channels.online}، الهاتف ${channels.phone}، الاستقبال ${channels.walk_in}.`"
          />
        </section>

        <section class="surface p-4">
          <h2 class="type-h3 text-fg mb-4">مزيج الحالات</h2>
          <BaseChart
            :config="statusChart"
            :height="240"
            :summary="`عدد الحجوزات بكل حالة: بانتظار ${statuses.pending}، مؤكد ${statuses.confirmed}، مكتمل ${statuses.completed}، ملغى ${statuses.cancelled}، لم يحضر ${statuses.no_show}.`"
          />
        </section>
      </div>

      <section class="surface p-4">
        <h2 class="type-h3 text-fg mb-1">أوقات الطلب</h2>
        <p class="text-fg-subtle mb-4 text-[13px]">
          أكثر الأوقات طلباً حسب اليوم والساعة — يخبرك متى تحتاج طاقة إضافية.
        </p>
        <DemandHeatmap :cells="heatmap" :from-hour="FROM_HOUR" :to-hour="TO_HOUR" />
      </section>

      <section class="surface p-4">
        <h2 class="type-h3 text-fg mb-4">أعلى الخدمات إيراداً</h2>
        <BaseChart
          :config="servicesChart"
          :height="Math.max(160, services.length * 52)"
          summary="أعمدة أفقية تعرض إيراد كل خدمة خلال الفترة المختارة، مرتّبة تنازلياً."
        />
      </section>
    </template>
  </div>
</template>
