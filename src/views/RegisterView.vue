<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, Mail, User } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppLogo from '@/components/ui/AppLogo.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const touched = ref(false)
const submitting = ref(false)

const nameError = () => (touched.value && !name.value.trim() ? 'الاسم مطلوب' : undefined)
const emailError = () =>
  touched.value && !/^\S+@\S+\.\S+$/.test(email.value) ? 'بريد إلكتروني غير صالح' : undefined
const passwordError = () =>
  touched.value && password.value.length < 6 ? 'كلمة المرور ٦ أحرف على الأقل' : undefined

async function submit() {
  touched.value = true
  if (nameError() || emailError() || passwordError()) return
  submitting.value = true
  try {
    auth.signIn(email.value, name.value)
    toast.success('تم إنشاء حسابك')
    await router.push('/app')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div
    class="mesh-sunset relative flex min-h-screen items-center justify-center overflow-hidden p-4"
  >
    <div class="relative z-10 w-full max-w-sm">
      <div class="mb-6 flex justify-center">
        <AppLogo />
      </div>

      <div class="surface animate-pop-in p-6">
        <h1 class="text-lg font-bold text-gray-900">إنشاء حساب</h1>
        <p class="mt-1 mb-5 text-sm text-gray-600">ابدأ بإدارة حجوزات نشاطك خلال دقائق.</p>

        <form class="space-y-4" @submit.prevent="submit">
          <BaseInput v-model="name" label="الاسم" :icon="User" required :error="nameError()" />
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
            hint="٦ أحرف على الأقل"
          />
          <BaseButton type="submit" variant="primary" block :loading="submitting">
            إنشاء الحساب
          </BaseButton>
        </form>
      </div>

      <p class="mt-4 text-center text-sm text-gray-600">
        لديك حساب؟
        <RouterLink to="/login" class="text-primary-700 hover:text-primary-800 font-semibold">
          سجّل دخولك
        </RouterLink>
      </p>
    </div>
  </div>
</template>
