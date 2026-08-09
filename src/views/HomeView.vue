<script setup lang="ts">
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
 */
</script>

<template>
  <div class="min-h-screen bg-gray-50">
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
