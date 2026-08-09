<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'

/** Confirmation always names the object being acted on — never "Are you sure?". */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    tone?: 'danger' | 'primary'
  }>(),
  { confirmLabel: 'تأكيد', cancelLabel: 'تراجع', tone: 'danger' },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
const confirmBtn = ref<InstanceType<typeof BaseButton> | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    ;(confirmBtn.value?.$el as HTMLElement | undefined)?.focus()
  },
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/35 p-4"
        @click.self="emit('cancel')"
        @keydown="onKeydown"
      >
        <div
          role="alertdialog"
          aria-modal="true"
          :aria-label="title"
          class="elev-modal animate-pop-in w-full max-w-sm rounded-[var(--radius-xl)] bg-white p-5"
        >
          <h2 class="text-base font-bold text-gray-900">{{ title }}</h2>
          <p class="mt-2 text-sm leading-relaxed text-gray-600">{{ message }}</p>
          <div class="mt-5 flex justify-end gap-2">
            <BaseButton variant="ghost" @click="emit('cancel')">{{ cancelLabel }}</BaseButton>
            <BaseButton
              ref="confirmBtn"
              :variant="tone === 'danger' ? 'danger' : 'primary'"
              @click="emit('confirm')"
            >
              {{ confirmLabel }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
