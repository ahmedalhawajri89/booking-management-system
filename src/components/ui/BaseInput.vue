<script setup lang="ts">
import { computed, useId } from 'vue'
import type { LucideIcon } from '@/types'

/** Owns its label, hint and error, and wires the ARIA relationships itself. */
const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    type?: 'text' | 'tel' | 'email' | 'password' | 'number' | 'textarea'
    placeholder?: string
    hint?: string
    error?: string
    icon?: LucideIcon
    required?: boolean
    disabled?: boolean
    /** Latin-content fields (phone, email, reference) need an LTR island. */
    ltr?: boolean
    rows?: number
  }>(),
  { type: 'text', required: false, disabled: false, ltr: false, rows: 4 },
)

defineEmits<{ 'update:modelValue': [value: string] }>()

const id = useId()
const hintId = computed(() => (props.hint ? `${id}-hint` : undefined))
const errorId = computed(() => (props.error ? `${id}-error` : undefined))
const describedBy = computed(
  () => [errorId.value, hintId.value].filter(Boolean).join(' ') || undefined,
)
</script>

<template>
  <div>
    <label :for="id" class="mb-1.5 block text-[13px] font-semibold text-gray-700">
      {{ label }}
      <span v-if="required" class="text-danger-700" aria-hidden="true">*</span>
    </label>

    <div class="relative">
      <component
        :is="icon"
        v-if="icon && type !== 'textarea'"
        class="inset-inline-start-0 pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        style="inset-inline-start: 12px"
      />

      <textarea
        v-if="type === 'textarea'"
        :id="id"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :rows="rows"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy"
        class="focus:border-primary-400 w-full resize-none rounded-[var(--radius-md)] border bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
        :class="error ? 'border-danger-700/50' : 'border-gray-200'"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />

      <input
        v-else
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :dir="ltr ? 'ltr' : undefined"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy"
        class="focus:border-primary-400 h-10 w-full rounded-[var(--radius-md)] border bg-white px-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
        :class="[
          error ? 'border-danger-700/50' : 'border-gray-200',
          icon && 'ps-9',
          ltr && 'text-start',
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <p v-if="error" :id="errorId" class="text-danger-700 mt-1.5 text-xs font-medium">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="hintId" class="mt-1.5 text-xs text-gray-500">{{ hint }}</p>
  </div>
</template>
