<script setup lang="ts">
import { ArrowLeft, Sparkles } from 'lucide-vue-next'
</script>

<template>
  <section class="section">
    <div class="section-inner">
      <div
        v-reveal.scale
        class="bg-sunset grain relative overflow-hidden rounded-[var(--radius-xl)] px-6 py-14 text-center sm:px-10 md:py-20"
      >
        <div
          class="pointer-events-none absolute inset-0 opacity-25"
          style="
            background-image: radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px);
            background-size: 26px 26px;
            mask-image: radial-gradient(ellipse 60% 70% at 50% 50%, #000 30%, transparent 100%);
          "
          aria-hidden="true"
        />

        <div class="relative">
          <span
            class="mb-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 text-[13px] font-bold text-white backdrop-blur"
          >
            <Sparkles class="h-3.5 w-3.5" aria-hidden="true" />
            جاهز خلال دقائق
          </span>

          <h2 class="display-lg mx-auto mb-4 max-w-2xl text-white">دع جدولك يدير نفسه</h2>
          <p class="mx-auto mb-8 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
            جرّب النظام كاملاً ببيانات جاهزة — أنشئ حجزاً، أكّده، وشاهد كيف يمنع التعارض قبل حدوثه.
          </p>

          <div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <RouterLink
              to="/book"
              class="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-bold text-gray-900 transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
            >
              ابدأ بحجز تجريبي
              <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </RouterLink>
            <RouterLink
              to="/login"
              class="inline-flex w-full items-center justify-center rounded-full border border-white/40 px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              ادخل لوحة التحكم
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
