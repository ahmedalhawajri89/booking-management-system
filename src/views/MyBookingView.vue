<script setup>
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
import { isDemoBackend } from '@/data/repository'
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

/**
 * Two backends, one screen.
 *
 * On the demo backend every booking is in the browser, so the store has it and
 * the phone is checked here. Against the API it cannot work that way: a guest
 * reading /bookings gets an empty list by design, because the alternative is
 * handing every visitor the whole customer directory. The reference and the
 * phone go to the server instead, which answers with this one booking or with
 * nothing at all.
 */
const remote = ref(null)

const booking = computed(() =>
  isDemoBackend
    ? (bookings.items.find((b) => b.reference === reference.value) ?? null)
    : remote.value,
)

const view = computed(() =>
  isDemoBackend && booking.value ? bookings.hydrate(booking.value) : null,
)

/** The API returns the service name flat; the store resolves it through a join. */
const serviceName = computed(() =>
  isDemoBackend ? (view.value?.service?.name ?? '') : (remote.value?.serviceName ?? ''),
)

const canCancel = computed(
  () =>
    booking.value?.status === 'pending' ||
    (booking.value?.status === 'confirmed' && new Date(booking.value.startAt) > new Date()),
)

onMounted(async () => {
  // Nothing to preload against the API — the lookup is the load, and it does
  // not happen until the visitor has proved the booking is theirs.
  if (isDemoBackend) await Promise.all([bookings.load(), customers.load()])
})

async function verify() {
  attempted.value = true

  if (isDemoBackend) {
    const digits = phone.value.replace(/\D/g, '')
    const stored = view.value?.customer?.phone.replace(/\D/g, '') ?? ''
    if (digits.length >= 9 && stored.endsWith(digits.slice(-9))) {
      verified.value = true
    } else {
      toast.error('رقم الجوال لا يطابق هذا الحجز')
    }
    return
  }

  try {
    const { lookupBooking } = await import('@/data/api/public')
    remote.value = await lookupBooking(reference.value, phone.value)
    verified.value = true
  } catch {
    // One message for "no such reference" and for "wrong phone", deliberately.
    // Distinguishing them would turn this form into a way to discover which
    // reference numbers exist, and they are sequential enough to enumerate.
    toast.error('رقم الجوال لا يطابق هذا الحجز')
  }
}

async function cancel() {
  if (!booking.value) return
  confirmCancel.value = false

  if (isDemoBackend) {
    bookings.setStatus(booking.value.id, 'cancelled')
    toast.success('أُلغي حجزك')
    return
  }

  try {
    const { cancelBooking } = await import('@/data/api/public')
    await cancelBooking(reference.value, phone.value)
    remote.value = { ...remote.value, status: 'cancelled' }
    toast.success('أُلغي حجزك')
  } catch {
    toast.error('تعذّر إلغاء الحجز. حاول مرة أخرى.')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-surface border-b border-gray-200">
      <div class="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
        <AppLogo compact />
        <RouterLink to="/" class="text-sm font-semibold text-gray-500 hover:text-gray-900">
          الرئيسية
        </RouterLink>
      </div>
    </header>

    <main class="mx-auto max-w-md px-4 py-10">
      <div v-if="isDemoBackend && bookings.isLoading && !bookings.loaded" class="surface p-4">
        <SkeletonBlock variant="text" :count="4" />
      </div>

      <div v-else-if="isDemoBackend && !booking" class="surface">
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
      <div v-else-if="booking" class="space-y-4">
        <div class="surface p-5">
          <div class="mb-4 flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-gray-900" dir="ltr">{{ booking.reference }}</span>
            <StatusBadge :status="booking.status" />
          </div>

          <dl class="space-y-3 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-gray-500">الخدمة</dt>
              <dd class="text-end font-semibold text-gray-900">{{ serviceName }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-gray-500">التاريخ</dt>
              <dd class="text-end font-semibold text-gray-900">{{ fullDate(booking.startAt) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-gray-500">الوقت</dt>
              <dd class="text-end font-semibold text-gray-900">
                {{ timeRange(booking.startAt, booking.endAt) }}
              </dd>
            </div>
            <div class="flex justify-between gap-3 border-t border-gray-200 pt-3">
              <dt class="text-gray-500">الإجمالي</dt>
              <dd class="text-end font-bold text-gray-900" data-numeric>
                {{ money(booking.priceMinor) }}
              </dd>
            </div>
          </dl>
        </div>

        <div v-if="booking.status === 'pending'" class="surface flex items-start gap-3 p-4">
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
      :message="`سيتم إلغاء موعد ${serviceName} في ${booking ? fullDate(booking.startAt) : ''}. لا يمكن التراجع عن هذا الإجراء من هنا.`"
      confirm-label="نعم، ألغِ الحجز"
      @confirm="cancel"
      @cancel="confirmCancel = false"
    />
  </div>
</template>
