<script setup lang="ts">
/**
 * One card recipe. Six marketing sections had each written their own
 * `rounded-xl border border-gray-200 bg-white p-6 hover:border-primary-200`,
 * which is why the page read as the same block repeated down the scroll.
 *
 * Variety now comes from layout — bento spans, timelines, comparison tables —
 * not from re-typing the box.
 */
withDefaults(
  defineProps<{
    variant?: 'flat' | 'raised' | 'outline' | 'ghost'
    padding?: 'none' | 'sm' | 'md' | 'lg'
    radius?: 'lg' | 'xl'
    /** Adds hover/active affordance. Only for cards that actually do something. */
    interactive?: boolean
    as?: 'div' | 'article' | 'li' | 'section'
  }>(),
  { variant: 'flat', padding: 'md', radius: 'lg', interactive: false, as: 'div' },
)

const VARIANT = {
  flat: 'bg-surface border-border border',
  raised: 'bg-surface border-border elev-raised border',
  outline: 'border-border border bg-transparent',
  ghost: 'bg-surface-sunken border border-transparent',
} as const

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5 md:p-6',
  lg: 'p-6 md:p-8',
} as const

const RADIUS = {
  lg: 'rounded-[var(--radius-lg)]',
  xl: 'rounded-[var(--radius-xl)]',
} as const
</script>

<template>
  <component
    :is="as"
    class="transition-colors duration-200"
    :class="[
      VARIANT[variant],
      PADDING[padding],
      RADIUS[radius],
      interactive && 'hover:border-primary-300 hover:elev-overlay cursor-pointer',
    ]"
  >
    <slot />
  </component>
</template>
