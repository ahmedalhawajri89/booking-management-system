<script setup>
import { computed } from 'vue'

/**
 * Determinate bar. Extracted from the occupancy meter in TodayView so the
 * analytics screen can reuse the same shape, ARIA and colour thresholds.
 */
const props = defineProps({
  value: { type: Number, required: true },
  label: { type: String, required: true },
  size: { type: String, required: false, default: 'md' },
  tone: { type: String, required: false, default: 'primary' },
})

const pct = computed(() => Math.max(0, Math.min(100, Math.round(props.value))))

const FILL = {
  primary: 'bg-primary-600',
  success: 'bg-success-700',
  warning: 'bg-warning-700',
  danger: 'bg-danger-700',
}

const resolved = computed(() => {
  if (props.tone !== 'auto') return FILL[props.tone]
  if (pct.value >= 90) return FILL.danger
  if (pct.value >= 70) return FILL.warning
  return FILL.primary
})

const SIZE = { sm: 'h-1.5', md: 'h-2' }
</script>

<template>
  <div
    role="progressbar"
    :aria-valuenow="pct"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
    class="bg-surface-sunken w-full overflow-hidden rounded-full"
    :class="SIZE[size]"
  >
    <div
      class="h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-soft)]"
      :class="resolved"
      :style="{ width: `${pct}%` }"
    />
  </div>
</template>
