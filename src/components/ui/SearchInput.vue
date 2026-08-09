<script setup lang="ts">
import { ref } from 'vue'
import { Search, X } from 'lucide-vue-next'

withDefaults(defineProps<{ modelValue: string; placeholder?: string; shortcut?: boolean }>(), {
  placeholder: 'ابحث…',
  shortcut: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const input = ref<HTMLInputElement | null>(null)

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="relative">
    <Search
      class="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      style="inset-inline-start: 12px"
      aria-hidden="true"
    />
    <input
      ref="input"
      type="search"
      :value="modelValue"
      :placeholder="placeholder"
      :aria-label="placeholder"
      class="focus:border-primary-400 h-10 w-full rounded-[var(--radius-md)] border border-gray-200 bg-white ps-9 pe-9 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:outline-none"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      v-if="modelValue"
      type="button"
      aria-label="مسح البحث"
      class="absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      style="inset-inline-end: 8px"
      @click="emit('update:modelValue', '')"
    >
      <X class="h-3.5 w-3.5" />
    </button>
    <kbd
      v-else-if="shortcut"
      class="pointer-events-none absolute top-1/2 hidden -translate-y-1/2 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-400 sm:block"
      style="inset-inline-end: 8px"
      aria-hidden="true"
    >
      /
    </kbd>
  </div>
</template>
