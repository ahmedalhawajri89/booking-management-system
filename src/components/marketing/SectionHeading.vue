<script setup lang="ts">
withDefaults(
  defineProps<{ eyebrow?: string; title: string; lede?: string; align?: 'center' | 'start' }>(),
  { align: 'center' },
)
</script>

<template>
  <header
    class="mb-12 md:mb-16"
    :class="align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'"
  >
    <p v-if="eyebrow" v-reveal class="text-primary-600 mb-3 text-[13px] font-bold tracking-wide">
      {{ eyebrow }}
    </p>
    <h2 v-reveal="60" class="type-h1 text-gray-900">
      <slot name="title">{{ title }}</slot>
    </h2>
    <p v-if="lede" v-reveal="120" class="type-lede mt-4">{{ lede }}</p>
  </header>
</template>
