<script setup lang="ts">
import { ref, toRef } from 'vue'
import { X } from 'lucide-vue-next'
import IconButton from './IconButton.vue'
import { useFocusTrap } from '@/composables/useFocusTrap'

/**
 * Side sheet used for every detail and create surface, so the operator never
 * loses their place. Becomes a full-screen sheet below `sm`.
 */
const props = withDefaults(
  defineProps<{ open: boolean; title: string; subtitle?: string; width?: 'md' | 'lg' }>(),
  { width: 'md' },
)

const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
useFocusTrap(toRef(props, 'open'), panel, () => emit('close'))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-gray-900/25 backdrop-blur-[2px]"
        @click="emit('close')"
      />
    </Transition>

    <Transition name="drawer">
      <aside
        v-if="open"
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="elev-modal inset-inline-end-0 fixed inset-y-0 z-50 flex w-full flex-col bg-surface sm:w-[480px]"
        :class="width === 'lg' && 'sm:w-[560px]'"
        style="inset-inline-end: 0"
      >
        <header class="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div class="min-w-0">
            <h2 class="truncate text-base font-bold text-gray-900">{{ title }}</h2>
            <p v-if="subtitle" class="mt-0.5 truncate text-sm text-gray-500">{{ subtitle }}</p>
          </div>
          <IconButton :icon="X" label="إغلاق" @click="emit('close')" />
        </header>

        <div class="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <slot />
        </div>

        <footer
          v-if="$slots.footer"
          class="sticky bottom-0 border-t border-gray-200 bg-surface px-5 py-3"
        >
          <slot name="footer" />
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>
