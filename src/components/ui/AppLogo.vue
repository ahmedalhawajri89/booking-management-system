<script setup lang="ts">
import { Calendar } from 'lucide-vue-next'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
</script>

<template>
  <RouterLink to="/" class="flex items-center gap-2">
    <div
      class="bg-brand shadow-primary-500/25 rounded-xl text-white shadow-lg"
      :class="compact ? 'p-1.5' : 'p-2.5'"
    >
      <Calendar :class="compact ? 'h-5 w-5' : 'h-6 w-6'" />
    </div>
    <span class="font-bold tracking-tight text-gray-900" :class="compact ? 'text-xl' : 'text-2xl'">
      حجوزات<span class="text-gradient">برو</span>
    </span>
  </RouterLink>
</template>
