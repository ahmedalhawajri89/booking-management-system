<script setup lang="ts">
import type { LucideIcon } from '@/types'

/**
 * Three genuinely different situations, three different messages.
 * "No data" is never an acceptable empty state.
 */
withDefaults(
  defineProps<{
    variant?: 'first-run' | 'no-results' | 'error'
    icon: LucideIcon
    title: string
    description: string
  }>(),
  { variant: 'first-run' },
)

const TONE = {
  'first-run': 'bg-primary-50 text-primary-600',
  'no-results': 'bg-gray-100 text-gray-500',
  error: 'bg-danger-50 text-danger-700',
} as const
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div
      class="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)]"
      :class="TONE[variant]"
    >
      <component :is="icon" class="h-6 w-6" aria-hidden="true" />
    </div>
    <h3 class="mb-1.5 text-base font-bold text-gray-900">{{ title }}</h3>
    <p class="max-w-sm text-sm leading-relaxed text-gray-500">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>
