<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarClock, SearchX } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppLogo from '@/components/ui/AppLogo.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { useBookingsStore } from '@/stores/bookings'
import { useCustomersStore } from '@/stores/customers'
import { fullDate, money, timeRange } from '@/lib/format'

/**
 * Closes the loop the previous build left open: a customer who booked online
 * can find that booking again, see its state, and cancel it themselves.
 * Verification is reference + phone — no account required.
 */
const route = useRoute()
const bookings = useBookingsStore()
const customers = useCustomersStore()

const reference = computed(() => String(route.params.reference ?? ''))
const phone = ref('')
const verified = ref(false)
const attempted = ref(false)
const confirmCancel = ref(false)

const booking = computed(() => bookings.items.find((b) => b.reference === reference.value) ?? null)
const view = computed(() => (booking.value ? bookings.hydrate(booking.value) : null))
const canCancel = computed(
  () =>
    booking.value?.status === 'pending' ||
    (booking.value?.status === 'confirmed' && new Date(booking.value.startAt) > new Date()),
)

onMounted(async () => {
  await Promise.all([bookings.load(), customers.load()])
})

function verify() {
  attempted.value = true
  const digits = phone.value.replace(/\D/g, '')
  const stored = view.value?.customer?.phone.replace(/\D/g, '') ?? ''
  if (digits.length >= 9 && stored.endsWith(digits.slice(-9))) {
    verified.value = true
  } else {
    toast.error('رقم الجوال لا يطابق هذا الحجز')
  }
}

function cancel() {
  if (!booking.value) return
  bookings.setStatus(booking.value.id, 'cancelled')
  confirmCancel.value = false
  toast.success('أُلغي حجزك')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="border-b border-gray-200 bg-surface">
      <div class="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
        <AppLogo compact />
        <RouterLink to="/" class="text-sm font-semibold text-gray-500 hover:text-gray-900">
          الرئيسية
        </RouterLink>
      </div>
    </header>

    <main class="mx-auto max-w-md px-4 py-10">
      <div v-if="bookings.isLoading && !bookings.loaded" class="surface p-4">
        <SkeletonBlock variant="text" :count="4" />
      </div>

      <div v-else-if="!booking" class="surface">
        <EmptyState
          variant="no-results"
          :icon="SearchX"
          title="لم نجد هذا الحجز"
          :description="`لا يوجد حجز بالرقم ${reference}. تأكد من الرقم كما وصلك عند التأكيد.`"
        >
          <template #action>
            <BaseButton variant="primary" @click="$router.push('/book')">احجز موعداً</BaseButton>
          </template>
        </EmptyState>
      </div>

      <!-- verify ownership before revealing anything -->
      <div v-else-if="!verified" class="surface p-5">
        <h1 class="text-lg font-bold text-gray-900">تأكيد الهوية</h1>
        <p class="mt-1 mb-5 text-sm leading-relaxed text-gray-600">
          أدخل رقم الجوال الذي حجزت به لعرض تفاصيل الحجز
          <span dir="ltr" class="font-semibold">{{ reference }}</span
          >.
        </p>
        <form class="space-y-4" @submit.prevent="verify">
          <BaseInput
            v-model="phone"
            label="رقم الجوال"
            type="tel"
            ltr
            required
            placeholder="05XXXXXXXX"
            :error="attempted && !verified ? 'الرقم غير مطابق' : undefined"
          />
          <BaseButton type="submit" variant="primary" block>عرض الحجز</BaseButton>
        </form>
      </div>

      <!-- the booking -->
      <div v-else-if="view" class="space-y-4">
        <div class="surface p-5">
          <div class="mb-4 flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-gray-900" dir="ltr">{{ booking!.reference }}</span>
            <StatusBadge :status="booking!.status" />
          </div>

          <dl class="space-y-3 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-gray-500">الخدمة</dt>
              <dd class="text-end font-semibold text-gray-900">{{ view.service?.name }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-gray-500">التاريخ</dt>
              <dd class="text-end font-semibold text-gray-900">{{ fullDate(booking!.startAt) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-gray-500">الوقت</dt>
              <dd class="text-end font-semibold text-gray-900">
                {{ timeRange(booking!.startAt, booking!.endAt) }}
              </dd>
            </div>
            <div class="flex justify-between gap-3 border-t border-gray-200 pt-3">
              <dt class="text-gray-500">الإجمالي</dt>
              <dd class="text-end font-bold text-gray-900" data-numeric>
                {{ money(booking!.priceMinor) }}
              </dd>
            </div>
          </dl>
        </div>

        <div v-if="booking!.status === 'pending'" class="surface flex items-start gap-3 p-4">
          <CalendarClock class="text-warning-700 mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p class="text-sm leading-relaxed text-gray-600">
            حجزك بانتظار التأكيد من الفريق. سنتواصل معك قريباً.
          </p>
        </div>

        <BaseButton v-if="canCancel" variant="danger" block @click="confirmCancel = true">
          إلغاء الحجز
        </BaseButton>
      </div>
    </main>

    <ConfirmDialog
      :open="confirmCancel"
      title="إلغاء حجزك؟"
      :message="`سيتم إلغاء موعد ${view?.service?.name ?? ''} في ${booking ? fullDate(booking.startAt) : ''}. لا يمكن التراجع عن هذا الإجراء من هنا.`"
      confirm-label="نعم، ألغِ الحجز"
      @confirm="cancel"
      @cancel="confirmCancel = false"
    />
  </div>
</template>
