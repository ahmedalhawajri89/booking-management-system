<script setup>
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import ScrollProgress from '@/components/marketing/ScrollProgress.vue'
import HeroSection from '@/components/marketing/HeroSection.vue'
import ProofBar from '@/components/marketing/ProofBar.vue'
import PainSection from '@/components/marketing/PainSection.vue'
import FeaturesSection from '@/components/marketing/FeaturesSection.vue'
import ShowcaseSection from '@/components/marketing/ShowcaseSection.vue'
import StepsSection from '@/components/marketing/StepsSection.vue'
import TestimonialsSection from '@/components/marketing/TestimonialsSection.vue'
import PricingSection from '@/components/marketing/PricingSection.vue'
import FaqSection from '@/components/marketing/FaqSection.vue'
import FinalCta from '@/components/marketing/FinalCta.vue'

/**
 * The landing page is a narrative, not a feature dump:
 * hook → proof → problem → capability → see it → how → who → price → doubts → act.
 * Each section is its own component so the story can be re-ordered without
 * touching markup.
 *
 * Two rules hold the sequence together, and both are enforced by reading the
 * sections in order rather than by any code:
 *   1. No two adjacent sections share a background.
 *      inverse → canvas → sunken → canvas → inverse → canvas → sunken →
 *      canvas → sunken → canvas
 *   2. No two adjacent sections share a layout. Split, bento, dark tour,
 *      timeline, editorial, matrix, disclosure — one shape each.
 * The previous build broke both, which is why it read as one card repeated
 * down the page.
 */
</script>

<template>
  <div class="bg-canvas min-h-screen">
    <ScrollProgress />
    <AppNavbar />

    <main>
      <HeroSection />
      <ProofBar />
      <PainSection />
      <FeaturesSection />
      <ShowcaseSection />
      <StepsSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </main>

    <AppFooter />
  </div>
</template>
