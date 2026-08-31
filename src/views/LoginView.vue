<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Lock, Mail } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppLogo from '@/components/ui/AppLogo.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useAuthStore } from '@/stores/auth'
import { isDemoBackend } from '@/data/repository'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('admin@booking.com')
const password = ref('demo1234')
const touched = ref(false)
const submitting = ref(false)

const emailError = () =>
  touched.value && !/^\S+@\S+\.\S+$/.test(email.value) ? 'بريد إلكتروني غير صالح' : undefined
const passwordError = () =>
  touched.value && password.value.length < 6 ? 'كلمة المرور ٦ أحرف على الأقل' : undefined

async function submit() {
  touched.value = true
  if (emailError() || passwordError()) return
  submitting.value = true
  try {
    await auth.signIn(email.value, password.value)
    toast.success('أهلاً بعودتك')
    const redirect = route.query.redirect || '/app'
    await router.push(redirect)
  } catch (e) {
    // Deliberately not "no account with that email": that would let anyone
    // enumerate which addresses are registered.
    toast.error(
      e instanceof Error && /Invalid login/i.test(e.message)
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        : 'تعذّر تسجيل الدخول. حاول مرة أخرى.',
    )
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div
    class="mesh-brand relative flex min-h-screen items-center justify-center overflow-hidden p-4"
  >
    <div class="relative z-10 w-full max-w-sm">
      <div class="mb-6 flex justify-center">
        <AppLogo />
      </div>

      <div class="surface animate-pop-in p-6">
        <h1 class="text-lg font-bold text-gray-900">تسجيل الدخول</h1>
        <p class="mt-1 mb-5 text-sm text-gray-600">ادخل إلى لوحة إدارة الحجوزات.</p>

        <form class="space-y-4" @submit.prevent="submit">
          <BaseInput
            v-model="email"
            label="البريد الإلكتروني"
            type="email"
            :icon="Mail"
            ltr
            required
            :error="emailError()"
          />
          <BaseInput
            v-model="password"
            label="كلمة المرور"
            type="password"
            :icon="Lock"
            ltr
            required
            :error="passwordError()"
          />
          <BaseButton type="submit" variant="primary" block :loading="submitting">
            دخول
          </BaseButton>
        </form>

        <!-- Only true on the demo backend, so it is only shown there. -->
        <p
          v-if="isDemoBackend"
          class="bg-surface-sunken text-fg-subtle mt-4 rounded-[var(--radius-md)] px-3 py-2 text-xs leading-relaxed"
        >
          نسخة تجريبية — البيانات محفوظة في متصفحك فقط، وأي بريد وكلمة مرور صالحان للدخول.
        </p>
      </div>

      <p class="mt-4 text-center text-sm text-gray-600">
        ليس لديك حساب؟
        <RouterLink to="/register" class="text-primary-700 hover:text-primary-800 font-semibold">
          أنشئ حساباً
        </RouterLink>
      </p>
    </div>
  </div>
</template>
