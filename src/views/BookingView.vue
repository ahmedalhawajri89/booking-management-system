<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { startOfDay } from 'date-fns'
import { ArrowLeft, ArrowRight, Check, Copy, Phone, User } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import DateStrip from '@/components/booking/DateStrip.vue'
import TimeSlotGrid from '@/components/booking/TimeSlotGrid.vue'
import AppLogo from '@/components/ui/AppLogo.vue'
import { useBookingsStore } from '@/stores/bookings'
import { useCustomersStore } from '@/stores/customers'
import { useSettingsStore } from '@/stores/settings'
import { businessHours, services } from '@/data/catalog'
import { generateSlots } from '@/lib/availability'
import { duration, fullDate, money, time } from '@/lib/format'

/**
 * Guest booking flow. Unlike the previous build this produces a real booking,
 * captures the fields it asks for, survives a refresh, and hands the customer a
 * reference they can look up later.
 */
const bookings = useBookingsStore()
const customers = useCustomersStore()
const settings = useSettingsStore()

const DRAFT_KEY = 'bookingpro:draft:v1'

const step = ref(1)
const serviceId = ref<string | null>(null)
const date = ref(startOfDay(new Date()))
const startAt = ref<string | null>(null)
const name = ref('')
const phone = ref('')
const notes = ref('')
const touched = ref(false)
const submitting = ref(false)
const reference = ref<string | null>(null)

const service = computed(() => services.find((s) => s.id === serviceId.value) ?? null)

/** Guests book the first resource that can deliver the service. */
const resourceId = computed(() => service.value?.resourceIds[0] ?? null)

const slots = computed(() => {
  if (!service.value || !resourceId.value) return []
  return generateSlots({
    date: date.value,
    service: service.value,
    resourceId: resourceId.value,
    bookings: bookings.items,
    hours: businessHours,
  })
})

const phoneError = computed(() => {
  if (!touched.value) return undefined
  const digits = phone.value.replace(/\D/g, '')
  if (!digits) return 'رقم الجوال مطلوب'
  if (digits.length < 9) return 'رقم الجوال غير مكتمل'
  return undefined
})
const nameError = computed(() => (touched.value && !name.value.trim() ? 'الاسم مطلوب' : undefined))

const canContinue = computed(() => {
  if (step.value === 1) return serviceId.value !== null
  if (step.value === 2) return startAt.value !== null
  return !nameError.value && !phoneError.value && !!name.value.trim() && !!phone.value.trim()
})

/* --- draft: a refresh or an accidental back must not destroy progress --- */
function saveDraft() {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        step: step.value,
        serviceId: serviceId.value,
        date: date.value.toISOString(),
        startAt: startAt.value,
        name: name.value,
        phone: phone.value,
        notes: notes.value,
      }),
    )
  } catch {
    /* ignore */
  }
}

onMounted(async () => {
  // The guest wizard offers slots computed from services and opening hours,
  // so the catalog has to be current before the first grid renders.
  await Promise.all([settings.load(), bookings.load(), customers.load()])
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const d = JSON.parse(raw)
    if (d.serviceId && services.some((s) => s.id === d.serviceId)) {
      serviceId.value = d.serviceId
      date.value = new Date(d.date)
      startAt.value = d.startAt
      name.value = d.name ?? ''
      phone.value = d.phone ?? ''
      notes.value = d.notes ?? ''
      step.value = Math.min(d.step ?? 1, 3)
      if (step.value > 1) toast.info('استأنفنا حجزك من حيث توقفت')
    }
  } catch {
    /* ignore malformed drafts */
  }
})

watch([step, serviceId, date, startAt, name, phone, notes], saveDraft)
watch([serviceId, date], () => {
  startAt.value = null
})

function goNext() {
  touched.value = true
  if (!canContinue.value) return
  touched.value = false
  step.value += 1
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goBack() {
  step.value -= 1
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function submit() {
  touched.value = true
  if (!canContinue.value || !serviceId.value || !resourceId.value || !startAt.value) return
  submitting.value = true
  try {
    const customer = customers.upsert({ name: name.value, phone: phone.value })
    const created = bookings.create({
      customerId: customer.id,
      serviceId: serviceId.value,
      resourceId: resourceId.value,
      startAt: startAt.value,
      status: 'pending',
      paymentStatus: 'unpaid',
      channel: 'online',
      notes: notes.value.trim() || undefined,
    })
    reference.value = created.reference
    localStorage.removeItem(DRAFT_KEY)
    step.value = 4
  } finally {
    submitting.value = false
  }
}

async function copyReference() {
  if (!reference.value) return
  try {
    await navigator.clipboard.writeText(reference.value)
    toast.success('نُسخ رقم الحجز')
  } catch {
    toast.error('تعذّر النسخ — انسخ الرقم يدوياً')
  }
}

const STEPS = ['الخدمة', 'الموعد', 'بياناتك']
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="sticky top-0 z-20 border-b border-gray-200 bg-surface/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <AppLogo compact />
        <RouterLink to="/" class="text-sm font-semibold text-gray-500 hover:text-gray-900">
          إلغاء
        </RouterLink>
      </div>
    </header>

    <!-- confirmation -->
    <main v-if="step === 4" class="mx-auto max-w-md px-4 py-14">
      <div class="surface animate-pop-in p-7 text-center">
        <div
          class="bg-success-50 text-success-700 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        >
          <Check class="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 class="mb-2 text-xl font-bold text-gray-900">وصلنا طلبك</h1>
        <p class="mb-6 text-sm leading-relaxed text-gray-600">
          سنؤكد موعدك ونتواصل معك على
          <span dir="ltr" class="font-semibold text-gray-900">{{ phone }}</span>
          قبل
          <strong class="text-gray-900">{{ startAt ? fullDate(startAt) : '' }}</strong>
          الساعة <strong class="text-gray-900">{{ startAt ? time(startAt) : '' }}</strong
          >.
        </p>

        <div
          class="border-primary-300 bg-primary-50 mb-6 rounded-[var(--radius-lg)] border border-dashed p-4"
        >
          <p class="text-primary-700 text-xs font-semibold">رقم الحجز — احفظه للمتابعة</p>
          <p class="mt-1 text-lg font-bold text-gray-900" dir="ltr" data-numeric>{{ reference }}</p>
          <BaseButton size="sm" :icon="Copy" class="mt-3" @click="copyReference"
            >نسخ الرقم</BaseButton
          >
        </div>

        <div class="flex justify-center gap-2">
          <BaseButton @click="$router.push('/')">الصفحة الرئيسية</BaseButton>
          <BaseButton variant="primary" @click="$router.push(`/booking/${reference}`)">
            متابعة حجزي
          </BaseButton>
        </div>
      </div>
    </main>

    <!-- wizard -->
    <main v-else class="mx-auto max-w-3xl px-4 py-6">
      <!-- progress -->
      <ol class="mb-6 flex items-center gap-2" aria-label="خطوات الحجز">
        <li v-for="(label, i) in STEPS" :key="label" class="flex flex-1 items-center gap-2">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            :class="
              step > i + 1
                ? 'bg-primary-600 text-white'
                : step === i + 1
                  ? 'border-primary-600 text-primary-700 border-2'
                  : 'bg-gray-100 text-gray-400'
            "
            :aria-current="step === i + 1 ? 'step' : undefined"
          >
            <Check v-if="step > i + 1" class="h-3.5 w-3.5" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span
            class="hidden text-xs font-semibold sm:block"
            :class="step >= i + 1 ? 'text-gray-900' : 'text-gray-400'"
          >
            {{ label }}
          </span>
          <span v-if="i < STEPS.length - 1" class="h-px flex-1 bg-gray-200" aria-hidden="true" />
        </li>
      </ol>

      <Transition name="step" mode="out-in">
        <!-- 1: service -->
        <section v-if="step === 1" key="s1" aria-labelledby="s1-h">
          <h1 id="s1-h" class="mb-1 text-xl font-bold text-gray-900">اختر الخدمة</h1>
          <p class="mb-5 text-sm text-gray-600">السعر والمدة واضحان من البداية.</p>

          <div class="grid gap-3 sm:grid-cols-3">
            <button
              v-for="s in services"
              :key="s.id"
              type="button"
              class="surface p-4 text-start transition-all"
              :class="
                serviceId === s.id
                  ? 'border-primary-500 ring-primary-500/20 ring-2'
                  : 'hover:border-primary-300'
              "
              :aria-pressed="serviceId === s.id"
              @click="serviceId = s.id"
            >
              <component :is="s.icon" class="text-primary-600 mb-3 h-6 w-6" aria-hidden="true" />
              <h2 class="text-sm font-bold text-gray-900">{{ s.name }}</h2>
              <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                {{ s.description }}
              </p>
              <div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <span class="text-sm font-bold text-gray-900" data-numeric>{{
                  money(s.priceMinor)
                }}</span>
                <span class="text-xs text-gray-500">{{ duration(s.durationMin) }}</span>
              </div>
            </button>
          </div>
        </section>

        <!-- 2: when -->
        <section v-else-if="step === 2" key="s2" aria-labelledby="s2-h">
          <h1 id="s2-h" class="mb-1 text-xl font-bold text-gray-900">اختر الموعد</h1>
          <p class="mb-5 text-sm text-gray-600">
            الأوقات المعروضة متاحة فعلاً — المحجوز يظهر معطّلاً.
          </p>

          <div class="surface space-y-5 p-4">
            <div>
              <p class="mb-2 text-[13px] font-semibold text-gray-700">اليوم</p>
              <DateStrip v-model="date" :days="7" />
            </div>
            <div>
              <p class="mb-2 text-[13px] font-semibold text-gray-700">الوقت</p>
              <TimeSlotGrid
                :slots="slots"
                :model-value="startAt"
                @update:model-value="startAt = $event"
              />
            </div>
          </div>
        </section>

        <!-- 3: details -->
        <section v-else key="s3" aria-labelledby="s3-h">
          <h1 id="s3-h" class="mb-1 text-xl font-bold text-gray-900">بياناتك</h1>
          <p class="mb-5 text-sm text-gray-600">نحتاج طريقة نتواصل بها معك لتأكيد الموعد.</p>

          <div class="surface space-y-4 p-4">
            <BaseInput
              v-model="name"
              label="الاسم الكامل"
              :icon="User"
              required
              :error="nameError"
            />
            <BaseInput
              v-model="phone"
              label="رقم الجوال"
              type="tel"
              :icon="Phone"
              ltr
              required
              placeholder="05XXXXXXXX"
              :error="phoneError"
              hint="سنرسل تأكيد الحجز على هذا الرقم."
            />
            <BaseInput
              v-model="notes"
              label="ملاحظات"
              type="textarea"
              :rows="3"
              placeholder="اختياري"
            />
          </div>

          <!-- summary is visible before committing, not hidden behind a step -->
          <div v-if="service && startAt" class="surface mt-4 divide-y divide-gray-200">
            <div class="flex justify-between p-3 text-sm">
              <span class="text-gray-500">الخدمة</span>
              <span class="font-semibold text-gray-900">{{ service.name }}</span>
            </div>
            <div class="flex justify-between p-3 text-sm">
              <span class="text-gray-500">الموعد</span>
              <span class="font-semibold text-gray-900">
                {{ fullDate(startAt) }} · {{ time(startAt) }}
              </span>
            </div>
            <div class="flex justify-between p-3 text-sm">
              <span class="text-gray-500">الإجمالي</span>
              <span class="font-bold text-gray-900" data-numeric>{{
                money(service.priceMinor)
              }}</span>
            </div>
          </div>
        </section>
      </Transition>

      <!-- actions -->
      <div class="mt-6 flex items-center justify-between gap-3 border-t border-gray-200 pt-5">
        <BaseButton v-if="step > 1" :icon="ArrowRight" @click="goBack">السابق</BaseButton>
        <span v-else />

        <BaseButton
          v-if="step < 3"
          variant="primary"
          :icon-end="ArrowLeft"
          :disabled="!canContinue"
          @click="goNext"
        >
          التالي
        </BaseButton>
        <BaseButton v-else variant="primary" :loading="submitting" @click="submit">
          تأكيد الحجز
        </BaseButton>
      </div>
    </main>
  </div>
</template>
