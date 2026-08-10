import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'

/**
 * Chart.js setup, done once.
 *
 * Registration is explicit rather than `...registerables` so the bundle only
 * carries the three chart types this app draws. The library was already a
 * dependency but had never been imported anywhere — it was dead weight in
 * package.json until now.
 */
let registered = false

export function setupCharts() {
  if (registered) return
  Chart.register(
    LineController,
    BarController,
    DoughnutController,
    LineElement,
    BarElement,
    PointElement,
    ArcElement,
    CategoryScale,
    LinearScale,
    Filler,
    Tooltip,
  )

  const css = getComputedStyle(document.documentElement)
  Chart.defaults.font.family = css.getPropertyValue('--font-sans').trim()
  Chart.defaults.font.size = 12
  Chart.defaults.color = css.getPropertyValue('--color-fg-subtle').trim()
  Chart.defaults.borderColor = css.getPropertyValue('--color-border').trim()
  Chart.defaults.plugins.tooltip.rtl = true
  Chart.defaults.plugins.tooltip.textDirection = 'rtl'
  registered = true
}

/**
 * Chart colours come from the design tokens, read at runtime. Hard-coding
 * hexes here is how a chart ends up being the one thing on the page that
 * never got re-skinned.
 */
export function chartColors() {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    primary: v('--color-primary-600'),
    primarySoft: v('--color-primary-100'),
    accent: v('--color-accent-600'),
    success: v('--color-success-700'),
    warning: v('--color-warning-700'),
    danger: v('--color-danger-700'),
    info: v('--color-info-700'),
    grid: v('--color-border'),
    fg: v('--color-fg'),
    muted: v('--color-fg-subtle'),
    surface: v('--color-surface'),
  }
}
