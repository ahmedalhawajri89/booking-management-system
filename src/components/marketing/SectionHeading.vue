<script setup lang="ts">
/**
 * Section header.
 *
 * `align` exists because the previous build centred seven consecutive
 * sections and never once passed anything else, which is most of why the page
 * read as one block repeated down the scroll. Alignment is now part of how
 * each section is told apart.
 *
 * `sticky` is for the split layouts, where the header holds its position on
 * one side while its content scrolls past on the other.
 */
withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    lede?: string
    align?: 'center' | 'start' | 'end'
    sticky?: boolean
    /** For the sections that sit on a dark ground. */
    tone?: 'default' | 'inverse'
  }>(),
  { align: 'center', sticky: false, tone: 'default' },
)

const ALIGN = {
  center: 'mx-auto max-w-2xl text-center',
  start: 'max-w-2xl',
  end: 'max-w-2xl ms-auto text-end',
} as const
</script>

<template>
  <header
    :class="[
      ALIGN[align],
      sticky ? 'lg:sticky lg:top-28 lg:self-start' : 'mb-12 md:mb-16',
    ]"
  >
    <p
      v-if="eyebrow"
      v-reveal
      class="mb-3 text-[13px] font-bold tracking-wide"
      :class="tone === 'inverse' ? 'text-accent-300' : 'text-primary-600'"
    >
      {{ eyebrow }}
    </p>
    <h2 v-reveal="60" class="type-h1" :class="tone === 'inverse' ? 'text-white' : 'text-fg'">
      <slot name="title">{{ title }}</slot>
    </h2>
    <p
      v-if="lede"
      v-reveal="120"
      class="type-lede mt-4"
      :class="tone === 'inverse' && '!text-white/65'"
    >
      {{ lede }}
    </p>
    <div v-if="$slots.default" class="mt-6">
      <slot />
    </div>
  </header>
</template>
