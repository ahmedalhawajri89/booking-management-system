<script setup>
import {
  BellRing,
  ClipboardList,
  GitBranch,
  Repeat2,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-vue-next'
import SectionHeading from './SectionHeading.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

const LEAD = [
  {
    icon: GitBranch,
    title: 'محرك توافر حقيقي',
    body: 'ساعات العمل + مدة الخدمة + الفاصل بين المواعيد + الحجوزات القائمة = الأوقات المتاحة فعلاً. الأوقات المحجوزة تظهر معطّلة لا مخفية، لأن غيابها معلومة بحد ذاته.',
  },
  {
    icon: ClipboardList,
    title: 'لوحة مبنية على العمل لا على الأرقام',
    body: 'تبدأ بما يحتاج تدخّلك: تعارض، حجز لم يُغلق، دفعة متأخرة. ثم يومك كخط زمني بخط «الآن» — الوقت الفارغ يُقرأ كمساحة فارغة.',
  },
]

const REST = [
  {
    icon: Users,
    title: 'ملف العميل',
    body: 'سجل كامل وإحصاءات مشتقة من الحجوزات — لا أرقام مخترعة.',
  },
  {
    icon: Wallet,
    title: 'حالة الدفع',
    body: 'غير مدفوع · عربون · مدفوع · مسترجع، منفصلة عن حالة الحجز.',
  },
  {
    icon: Repeat2,
    title: 'إعادة جدولة آمنة',
    body: 'تعرض الأوقات الحرة فقط، وتوثّق القديم والجديد في السجل.',
  },
  {
    icon: ShieldCheck,
    title: 'تراجع فوري',
    body: 'كل إجراء هدّام يأتي معه زر تراجع — لا نافذة تأكيد فقط.',
  },
  {
    icon: Smartphone,
    title: 'يعمل على الجوال',
    body: 'شريط تنقّل سفلي وأدراج بملء الشاشة، لا تصغير لسطح المكتب.',
  },
  {
    icon: BellRing,
    title: 'يحتاج إجراء',
    body: 'قاعدة واحدة تحسب ما يستحق انتباهك، وتظهر في كل شاشة.',
  },
]
</script>

<template>
  <section id="features" class="section bg-canvas">
    <div class="section-inner">
      <SectionHeading
        eyebrow="القدرات"
        title="بُني حول الحجز — لا حول لوحة تحكم عامة"
        lede="كل ما يلي موجود فعلاً في النظام ويمكنك تجربته الآن."
        align="start"
      />

      <div class="grid gap-4 md:grid-cols-6">
        <BaseCard
          v-for="(item, i) in LEAD"
          :key="item.title"
          v-reveal="i * 100"
          as="article"
          variant="raised"
          padding="lg"
          radius="xl"
          class="group relative overflow-hidden md:col-span-3"
        >
          <div
            class="mesh-brand pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            aria-hidden="true"
          />
          <div class="relative">
            <span
              class="bg-brand shadow-primary-500/25 mb-5 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] text-white shadow-md"
            >
              <component :is="item.icon" class="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 class="type-h3 text-fg mb-2">{{ item.title }}</h3>
            <p class="text-fg-muted text-[15px] leading-relaxed">{{ item.body }}</p>
          </div>
        </BaseCard>

        <BaseCard
          v-for="(item, i) in REST"
          :key="item.title"
          v-reveal="200 + i * 70"
          as="article"
          padding="sm"
          class="md:col-span-2"
        >
          <span
            class="bg-primary-50 text-primary-600 mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]"
          >
            <component :is="item.icon" class="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <h3 class="text-fg mb-1 text-[15px] font-bold">{{ item.title }}</h3>
          <p class="text-fg-muted text-[13px] leading-relaxed">{{ item.body }}</p>
        </BaseCard>
      </div>
    </div>
  </section>
</template>
