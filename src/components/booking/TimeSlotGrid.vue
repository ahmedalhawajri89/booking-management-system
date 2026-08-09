<script setup lang="ts">
import { CalendarX2 } from 'lucide-vue-next'
import type { Slot } from '@/types'
import EmptyState from '@/components/ui/EmptyState.vue'

/**
 * Taken slots stay visible but disabled — absence is information. Hiding them
 * would make a fully-booked day look identical to a closed one.
 */
defineProps<{ slots: Slot[]; modelValue: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div v-if="slots.length === 0">
    <EmptyState
      variant="no-results"
      :icon="CalendarX2"
      title="لا توجد أوقات متاحة"
      description="هذا اليوم خارج ساعات العمل أو محجوز بالكامل. جرّب يوماً آخر."
    />
  </div>

  <div
    v-else
    role="radiogroup"
    aria-label="اختر الوقت"
    class="grid grid-cols-3 gap-2 sm:grid-cols-4"
  >
    <button
      v-for="slot in slots"
      :key="slot.startAt"
      type="button"
      role="radio"
      :aria-checked="modelValue === slot.startAt"
      :disabled="slot.state !== 'available'"
      :aria-label="
        slot.state === 'taken'
          ? `${slot.label} — محجوز`
          : slot.state === 'past'
            ? `${slot.label} — مضى`
            : slot.label
      "
      class="h-10 rounded-[var(--radius-md)] border text-sm font-semibold transition-colors"
      :class="[
        modelValue === slot.startAt
          ? 'border-primary-600 bg-primary-600 text-white'
          : slot.state === 'available'
            ? 'hover:border-primary-300 hover:bg-primary-50 border-gray-200 bg-white text-gray-700'
            : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through',
      ]"
      @click="emit('update:modelValue', slot.startAt)"
    >
      {{ slot.label }}
    </button>
  </div>
</template>
