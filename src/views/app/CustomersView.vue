<script setup>
import { computed, ref } from 'vue'
import { Download, UserSearch, Users } from 'lucide-vue-next'
import { format } from 'date-fns'
import { useCustomersStore } from '@/stores/customers'
import { useBookingsStore } from '@/stores/bookings'
import { money, relativeDayTime } from '@/lib/format'
import { downloadCsv } from '@/lib/export'
import SearchInput from '@/components/ui/SearchInput.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

const emit = defineEmits(['openBooking'])

const customers = useCustomersStore()
const bookings = useBookingsStore()

const query = ref('')
const selectedId = ref(null)

const results = computed(() => customers.search(query.value))
const selected = computed(() => (selectedId.value ? customers.byId(selectedId.value) : null))

/** Every figure is derived from bookings — nothing is stored or invented. */
function statsFor(customerId) {
  const all = bookings.forCustomer(customerId)
  return {
    all,
    total: all.length,
    completed: all.filter((b) => b.status === 'completed').length,
    noShow: all.filter((b) => b.status === 'no_show').length,
    spend: all.filter((b) => b.paymentStatus === 'paid').reduce((sum, b) => sum + b.priceMinor, 0),
    upcoming: all.filter((b) => new Date(b.startAt) > new Date() && b.status !== 'cancelled'),
  }
}

const stats = computed(() => (selected.value ? statsFor(selected.value.id) : null))

function exportCsv() {
  const columns = [
    { header: 'الاسم', value: (c) => c.name },
    { header: 'الجوال', value: (c) => c.phone },
    { header: 'البريد', value: (c) => c.email ?? '' },
    { header: 'إجمالي الحجوزات', value: (c) => statsFor(c.id).total },
    { header: 'مكتملة', value: (c) => statsFor(c.id).completed },
    { header: 'لم يحضر', value: (c) => statsFor(c.id).noShow },
    { header: 'إجمالي المدفوع', value: (c) => (statsFor(c.id).spend / 100).toFixed(2) },
    { header: 'ملاحظات', value: (c) => c.notes ?? '' },
  ]
  downloadCsv(`customers-${format(new Date(), 'yyyy-MM-dd')}`, results.value, columns)
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 lg:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="type-h3 text-fg">العملاء</h1>
      <div class="flex items-center gap-3">
        <p class="text-fg-subtle text-sm">
          <span data-numeric>{{ results.length }}</span> عميل
        </p>
        <BaseButton size="sm" :icon="Download" :disabled="results.length === 0" @click="exportCsv">
          تصدير
        </BaseButton>
      </div>
    </header>

    <div class="mb-4">
      <SearchInput v-model="query" placeholder="ابحث بالاسم أو رقم الجوال" />
    </div>

    <div class="surface overflow-hidden">
      <ErrorState v-if="customers.error" :message="customers.error" @retry="customers.load(true)" />

      <div v-else-if="customers.isLoading && !customers.loaded" class="p-4">
        <SkeletonBlock variant="row" :count="6" />
      </div>

      <EmptyState
        v-else-if="results.length === 0 && query"
        variant="no-results"
        :icon="UserSearch"
        title="لا عميل بهذا الاسم أو الرقم"
        description="تأكد من الرقم، أو أنشئ الحجز مباشرة وسيُضاف العميل تلقائياً."
      />

      <EmptyState
        v-else-if="results.length === 0"
        variant="first-run"
        :icon="Users"
        title="لا عملاء بعد"
        description="يُضاف العملاء تلقائياً عند إنشاء أول حجز لهم."
      />

      <ul v-else class="divide-border divide-y">
        <li v-for="c in results" :key="c.id">
          <button
            type="button"
            class="hover:bg-primary-50/40 flex w-full items-center gap-3 px-4 py-3 text-start transition-colors"
            @click="selectedId = c.id"
          >
            <BaseAvatar :name="c.name" size="sm" />
            <span class="min-w-0 flex-1">
              <span class="text-fg block truncate text-sm font-semibold">{{ c.name }}</span>
              <span
                class="text-fg-subtle block truncate text-xs"
                dir="ltr"
                style="text-align: start"
              >
                {{ c.phone }}
              </span>
            </span>
            <span class="text-fg-subtle shrink-0 text-xs">
              <!-- O(1): the store keeps a customer→bookings index. -->
              <span data-numeric>{{ bookings.forCustomer(c.id).length }}</span> حجز
            </span>
          </button>
        </li>
      </ul>
    </div>

    <BaseDrawer
      :open="selected !== null"
      :title="selected?.name ?? ''"
      :subtitle="selected?.phone"
      @close="selectedId = null"
    >
      <div v-if="selected && stats" class="space-y-5">
        <dl class="grid grid-cols-2 gap-3">
          <div class="surface p-3">
            <dt class="text-xs text-gray-500">إجمالي الحجوزات</dt>
            <dd class="mt-1 text-xl font-bold text-gray-900" data-numeric>{{ stats.total }}</dd>
          </div>
          <div class="surface p-3">
            <dt class="text-xs text-gray-500">مكتملة</dt>
            <dd class="mt-1 text-xl font-bold text-gray-900" data-numeric>{{ stats.completed }}</dd>
          </div>
          <div class="surface p-3">
            <dt class="text-xs text-gray-500">لم يحضر</dt>
            <dd
              class="mt-1 text-xl font-bold"
              :class="stats.noShow ? 'text-danger-700' : 'text-gray-900'"
              data-numeric
            >
              {{ stats.noShow }}
            </dd>
          </div>
          <div class="surface p-3">
            <dt class="text-xs text-gray-500">إجمالي المدفوع</dt>
            <dd class="mt-1 text-xl font-bold text-gray-900" data-numeric>
              {{ money(stats.spend) }}
            </dd>
          </div>
        </dl>

        <section v-if="stats.upcoming.length">
          <h3 class="mb-2 text-[13px] font-semibold text-gray-700">مواعيد قادمة</h3>
          <ul class="surface divide-y divide-gray-200 overflow-hidden">
            <li v-for="b in stats.upcoming" :key="b.id">
              <button
                type="button"
                class="hover:bg-primary-50/40 flex w-full items-center gap-2 px-3 py-2.5 text-start"
                @click="emit('openBooking', b.id)"
              >
                <span class="min-w-0 flex-1 truncate text-sm text-gray-900">
                  {{ relativeDayTime(b.startAt) }}
                </span>
                <StatusBadge :status="b.status" size="sm" />
              </button>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="mb-2 text-[13px] font-semibold text-gray-700">كل السجل</h3>
          <ul class="surface divide-y divide-gray-200 overflow-hidden">
            <li v-for="b in stats.all" :key="b.id">
              <button
                type="button"
                class="hover:bg-primary-50/40 flex w-full items-center gap-2 px-3 py-2.5 text-start"
                @click="emit('openBooking', b.id)"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm text-gray-900">
                    {{ relativeDayTime(b.startAt) }}
                  </span>
                  <span class="block truncate text-xs text-gray-500">
                    {{ bookings.hydrate(b).service?.name }}
                  </span>
                </span>
                <StatusBadge :status="b.status" size="sm" />
              </button>
            </li>
          </ul>
        </section>
      </div>
    </BaseDrawer>
  </div>
</template>
