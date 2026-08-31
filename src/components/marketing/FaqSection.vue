<script setup>
import { Plus } from 'lucide-vue-next'
import SectionHeading from './SectionHeading.vue'

/**
 * Native <details>/<summary>, not a hand-rolled accordion.
 *
 * The browser already gives us the button semantics, the expanded state, and
 * — the part that actually matters — in-page find. Ctrl+F for a term inside a
 * collapsed answer opens it; a div with aria-expanded cannot do that, and an
 * FAQ is exactly the content people search rather than read.
 *
 * `name` makes them mutually exclusive without a line of JS. Where it is
 * unsupported the panels simply all open independently, which is a fine
 * fallback.
 */
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
</script>

<template>
  <section class="section bg-surface-sunken">
    <div class="section-inner grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
      <SectionHeading
        eyebrow="أسئلة شائعة"
        title="ما يسأل عنه الناس عادةً"
        lede="وإن لم تجد سؤالك، النسخة التجريبية مفتوحة بلا تسجيل."
        align="start"
        sticky
      />

      <div
        v-reveal
        class="border-border bg-surface divide-border divide-y rounded-[var(--radius-xl)] border"
      >
        <details v-for="item in FAQ" :key="item.q" name="faq" class="group">
          <summary
            class="hover:bg-surface-sunken flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors"
          >
            <span class="text-fg text-[15px] font-bold">{{ item.q }}</span>
            <Plus
              class="text-primary-600 h-4 w-4 shrink-0 transition-transform duration-300 group-open:rotate-45"
              aria-hidden="true"
            />
          </summary>
          <p class="text-fg-muted px-5 pb-4 text-[15px] leading-relaxed">{{ item.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Safari still paints its own disclosure triangle without this. */
summary::-webkit-details-marker {
  display: none;
}
</style>
