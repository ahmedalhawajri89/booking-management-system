import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Customer } from '@/types'
import { repository } from '@/data/repository'
import { uid } from '@/lib/id'

/** Digits only, so "٠٥٠ ١٢٣ ٤٥٦٧", "050-123-4567" and "0501234567" all match. */
function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export const useCustomersStore = defineStore('customers', () => {
  const items = ref<Customer[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  async function load(force = false): Promise<void> {
    if (loaded.value && !force) return
    isLoading.value = true
    error.value = null
    try {
      items.value = await repository.loadCustomers()
      loaded.value = true
    } catch {
      error.value = 'تعذّر تحميل العملاء.'
    } finally {
      isLoading.value = false
    }
  }

  function persist(): void {
    void repository.saveCustomers(items.value)
  }

  function byId(id: string): Customer | null {
    return items.value.find((c) => c.id === id) ?? null
  }

  function byPhone(phone: string): Customer | null {
    const n = normalisePhone(phone)
    return items.value.find((c) => normalisePhone(c.phone) === n) ?? null
  }

  const sorted = computed(() => [...items.value].sort((a, b) => a.name.localeCompare(b.name, 'ar')))

  function search(query: string): Customer[] {
    const q = query.trim()
    if (!q) return sorted.value
    const digits = normalisePhone(q)
    return sorted.value.filter(
      (c) =>
        c.name.includes(q) ||
        (digits.length > 0 && normalisePhone(c.phone).includes(digits)) ||
        (c.email?.toLowerCase().includes(q.toLowerCase()) ?? false),
    )
  }

  /** Returns the existing customer when the phone already exists — never duplicates. */
  function upsert(input: { name: string; phone: string; email?: string }): Customer {
    const existing = byPhone(input.phone)
    if (existing) return existing

    const customer: Customer = {
      id: uid('c_'),
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }
    items.value.push(customer)
    persist()
    return customer
  }

  return { items, isLoading, error, loaded, load, byId, byPhone, sorted, search, upsert }
})
