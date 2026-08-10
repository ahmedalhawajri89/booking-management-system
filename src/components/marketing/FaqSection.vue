<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import SectionHeading from './SectionHeading.vue'

/** Accessible accordion: real buttons, `aria-expanded`, `aria-controls`,
 *  and a height transition driven by grid-template-rows so it animates
 *  smoothly without hardcoding a max-height. */
const open = ref<number | null>(0)

const FAQ = [
  {
    q: 'هل أحتاج خبرة تقنية لتشغيله؟',
    a: 'لا. تحدّد ساعات العمل وخدماتك ومدة كل خدمة مرة واحدة، ويتكفّل النظام بحساب الأوقات المتاحة بعدها. لا إعداد يتجاوز بضع دقائق.',
  },
  {
    q: 'كيف يمنع النظام الحجز المزدوج فعلاً؟',
    a: 'لكل خدمة مدة وفاصل زمني بعدها، ولكل مورد (غرفة أو موظف) جدوله. عند عرض الأوقات يطرح النظام كل موعد يتقاطع مع حجز قائم على نفس المورد، فلا يظهر أصلاً كخيار متاح.',
  },
  {
    q: 'ماذا يحدث إذا ألغى العميل؟',
    a: 'يفتح رابط حجزه برقمه المرجعي ويؤكد رقم جواله، ثم يلغي بنفسه. يُحرَّر الوقت فوراً ويصبح متاحاً لغيره، ويُسجَّل الإلغاء في سجل الحجز.',
  },
  {
    q: 'هل يدعم أكثر من موظف أو غرفة؟',
    a: 'نعم. كل مورد له جدول مستقل، والخدمة تحدد أي الموارد يمكنها تقديمها. التعارض يُحسب لكل مورد على حدة.',
  },
  {
    q: 'أين تُحفظ البيانات في النسخة التجريبية؟',
    a: 'في متصفحك فقط، ولا تُرسل إلى أي خادم. النظام مبني خلف واجهة تخزين مجرّدة، فربطه بخادم حقيقي لاحقاً لا يتطلب تعديل أي واجهة.',
  },
  {
    q: 'هل الواجهة عربية بالكامل؟',
    a: 'نعم، صُمّمت من الأساس بالعربية واتجاه RTL — التواريخ والأرقام والعملة تُنسَّق عربياً، وحقول الجوال والبريد تحتفظ باتجاهها اللاتيني الصحيح.',
  },
]

function toggle(i: number) {
  open.value = open.value === i ? null : i
}
</script>

<template>
  <section class="section surface-soft grain">
    <div class="section-inner max-w-3xl!">
      <SectionHeading eyebrow="أسئلة شائعة" title="ما يسأل عنه الناس عادةً" />

      <div
        v-reveal
        class="divide-primary-100 border-primary-100 divide-y overflow-hidden rounded-[var(--radius-xl)] border bg-surface"
      >
        <div v-for="(item, i) in FAQ" :key="item.q">
          <h3>
            <button
              :id="`faq-btn-${i}`"
              type="button"
              class="hover:bg-primary-50/50 flex w-full items-center justify-between gap-4 px-5 py-4 text-start transition-colors"
              :aria-expanded="open === i"
              :aria-controls="`faq-panel-${i}`"
              @click="toggle(i)"
            >
              <span class="text-[15px] font-bold text-gray-900">{{ item.q }}</span>
              <Plus
                class="text-primary-600 h-4 w-4 shrink-0 transition-transform duration-300"
                :class="open === i && 'rotate-45'"
                aria-hidden="true"
              />
            </button>
          </h3>
          <div
            :id="`faq-panel-${i}`"
            role="region"
            :aria-labelledby="`faq-btn-${i}`"
            class="grid transition-[grid-template-rows] duration-300 ease-out"
            :style="{ gridTemplateRows: open === i ? '1fr' : '0fr' }"
          >
            <div class="overflow-hidden">
              <p class="px-5 pb-4 text-[15px] leading-relaxed text-gray-600">{{ item.a }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
