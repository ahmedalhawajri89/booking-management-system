<script setup lang="ts">
import { Calendar } from 'lucide-vue-next'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-brand-soft border-primary-100 relative overflow-hidden border-t">
    <!-- top hairline in the brand gradient -->
    <div class="bg-brand absolute inset-x-0 top-0 h-1" />

    <div class="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="border-primary-100 mb-12 grid gap-12 border-b pb-12 md:grid-cols-4">
        <div class="col-span-1 md:col-span-2">
          <div class="mb-6 flex items-center gap-2">
            <div class="bg-brand shadow-primary-500/25 rounded-xl p-2 shadow-lg">
              <Calendar class="h-6 w-6 text-white" />
            </div>
            <span class="text-2xl font-bold tracking-tight text-gray-900">
              حجوزات<span class="text-gradient">برو</span>
            </span>
          </div>
          <p class="max-w-sm leading-relaxed text-gray-600">
            نظام حجز سحابي رائد يساعد الشركات والمتاجر والعيادات على تنظيم مواعيدهم وزيادة كفاءتهم
            التشغيلية.
          </p>
        </div>
        <div>
          <h4 class="mb-6 text-lg font-bold text-gray-900">روابط سريعة</h4>
          <ul class="space-y-4 text-gray-600">
            <li><a href="#" class="hover:text-primary-600 transition-colors">الرئيسية</a></li>
            <li>
              <a href="#features" class="hover:text-primary-600 transition-colors">المميزات</a>
            </li>
            <li><a href="#" class="hover:text-primary-600 transition-colors">الأسعار</a></li>
            <li>
              <a href="#" class="hover:text-primary-600 transition-colors">الأسئلة الشائعة</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 class="mb-6 text-lg font-bold text-gray-900">تواصل معنا</h4>
          <ul class="space-y-4 text-gray-600">
            <li>
              <a href="#" class="hover:text-primary-600 transition-colors" dir="ltr">
                support@bookingpro.com
              </a>
            </li>
            <li>
              <a href="#" class="hover:text-primary-600 transition-colors" dir="ltr">
                +966 50 123 4567
              </a>
            </li>
            <li>المملكة العربية السعودية، الرياض</li>
          </ul>
        </div>
      </div>
      <div
        class="flex flex-col items-center justify-between gap-4 text-sm text-gray-500 md:flex-row"
      >
        <p>جميع الحقوق محفوظة &copy; {{ year }} حجوزات برو</p>
        <div class="flex gap-6">
          <a href="#" class="hover:text-primary-600 transition-colors">سياسة الخصوصية</a>
          <a href="#" class="hover:text-primary-600 transition-colors">شروط الاستخدام</a>
        </div>
      </div>
    </div>
  </footer>
</template>
