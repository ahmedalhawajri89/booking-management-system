<script setup lang="ts">
import BaseButton from './BaseButton.vue'
import BaseModal from './BaseModal.vue'

/** Confirmation always names the object being acted on — never "Are you sure?". */
withDefaults(
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

// Cancel is deliberately first in the DOM, so the focus trap lands there:
// a stray Enter on a destructive dialog should back out, not go through.
// Nothing is lost by making the operator move one key to confirm.
</script>

<template>
  <BaseModal
    :open="open"
    :title="title"
    :description="message"
    role="alertdialog"
    :dismissible="false"
    :close-on-backdrop="false"
    @close="emit('cancel')"
  >
    <template #footer>
      <BaseButton variant="ghost" @click="emit('cancel')">{{ cancelLabel }}</BaseButton>
      <BaseButton :variant="tone === 'danger' ? 'danger' : 'primary'" @click="emit('confirm')">
        {{ confirmLabel }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
