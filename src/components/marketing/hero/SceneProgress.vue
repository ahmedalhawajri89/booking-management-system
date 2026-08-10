<script setup lang="ts">
/**
 * Scene indicator and manual control.
 *
 * There is no autoplay, and that is the whole point. Carousels advance on a
 * timer the viewer did not ask for, which is why most people never see slide
 * two. Here the viewer's own scroll is the transport — these dots report
 * where they are and let them jump, they never move on their own.
 */
defineProps<{ titles: string[]; index: number; progress: number }>()
defineEmits<{ select: [i: number] }>()
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div role="tablist" aria-label="مشاهد العرض" class="flex items-center gap-2">
      <button
        v-for="(title, i) in titles"
        :key="title"
        type="button"
        role="tab"
        :aria-selected="i === index"
        :aria-label="title"
        :tabindex="i === index ? 0 : -1"
        class="group flex h-8 items-center px-1"
        @click="$emit('select', i)"
        @keydown.up.prevent="$emit('select', Math.max(0, index - 1))"
        @keydown.down.prevent="$emit('select', Math.min(titles.length - 1, index + 1))"
        @keydown.home.prevent="$emit('select', 0)"
        @keydown.end.prevent="$emit('select', titles.length - 1)"
      >
        <span
          class="block h-1.5 rounded-full transition-all duration-300"
          :class="
            i === index
              ? 'bg-primary-600 w-8'
              : 'bg-border group-hover:bg-border-strong w-1.5'
          "
        />
      </button>
    </div>

    <!-- Continuous read-out of the whole stage, so the dots are not the only
         sense of how much is left. -->
    <div class="bg-border h-px w-40 overflow-hidden rounded-full" aria-hidden="true">
      <div
        class="bg-primary-600/60 h-full origin-[right] transition-transform duration-150 ease-linear"
        :style="{ transform: `scaleX(${progress})` }"
      />
    </div>
  </div>
</template>
