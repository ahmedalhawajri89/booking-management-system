<script setup>
import BaseButton from './BaseButton.vue'
import BaseModal from './BaseModal.vue'

/** Confirmation always names the object being acted on — never "Are you sure?". */
defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  confirmLabel: { type: String, required: false, default: 'تأكيد' },
  cancelLabel: { type: String, required: false, default: 'تراجع' },
  tone: { type: String, required: false, default: 'danger' },
})

const emit = defineEmits(['confirm', 'cancel'])

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
