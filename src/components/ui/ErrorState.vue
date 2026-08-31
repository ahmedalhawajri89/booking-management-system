<script setup>
import { AlertTriangle, RotateCcw } from 'lucide-vue-next'
import BaseButton from './BaseButton.vue'

/**
 * Companion to EmptyState. Empty means "nothing here yet"; this means "we
 * could not find out" — and it always offers the retry, because a dead end
 * with no way forward is the worst version of a failure.
 */
defineProps({
  title: { type: String, required: false, default: 'تعذّر تحميل البيانات' },
  message: {
    type: String,
    required: false,
    default: 'حدث خطأ أثناء جلب البيانات. تحقّق من اتصالك ثم أعد المحاولة.',
  },
  retryLabel: { type: String, required: false, default: 'إعادة المحاولة' },
})

defineEmits(['retry'])
</script>

<template>
  <div role="alert" class="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div
      class="bg-danger-50 text-danger-700 mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)]"
    >
      <AlertTriangle class="h-6 w-6" aria-hidden="true" />
    </div>
    <h3 class="type-h3 text-fg mb-1.5">{{ title }}</h3>
    <p class="text-fg-subtle max-w-sm text-sm leading-relaxed">{{ message }}</p>
    <BaseButton variant="secondary" :icon="RotateCcw" class="mt-5" @click="$emit('retry')">
      {{ retryLabel }}
    </BaseButton>
  </div>
</template>
