<script setup lang="ts">
import { RotateCcw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { businessHours, resources, services } from '@/data/catalog'
import { duration, money } from '@/lib/format'
import { repository } from '@/data/repository'
import { useBookingsStore } from '@/stores/bookings'
import { useCustomersStore } from '@/stores/customers'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'

/** Read-only for now: these are the inputs the availability engine reads. */
const bookings = useBookingsStore()
const customers = useCustomersStore()
const auth = useAuthStore()

const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

async function resetData() {
  await repository.reset()
  await bookings.load(true)
  await customers.load(true)
  toast.success('أُعيدت البيانات التجريبية إلى حالتها الأولى')
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5 p-4 lg:p-6">
    <h1 class="text-xl font-bold text-gray-900">الإعدادات</h1>

    <section class="surface overflow-hidden">
      <header class="border-b border-gray-200 px-4 py-3">
        <h2 class="text-sm font-bold text-gray-900">الخدمات</h2>
        <p class="mt-0.5 text-xs text-gray-500">المدة والسعر يحددان الأوقات المتاحة للحجز.</p>
      </header>
      <ul class="divide-y divide-gray-200">
        <li v-for="s in services" :key="s.id" class="flex items-center gap-3 px-4 py-3">
          <component :is="s.icon" class="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-gray-900">{{ s.name }}</p>
            <p class="text-xs text-gray-500">
              {{ duration(s.durationMin) }} · فاصل {{ duration(s.bufferMin) }}
            </p>
          </div>
          <span class="shrink-0 text-sm font-bold text-gray-900" data-numeric>
            {{ money(s.priceMinor) }}
          </span>
        </li>
      </ul>
    </section>

    <section class="surface overflow-hidden">
      <header class="border-b border-gray-200 px-4 py-3">
        <h2 class="text-sm font-bold text-gray-900">ساعات العمل</h2>
      </header>
      <ul class="divide-y divide-gray-200">
        <li
          v-for="h in businessHours"
          :key="h.weekday"
          class="flex items-center justify-between px-4 py-2.5"
        >
          <span class="text-sm text-gray-700">{{ WEEKDAYS[h.weekday] }}</span>
          <span v-if="h.isClosed" class="text-sm text-gray-400">مغلق</span>
          <span v-else class="text-sm font-semibold text-gray-900" dir="ltr" data-numeric>
            {{ h.open }} – {{ h.close }}
          </span>
        </li>
      </ul>
    </section>

    <section class="surface overflow-hidden">
      <header class="border-b border-gray-200 px-4 py-3">
        <h2 class="text-sm font-bold text-gray-900">الموارد</h2>
        <p class="mt-0.5 text-xs text-gray-500">لا يمكن حجز موردين في نفس الوقت.</p>
      </header>
      <ul class="divide-y divide-gray-200">
        <li v-for="r in resources" :key="r.id" class="px-4 py-2.5 text-sm text-gray-700">
          {{ r.name }}
        </li>
      </ul>
    </section>

    <section class="surface p-4">
      <h2 class="text-sm font-bold text-gray-900">الحساب</h2>
      <p class="mt-1 text-sm text-gray-600">{{ auth.user?.email ?? 'غير مسجّل' }}</p>
      <div class="mt-4 border-t border-gray-200 pt-4">
        <p class="mb-2 text-xs text-gray-500">
          البيانات محفوظة محلياً في هذا المتصفح. إعادة التعيين تعيد بيانات العرض التجريبية.
        </p>
        <BaseButton :icon="RotateCcw" @click="resetData">إعادة تعيين البيانات</BaseButton>
      </div>
    </section>
  </div>
</template>
