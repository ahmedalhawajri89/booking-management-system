<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus, RotateCcw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { BusinessHours, Resource } from '@/types'
import { businessHours, resources, services, type ServiceRow } from '@/data/catalog'
import { duration, money } from '@/lib/format'
import { SERVICE_ICON_KEYS, SERVICE_ICON_LABELS, iconFor } from '@/lib/icons'
import { repository } from '@/data/repository'
import { useBookingsStore } from '@/stores/bookings'
import { useCustomersStore } from '@/stores/customers'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import ErrorState from '@/components/ui/ErrorState.vue'

/**
 * The configuration the availability engine reads. This screen used to render
 * it read-only, which made the product look like a demo of someone else's
 * data — an operator could not change their own opening hours.
 *
 * Edits go through the settings store so they persist and stay one source of
 * truth with everything importing from data/catalog.
 */
const bookings = useBookingsStore()
const customers = useCustomersStore()
const settings = useSettingsStore()
const auth = useAuthStore()

const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const TABS = [
  { value: 'services', label: 'الخدمات' },
  { value: 'hours', label: 'ساعات العمل' },
  { value: 'resources', label: 'الموارد' },
  { value: 'account', label: 'الحساب' },
]
const tab = ref('services')

onMounted(() => settings.load())

/* -------------------------------------------------------------- services */

const editing = ref<ServiceRow | null>(null)
const isNew = ref(false)

function editService(id: string) {
  const s = services.find((x) => x.id === id)
  if (!s) return
  isNew.value = false
  editing.value = {
    id: s.id,
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    bufferMin: s.bufferMin,
    priceMinor: s.priceMinor,
    resourceIds: [...s.resourceIds],
    iconKey: settings.iconKeyOf(s.id),
    isActive: s.isActive,
  }
}

function addService() {
  isNew.value = true
  editing.value = settings.newService()
}

// BaseInput speaks strings; these adapt the numeric fields, and clamp on the
// way in so a blank or negative entry cannot reach the model.
function numberField(key: 'durationMin' | 'bufferMin', min: number) {
  return computed({
    get: () => String(editing.value?.[key] ?? ''),
    set: (v: string) => {
      if (editing.value) editing.value[key] = Math.max(min, Math.round(Number(v)) || min)
    },
  })
}

const durationInput = numberField('durationMin', 5)
const bufferInput = numberField('bufferMin', 0)

/** Price is entered in riyals; the model stores halalas everywhere. */
const priceMajor = computed({
  get: () => String((editing.value?.priceMinor ?? 0) / 100),
  set: (v: string) => {
    if (editing.value) editing.value.priceMinor = Math.max(0, Math.round(Number(v) * 100) || 0)
  },
})

const canSaveService = computed(
  () =>
    !!editing.value &&
    editing.value.name.trim().length > 1 &&
    editing.value.durationMin > 0 &&
    editing.value.resourceIds.length > 0,
)

function commitService() {
  if (!editing.value || !canSaveService.value) return
  settings.saveService({ ...editing.value, name: editing.value.name.trim() })
  toast.success(isNew.value ? 'أُضيفت الخدمة' : 'حُفظت الخدمة')
  editing.value = null
}

function toggleResourceOn(row: ServiceRow, resourceId: string) {
  const i = row.resourceIds.indexOf(resourceId)
  if (i === -1) row.resourceIds.push(resourceId)
  else row.resourceIds.splice(i, 1)
}

/* ----------------------------------------------------------------- hours */

const draftHours = ref<BusinessHours[]>([])
const hoursDirty = computed(
  () => JSON.stringify(draftHours.value) !== JSON.stringify(businessHours),
)

function startHours() {
  draftHours.value = businessHours.map((h) => ({ ...h }))
}
startHours()

function commitHours() {
  // A day that opens after it closes would make generateSlots return nothing,
  // silently — better to refuse it here than to debug an empty grid later.
  const bad = draftHours.value.find((h) => !h.isClosed && h.close <= h.open)
  if (bad) {
    toast.error(`${WEEKDAYS[bad.weekday]}: وقت الإغلاق يجب أن يكون بعد وقت الفتح`)
    return
  }
  settings.saveHours(draftHours.value.map((h) => ({ ...h })))
  toast.success('حُفظت ساعات العمل')
}

/* ------------------------------------------------------------- resources */

const editingResource = ref<Resource | null>(null)

function commitResource() {
  if (!editingResource.value || editingResource.value.name.trim().length < 1) return
  settings.saveResource({ ...editingResource.value, name: editingResource.value.name.trim() })
  toast.success('حُفظ المورد')
  editingResource.value = null
}

/* ----------------------------------------------------------------- reset */

async function resetData() {
  await repository.reset()
  await settings.load(true)
  await bookings.load(true)
  await customers.load(true)
  startHours()
  toast.success('أُعيدت البيانات التجريبية إلى حالتها الأولى')
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5 p-4 lg:p-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="type-h3 text-fg">الإعدادات</h1>
      <BaseTabs v-model="tab" :items="TABS" label="أقسام الإعدادات" size="sm" />
    </header>

    <ErrorState v-if="settings.error" :message="settings.error" @retry="settings.load(true)" />

    <!-- ------------------------------------------------------- services -->
    <section v-else-if="tab === 'services'" class="surface overflow-hidden">
      <header class="border-border flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 class="text-fg text-sm font-bold">الخدمات</h2>
          <p class="text-fg-subtle mt-0.5 text-xs">المدة والفاصل يحددان الأوقات المتاحة للحجز.</p>
        </div>
        <BaseButton size="sm" :icon="Plus" @click="addService">إضافة</BaseButton>
      </header>

      <ul class="divide-border divide-y">
        <li v-for="s in services" :key="s.id" class="flex items-center gap-3 px-4 py-3">
          <component :is="s.icon" class="text-fg-subtle h-5 w-5 shrink-0" aria-hidden="true" />
          <button
            type="button"
            class="min-w-0 flex-1 text-start"
            @click="editService(s.id)"
          >
            <p class="text-fg truncate text-sm font-semibold" :class="!s.isActive && 'opacity-50'">
              {{ s.name }}
            </p>
            <p class="text-fg-subtle text-xs">
              {{ duration(s.durationMin) }} · فاصل {{ duration(s.bufferMin) }}
              <span v-if="!s.isActive"> · معطّلة</span>
            </p>
          </button>
          <span class="text-fg shrink-0 text-sm font-bold" data-numeric>
            {{ money(s.priceMinor) }}
          </span>
          <BaseButton size="sm" variant="ghost" @click="settings.toggleService(s.id)">
            {{ s.isActive ? 'تعطيل' : 'تفعيل' }}
          </BaseButton>
        </li>
      </ul>
    </section>

    <!-- ---------------------------------------------------------- hours -->
    <section v-else-if="tab === 'hours'" class="surface overflow-hidden">
      <header class="border-border border-b px-4 py-3">
        <h2 class="text-fg text-sm font-bold">ساعات العمل</h2>
        <p class="text-fg-subtle mt-0.5 text-xs">
          الأوقات المعروضة للعملاء تُحسب من هنا مباشرةً.
        </p>
      </header>

      <ul class="divide-border divide-y">
        <li
          v-for="h in draftHours"
          :key="h.weekday"
          class="flex flex-wrap items-center gap-3 px-4 py-2.5"
        >
          <span class="text-fg w-20 shrink-0 text-sm">{{ WEEKDAYS[h.weekday] }}</span>

          <label class="text-fg-muted flex items-center gap-2 text-xs">
            <input v-model="h.isClosed" type="checkbox" class="accent-primary-600 h-4 w-4" />
            مغلق
          </label>

          <template v-if="!h.isClosed">
            <input
              v-model="h.open"
              type="time"
              :aria-label="`فتح ${WEEKDAYS[h.weekday]}`"
              class="border-border bg-surface text-fg focus:border-primary-400 h-9 rounded-[var(--radius-md)] border px-2 text-sm focus:outline-none"
              dir="ltr"
            />
            <span class="text-fg-subtle">–</span>
            <input
              v-model="h.close"
              type="time"
              :aria-label="`إغلاق ${WEEKDAYS[h.weekday]}`"
              class="border-border bg-surface text-fg focus:border-primary-400 h-9 rounded-[var(--radius-md)] border px-2 text-sm focus:outline-none"
              dir="ltr"
            />
          </template>
        </li>
      </ul>

      <footer class="border-border flex items-center justify-end gap-2 border-t px-4 py-3">
        <BaseButton variant="ghost" :disabled="!hoursDirty" @click="startHours">تراجع</BaseButton>
        <BaseButton variant="primary" :disabled="!hoursDirty" @click="commitHours">
          حفظ ساعات العمل
        </BaseButton>
      </footer>
    </section>

    <!-- ------------------------------------------------------ resources -->
    <section v-else-if="tab === 'resources'" class="surface overflow-hidden">
      <header class="border-border flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 class="text-fg text-sm font-bold">الموارد</h2>
          <p class="text-fg-subtle mt-0.5 text-xs">
            المورد هو ما لا يمكن حجزه مرتين في نفس الوقت: غرفة، كرسي، أو موظف.
          </p>
        </div>
        <BaseButton size="sm" :icon="Plus" @click="editingResource = settings.newResource()">
          إضافة
        </BaseButton>
      </header>
      <ul class="divide-border divide-y">
        <li v-for="r in resources" :key="r.id" class="flex items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            class="text-fg min-w-0 flex-1 text-start text-sm"
            :class="!r.isActive && 'opacity-50'"
            @click="editingResource = { ...r }"
          >
            {{ r.name }}<span v-if="!r.isActive" class="text-fg-subtle"> · معطّل</span>
          </button>
          <BaseButton size="sm" variant="ghost" @click="settings.toggleResource(r.id)">
            {{ r.isActive ? 'تعطيل' : 'تفعيل' }}
          </BaseButton>
        </li>
      </ul>
    </section>

    <!-- -------------------------------------------------------- account -->
    <section v-else class="surface p-4">
      <h2 class="text-fg text-sm font-bold">الحساب</h2>
      <p class="text-fg-muted mt-1 text-sm">{{ auth.user?.email ?? 'غير مسجّل' }}</p>
      <div class="border-border mt-4 border-t pt-4">
        <p class="text-fg-subtle mb-2 text-xs">
          البيانات محفوظة محلياً في هذا المتصفح. إعادة التعيين تعيد بيانات العرض التجريبية
          <strong>وإعدادات الخدمات وساعات العمل</strong> إلى حالتها الأولى.
        </p>
        <BaseButton :icon="RotateCcw" @click="resetData">إعادة تعيين البيانات</BaseButton>
      </div>
    </section>

    <!-- --------------------------------------------------- service modal -->
    <BaseModal
      :open="editing !== null"
      :title="isNew ? 'خدمة جديدة' : 'تعديل الخدمة'"
      size="md"
      :close-on-backdrop="false"
      @close="editing = null"
    >
      <div v-if="editing" class="space-y-4">
        <BaseInput v-model="editing.name" label="اسم الخدمة" required />
        <BaseInput v-model="editing.description" label="الوصف" type="textarea" :rows="2" />

        <div class="grid gap-4 sm:grid-cols-3">
          <BaseInput v-model="durationInput" label="المدة (دقيقة)" type="number" required />
          <BaseInput
            v-model="bufferInput"
            label="الفاصل (دقيقة)"
            type="number"
            hint="وقت التجهيز بعد الموعد"
          />
          <BaseInput v-model="priceMajor" label="السعر (ر.س)" type="number" />
        </div>

        <BaseSelect
          v-model="editing.iconKey"
          label="الأيقونة"
          :options="SERVICE_ICON_KEYS.map((k) => ({ value: k, label: SERVICE_ICON_LABELS[k] }))"
        />
        <p class="text-fg-subtle -mt-2 flex items-center gap-2 text-xs">
          <component :is="iconFor(editing.iconKey)" class="text-primary-600 h-4 w-4" />
          معاينة
        </p>

        <fieldset>
          <legend class="text-fg-muted mb-1.5 text-[13px] font-semibold">
            الموارد التي تقدّم هذه الخدمة
            <span class="text-danger-700" aria-hidden="true">*</span>
          </legend>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="r in resources"
              :key="r.id"
              class="border-border hover:border-primary-300 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
              :class="editing.resourceIds.includes(r.id) && 'border-primary-400 bg-primary-50'"
            >
              <input
                type="checkbox"
                class="accent-primary-600 h-4 w-4"
                :checked="editing.resourceIds.includes(r.id)"
                @change="toggleResourceOn(editing, r.id)"
              />
              {{ r.name }}
            </label>
          </div>
          <p v-if="editing.resourceIds.length === 0" class="text-danger-700 mt-1.5 text-xs">
            اختر مورداً واحداً على الأقل، وإلا لن تظهر أي أوقات متاحة لهذه الخدمة.
          </p>
        </fieldset>
      </div>

      <template #footer>
        <BaseButton variant="ghost" @click="editing = null">إلغاء</BaseButton>
        <BaseButton variant="primary" :disabled="!canSaveService" @click="commitService">
          حفظ
        </BaseButton>
      </template>
    </BaseModal>

    <!-- -------------------------------------------------- resource modal -->
    <BaseModal
      :open="editingResource !== null"
      title="المورد"
      :close-on-backdrop="false"
      @close="editingResource = null"
    >
      <BaseInput v-if="editingResource" v-model="editingResource.name" label="الاسم" required />
      <template #footer>
        <BaseButton variant="ghost" @click="editingResource = null">إلغاء</BaseButton>
        <BaseButton
          variant="primary"
          :disabled="!editingResource?.name.trim()"
          @click="commitResource"
        >
          حفظ
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
