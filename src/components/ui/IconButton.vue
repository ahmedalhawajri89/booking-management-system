<script setup lang="ts">
import type { LucideIcon } from '@/types'

/** Icon-only control. `label` is mandatory — it becomes the accessible name. */
withDefaults(
  defineProps<{
    icon: LucideIcon
    label: string
    variant?: 'ghost' | 'secondary' | 'danger'
    size?: 'sm' | 'md'
  }>(),
  { variant: 'ghost', size: 'md' },
)

const VARIANT = {
  ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 border-transparent',
  secondary: 'bg-surface text-gray-600 hover:bg-gray-50 border-gray-200',
  danger: 'text-danger-700 hover:bg-danger-50 border-transparent',
} as const
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :title="label"
    class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-colors duration-150 active:scale-95 sm:h-10 sm:w-10"
    :class="VARIANT[variant]"
  >
    <component :is="icon" :class="size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'" />
  </button>
</template>
