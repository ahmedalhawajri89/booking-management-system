<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { isSameDay, isWithinInterval, startOfDay, addDays } from 'date-fns'
import { CalendarPlus, SearchX } from 'lucide-vue-next'
import type { Booking, BookingStatus } from '@/types'
import { useBookingsStore } from '@/stores/bookings'
import { useCustomersStore } from '@/stores/customers'
import { services } from '@/data/catalog'
import { BOOKING_STATUS } from '@/lib/status'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import BookingRow from '@/components/booking/BookingRow.vue'

const emit = defineEmits<{ openBooking: [id: string] }>()

const route = useRoute()
const store = useBookingsStore()
const customers = useCustomersStore()

type QuickFilter = 'all' | 'today' | 'week' | 'pending' | 'unpaid' | 'attention'

const query = ref('')
const quick = ref<QuickFilter>('all')
const status = ref<BookingStatus | 'all'>('all')
const serviceId = ref<string | 'all'>('all')

const QUICK: { value: QuickFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'today', label: 'اليوم' },
  { value: 'week', label: 'هذا الأسبوع' },
  { value: 'pending', label: 'بانتظار التأكيد' },
  { value: 'unpaid', label: 'غير مدفوع' },
  { value: 'attention', label: 'يحتاج إجراء' },
]

onMounted(() => {
  query.value = (route.query.q as string) ?? ''
  if (route.query.filter === 'attention') quick.value = 'attention'
})

watch(
  () => route.query,
  (q) => {
    if (typeof q.q === 'string') query.value = q.q
    if (q.filter === 'attention') quick.value = 'attention'
  },
)

const attentionIds = computed(() => new Set(store.attention.map((a) => a.booking.id)))

function matchesQuick(b: Booking): boolean {
  const start = new Date(b.startAt)
  switch (quick.value) {
    case 'today':
      return isSameDay(start, new Date())
    case 'week':
      return isWithinInterval(start, {
        start: startOfDay(new Date()),
        end: addDays(startOfDay(new Date()), 7),
      })
    case 'pending':
      return b.status === 'pending'
    case 'unpaid':
      return b.paymentStatus === 'unpaid' && b.status !== 'cancelled'
    case 'attention':
      return attentionIds.value.has(b.id)
    default:
      return true
  }
}

function matchesQuery(b: Booking): boolean {
  const q = query.value.trim()
  if (!q) return true
  const digits = q.replace(/\D/g, '')
  const customer = customers.byId(b.customerId)
  return (
    b.reference.toLowerCase().includes(q.toLowerCase()) ||
    (customer?.name.includes(q) ?? false) ||
    (digits.length > 2 && (customer?.phone.replace(/\D/g, '').includes(digits) ?? false))
  )
}

const results = computed(() =>
  store.sorted.filter(
    (b) =>
      matchesQuick(b) &&
      matchesQuery(b) &&
      (status.value === 'all' || b.status === status.value) &&
      (serviceId.value === 'all' || b.serviceId === serviceId.value),
  ),
)

const hasFilters = computed(
  () =>
    query.value.trim() !== '' ||
    quick.value !== 'all' ||
    status.value !== 'all' ||
    serviceId.value !== 'all',
)

function clearAll() {
  query.value = ''
  quick.value = 'all'
  status.value = 'all'
  serviceId.value = 'all'
}
</script>

<template>
  <div class="mx-auto max-w-7xl p-4 lg:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-bold text-gray-900">الحجوزات</h1>
      <p class="text-sm text-gray-500">
        <span data-numeric>{{ results.length }}</span> من
        <span data-numeric>{{ store.items.length }}</span>
      </p>
    </header>

    <!-- filters -->
    <div class="mb-4 space-y-3">
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="مرشّحات سريعة">
        <button
          v-for="f in QUICK"
          :key="f.value"
          type="button"
          :aria-pressed="quick === f.value"
          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="
            quick === f.value
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'hover:border-primary-300 hover:text-primary-700 border-gray-200 bg-white text-gray-600'
          "
          @click="quick = f.value"
        >
          {{ f.label }}
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <label class="sr-only" for="f-status">الحالة</label>
        <select
          id="f-status"
          v-model="status"
          class="focus:border-primary-400 h-9 rounded-[var(--radius-md)] border border-gray-200 bg-white px-2.5 text-sm text-gray-700 focus:outline-none"
        >
          <option value="all">كل الحالات</option>
          <option v-for="(meta, key) in BOOKING_STATUS" :key="key" :value="key">
            {{ meta.label }}
          </option>
        </select>

        <label class="sr-only" for="f-service">الخدمة</label>
        <select
          id="f-service"
          v-model="serviceId"
          class="focus:border-primary-400 h-9 rounded-[var(--radius-md)] border border-gray-200 bg-white px-2.5 text-sm text-gray-700 focus:outline-none"
        >
          <option value="all">كل الخدمات</option>
          <option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>

        <button
          v-if="hasFilters"
          type="button"
          class="h-9 rounded-[var(--radius-md)] px-2.5 text-sm font-semibold text-gray-500 hover:text-gray-900"
          @click="clearAll"
        >
          مسح المرشّحات
        </button>
      </div>
    </div>

    <!-- results -->
    <div class="surface overflow-hidden">
      <div v-if="store.isLoading && !store.loaded" class="p-4">
        <SkeletonBlock variant="row" :count="6" />
      </div>

      <EmptyState
        v-else-if="results.length === 0 && hasFilters"
        variant="no-results"
        :icon="SearchX"
        title="لا نتائج مطابقة"
        description="جرّب توسيع نطاق البحث أو مسح المرشّحات للعودة إلى كل الحجوزات."
      />

      <EmptyState
        v-else-if="results.length === 0"
        variant="first-run"
        :icon="CalendarPlus"
        title="لا توجد حجوزات بعد"
        description="ابدأ بإنشاء أول حجز — اضغط N أو استخدم زر «حجز جديد» في الأعلى."
      />

      <div v-else role="list">
        <BookingRow
          v-for="b in results"
          :key="b.id"
          :booking="b"
          show-day
          @open="emit('openBooking', $event)"
        />
      </div>
    </div>
  </div>
</template>
