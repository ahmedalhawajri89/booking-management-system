import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const OUT = './qa-screenshots'
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
})

const errors = []
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' })
const page = await ctx.newPage()
page.on('console', (m) => {
  const t = m.text()
  if (m.type() === 'error' && !t.includes('ERR_TUNNEL') && !t.includes('fonts.googleapis'))
    errors.push(`[console] ${t}`)
})
page.on('pageerror', (e) => errors.push(`[pageerror] ${e}`))

async function go(path, name, waitMs = 900) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(waitMs)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('✓', name, '→', page.url().replace(BASE, '') || '/')
}

// --- guard: /app must bounce to /login when signed out ------------------
await page.goto(BASE + '/app', { waitUntil: 'networkidle' })
console.log(page.url().includes('/login') ? '✓ guard redirects /app → /login' : '✗ GUARD FAILED')

// --- 404 ---------------------------------------------------------------
await go('/definitely-not-a-page', '404')
console.log(
  (await page.getByText('الصفحة غير موجودة').count()) > 0 ? '✓ 404 page renders' : '✗ 404 missing',
)

// --- guest -------------------------------------------------------------
await go('/', 'guest-home')
await go('/book', 'guest-book-1')

// walk the guest wizard end to end
await page.getByRole('button', { name: /استشارة طبية/ }).click()
await page.getByRole('button', { name: 'التالي' }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/guest-book-2.png` })

const slot = page.getByRole('radio').filter({ hasNotText: /^$/ })
const available = page.locator('[role="radio"]:not([disabled])').last()
await available.click()
await page.getByRole('button', { name: 'التالي' }).click()
await page.waitForTimeout(400)
await page.getByLabel(/الاسم الكامل/).fill('اختبار تلقائي')
await page.getByLabel(/رقم الجوال/).fill('0501112222')
await page.screenshot({ path: `${OUT}/guest-book-3.png` })
await page.getByRole('button', { name: 'تأكيد الحجز' }).click()
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/guest-confirmed.png` })
const ref = await page.locator('[data-numeric]').first().innerText()
console.log('✓ guest booking created:', ref.trim())

// --- my booking lookup --------------------------------------------------
await go(`/booking/${ref.trim()}`, 'my-booking-verify')
await page.getByLabel(/رقم الجوال/).fill('0501112222')
await page.getByRole('button', { name: 'عرض الحجز' }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/my-booking.png` })
console.log(
  (await page.getByText('بانتظار التأكيد').count()) > 0
    ? '✓ lookup shows the real booking'
    : '✗ lookup failed',
)

// --- sign in ------------------------------------------------------------
await go('/login', 'login')
await page.getByRole('button', { name: 'دخول' }).click()
await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}/app-today.png` })
console.log(page.url().endsWith('/app') ? '✓ signed in → /app' : `✗ landed on ${page.url()}`)

// the guest booking must be visible to the operator — the two halves are joined
await page.goto(BASE + '/app/bookings', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.getByPlaceholder(/ابحث/).first().fill('اختبار تلقائي')
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/app-bookings-search.png` })
console.log(
  (await page.getByText('اختبار تلقائي').count()) > 0
    ? '✓ guest booking is visible in the operator list'
    : '✗ booking did not propagate',
)

// open the detail drawer
await page.getByText('اختبار تلقائي').first().click()
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/app-detail-drawer.png` })
console.log(
  (await page.getByRole('dialog').count()) > 0 ? '✓ detail drawer opens' : '✗ drawer failed',
)

// confirm it, then check the status changed (scoped to the drawer)
const drawer = page.getByRole('dialog')
await drawer.getByRole('button', { name: 'تأكيد', exact: true }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/app-detail-confirmed.png` })
console.log(
  (await drawer.getByText('مؤكد', { exact: true }).count()) > 0
    ? '✓ confirm action works — status is now مؤكد'
    : '✗ confirm failed',
)
await page.keyboard.press('Escape')
await page.waitForTimeout(400)

// --- other operator screens --------------------------------------------
await go('/app', 'app-today-full', 1200)
await go('/app/calendar', 'app-calendar', 1000)
await go('/app/customers', 'app-customers', 900)
await go('/app/settings', 'app-settings', 800)

// create drawer via keyboard shortcut
await page.goto(BASE + '/app', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.keyboard.press('n')
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/app-create-drawer.png` })
console.log(
  (await page.getByRole('dialog').count()) > 0 ? '✓ "n" opens the create drawer' : '✗ shortcut failed',
)

// --- responsive ---------------------------------------------------------
for (const [w, h, tag] of [
  [390, 844, 'mobile'],
  [768, 1024, 'tablet'],
  [1280, 800, 'laptop'],
]) {
  await page.setViewportSize({ width: w, height: h })
  await page.goto(BASE + '/app', { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/responsive-today-${tag}.png` })
  await page.goto(BASE + '/app/bookings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/responsive-bookings-${tag}.png` })
  console.log('✓ responsive', tag, `${w}×${h}`)
}

console.log('\n' + (errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : '✓ zero console errors'))
await browser.close()
