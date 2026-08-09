<script setup lang="ts">
import { computed, ref } from 'vue'
import { UserSearch, Users } from 'lucide-vue-next'
import { useCustomersStore } from '@/stores/customers'
import { useBookingsStore } from '@/stores/bookings'
import { money, relativeDayTime } from '@/lib/format'
import SearchInput from '@/components/ui/SearchInput.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

const emit = defineEmits<{ openBooking: [id: string] }>()

const customers = useCustomersStore()
const bookings = useBookingsStore()

const query = ref('')
const selectedId = ref<string | null>(null)

const results = computed(() => customers.search(query.value))
const selected = computed(() => (selectedId.value ? customers.byId(selectedId.value) : null))

/** Every figure is derived from bookings — nothing is stored or invented. */
function statsFor(customerId: string) {
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
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 lg:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-bold text-gray-900">العملاء</h1>
      <p class="text-sm text-gray-500">
        <span data-numeric>{{ results.length }}</span> عميل
      </p>
    </header>

    <div class="mb-4">
      <SearchInput v-model="query" placeholder="ابحث بالاسم أو رقم الجوال" />
    </div>

    <div class="surface overflow-hidden">
      <div v-if="customers.isLoading && !customers.loaded" class="p-4">
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

      <ul v-else class="divide-y divide-gray-200">
        <li v-for="c in results" :key="c.id">
          <button
            type="button"
            class="hover:bg-primary-50/40 flex w-full items-center gap-3 px-4 py-3 text-start transition-colors"
            @click="selectedId = c.id"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600"
              aria-hidden="true"
            >
              {{ c.name.charAt(0) }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-gray-900">{{ c.name }}</span>
              <span
                class="block truncate text-xs text-gray-500"
                dir="ltr"
                style="text-align: start"
              >
                {{ c.phone }}
              </span>
            </span>
            <span class="shrink-0 text-xs text-gray-500">
              <span data-numeric>{{ statsFor(c.id).total }}</span> حجز
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
