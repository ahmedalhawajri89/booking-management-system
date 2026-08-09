<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { startOfDay } from 'date-fns'
import { Phone, User } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import DateStrip from './DateStrip.vue'
import TimeSlotGrid from './TimeSlotGrid.vue'
import { useBookingsStore } from '@/stores/bookings'
import { useCustomersStore } from '@/stores/customers'
import { businessHours, resources, services } from '@/data/catalog'
import { generateSlots } from '@/lib/availability'
import { money, duration } from '@/lib/format'
import type { PaymentStatus } from '@/types'

/**
 * Operator create/reschedule on a single surface — no stepper. Availability
 * recomputes live, so an impossible booking cannot be submitted.
 */
const props = withDefaults(defineProps<{ open: boolean; rescheduleId?: string | null }>(), {
  rescheduleId: null,
})
const emit = defineEmits<{ close: []; created: [id: string] }>()

const bookings = useBookingsStore()
const customers = useCustomersStore()

const serviceId = ref(services[0]!.id)
const resourceId = ref(services[0]!.resourceIds[0]!)
const date = ref(startOfDay(new Date()))
const startAt = ref<string | null>(null)
const phone = ref('')
const name = ref('')
const paymentStatus = ref<PaymentStatus>('unpaid')
const notes = ref('')
const submitting = ref(false)
const touched = ref(false)

const service = computed(() => services.find((s) => s.id === serviceId.value)!)
const allowedResources = computed(() =>
  resources.filter((r) => service.value.resourceIds.includes(r.id)),
)

/** A phone that matches an existing customer pre-fills the name. */
const matched = computed(() => (phone.value.trim() ? customers.byPhone(phone.value) : null))

const slots = computed(() =>
  generateSlots({
    date: date.value,
    service: service.value,
    resourceId: resourceId.value,
    bookings: bookings.items,
    hours: businessHours,
    excludeBookingId: props.rescheduleId ?? undefined,
  }),
)

const nameError = computed(() =>
  touched.value && !name.value.trim() && !matched.value ? 'الاسم مطلوب' : undefined,
)
const phoneError = computed(() => {
  if (!touched.value) return undefined
  const digits = phone.value.replace(/\D/g, '')
  if (digits.length === 0) return 'رقم الجوال مطلوب'
  if (digits.length < 9) return 'رقم الجوال غير مكتمل'
  return undefined
})
const canSubmit = computed(
  () => !!startAt.value && !phoneError.value && (!!matched.value || !!name.value.trim()),
)

watch(matched, (c) => {
  if (c) name.value = c.name
})

watch(service, (s) => {
  if (!s.resourceIds.includes(resourceId.value)) resourceId.value = s.resourceIds[0]!
  startAt.value = null
})
watch([date, resourceId], () => {
  startAt.value = null
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    touched.value = false
    startAt.value = null
    phone.value = ''
    name.value = ''
    notes.value = ''
    paymentStatus.value = 'unpaid'
    date.value = startOfDay(new Date())
  },
)

async function submit() {
  touched.value = true
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const customer = customers.upsert({ name: name.value, phone: phone.value })
    if (props.rescheduleId) {
      bookings.reschedule(props.rescheduleId, startAt.value!)
      toast.success('تمت إعادة الجدولة')
      emit('close')
      return
    }
    const created = bookings.create({
      customerId: customer.id,
      serviceId: serviceId.value,
      resourceId: resourceId.value,
      startAt: startAt.value!,
      status: 'confirmed',
      paymentStatus: paymentStatus.value,
      channel: 'phone',
      notes: notes.value.trim() || undefined,
    })
    toast.success('تم إنشاء الحجز', { description: created.reference })
    emit('close')
    emit('created', created.id)
  } finally {
    submitting.value = false
  }
}

const PAYMENTS: { value: PaymentStatus; label: string }[] = [
  { value: 'unpaid', label: 'غير مدفوع' },
  { value: 'deposit_paid', label: 'عربون' },
  { value: 'paid', label: 'مدفوع' },
]
</script>

<template>
  <BaseDrawer
    :open="open"
    :title="rescheduleId ? 'إعادة جدولة' : 'حجز جديد'"
    :subtitle="rescheduleId ? 'اختر وقتاً جديداً متاحاً' : 'أنشئ حجزاً في أقل من دقيقة'"
    @close="emit('close')"
  >
    <div class="space-y-5">
      <!-- service -->
      <fieldset>
        <legend class="mb-1.5 text-[13px] font-semibold text-gray-700">الخدمة</legend>
        <div class="grid gap-2">
          <label
            v-for="s in services"
            :key="s.id"
            class="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors"
            :class="
              serviceId === s.id
                ? 'border-primary-500 bg-primary-50'
                : 'hover:border-primary-300 border-gray-200'
            "
          >
            <input
              v-model="serviceId"
              type="radio"
              :value="s.id"
              class="sr-only"
              :disabled="!!rescheduleId"
            />
            <component :is="s.icon" class="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-gray-900">{{ s.name }}</span>
              <span class="block text-xs text-gray-500">{{ duration(s.durationMin) }}</span>
            </span>
            <span class="shrink-0 text-sm font-bold text-gray-900" data-numeric>
              {{ money(s.priceMinor) }}
            </span>
          </label>
        </div>
      </fieldset>

      <!-- resource -->
      <fieldset v-if="allowedResources.length > 1">
        <legend class="mb-1.5 text-[13px] font-semibold text-gray-700">المورد</legend>
        <div class="flex gap-2">
          <label
            v-for="r in allowedResources"
            :key="r.id"
            class="flex-1 cursor-pointer rounded-[var(--radius-md)] border px-3 py-2 text-center text-sm font-semibold transition-colors"
            :class="
              resourceId === r.id
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'hover:border-primary-300 border-gray-200 text-gray-600'
            "
          >
            <input v-model="resourceId" type="radio" :value="r.id" class="sr-only" />
            {{ r.name }}
          </label>
        </div>
      </fieldset>

      <!-- when -->
      <div>
        <p class="mb-1.5 text-[13px] font-semibold text-gray-700">اليوم</p>
        <DateStrip v-model="date" :days="7" />
      </div>

      <div>
        <p class="mb-1.5 text-[13px] font-semibold text-gray-700">الوقت</p>
        <TimeSlotGrid
          :slots="slots"
          :model-value="startAt"
          @update:model-value="startAt = $event"
        />
      </div>

      <!-- customer -->
      <template v-if="!rescheduleId">
        <div class="grid gap-4 border-t border-gray-200 pt-5">
          <BaseInput
            v-model="phone"
            label="رقم الجوال"
            type="tel"
            :icon="Phone"
            ltr
            required
            placeholder="05XXXXXXXX"
            :error="phoneError"
            :hint="
              matched ? `عميل مسجّل: ${matched.name}` : 'إن كان الرقم مسجّلاً سيُملأ الاسم تلقائياً'
            "
          />
          <BaseInput
            v-model="name"
            label="اسم العميل"
            :icon="User"
            required
            :disabled="!!matched"
            :error="nameError"
            placeholder="الاسم الكامل"
          />
        </div>

        <fieldset>
          <legend class="mb-1.5 text-[13px] font-semibold text-gray-700">حالة الدفع</legend>
          <div class="flex gap-2">
            <label
              v-for="p in PAYMENTS"
              :key="p.value"
              class="flex-1 cursor-pointer rounded-[var(--radius-md)] border px-2 py-2 text-center text-xs font-semibold transition-colors"
              :class="
                paymentStatus === p.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'hover:border-primary-300 border-gray-200 text-gray-600'
              "
            >
              <input v-model="paymentStatus" type="radio" :value="p.value" class="sr-only" />
              {{ p.label }}
            </label>
          </div>
        </fieldset>

        <BaseInput
          v-model="notes"
          label="ملاحظات"
          type="textarea"
          :rows="2"
          placeholder="اختياري"
        />
      </template>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm text-gray-500">
          الإجمالي
          <strong class="text-gray-900" data-numeric>{{ money(service.priceMinor) }}</strong>
        </span>
        <div class="flex gap-2">
          <BaseButton variant="ghost" @click="emit('close')">إلغاء</BaseButton>
          <BaseButton
            variant="primary"
            :loading="submitting"
            :disabled="!canSubmit"
            @click="submit"
          >
            {{ rescheduleId ? 'تأكيد الموعد الجديد' : 'إنشاء الحجز' }}
          </BaseButton>
        </div>
      </div>
    </template>
  </BaseDrawer>
</template>
