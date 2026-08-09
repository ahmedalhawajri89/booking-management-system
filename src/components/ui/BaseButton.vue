<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import type { LucideIcon } from '@/types'

/** The single primary-action component. Replaces every ad-hoc button. */
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    icon?: LucideIcon
    iconEnd?: LucideIcon
    loading?: boolean
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit'
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    loading: false,
    disabled: false,
    block: false,
    type: 'button',
  },
)

const VARIANT = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 border-transparent',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 border-gray-200',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 border-transparent',
  danger: 'bg-white text-danger-700 hover:bg-danger-50 active:bg-danger-100 border-danger-700/25',
} as const

const SIZE = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
} as const

const ICON_SIZE = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' } as const

const isInert = computed(() => props.disabled || props.loading)
</script>

<template>
  <button
    :type="type"
    :disabled="isInert"
    :aria-busy="loading || undefined"
    class="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border font-semibold transition-colors duration-150 select-none active:scale-[.98] disabled:pointer-events-none disabled:opacity-45"
    :class="[VARIANT[variant], SIZE[size], block && 'w-full']"
  >
    <Loader2 v-if="loading" :class="[ICON_SIZE[size], 'animate-spin']" />
    <component :is="icon" v-else-if="icon" :class="ICON_SIZE[size]" />
    <slot />
    <component :is="iconEnd" v-if="iconEnd && !loading" :class="ICON_SIZE[size]" />
  </button>
</template>
