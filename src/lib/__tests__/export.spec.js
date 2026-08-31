import { describe, expect, it } from 'vitest'
import { toCsv } from '../export'

const columns = [
  { header: 'الاسم', value: (r) => r.name },
  { header: 'ملاحظة', value: (r) => r.note },
  { header: 'المبلغ', value: (r) => r.amount },
]

describe('toCsv', () => {
  it('quotes a value containing a comma', () => {
    // Without this the row silently gains a column and every field after it
    // lands under the wrong header.
    const csv = toCsv([{ name: 'أحمد, سعيد', note: '', amount: 150 }], columns)
    expect(csv.split('\r\n')[1]).toBe('"أحمد, سعيد",,150')
  })

  it('leaves an Arabic comma alone — it is not a field separator', () => {
    // U+060C looks like a comma and is not one. Quoting on it would be
    // harmless but wrong, and the mistake is easy to make in the other
    // direction: escaping only ASCII while assuming Arabic text is safe.
    const csv = toCsv([{ name: 'أحمد، سعيد', note: '', amount: 150 }], columns)
    expect(csv.split('\r\n')[1]).toBe('أحمد، سعيد,,150')
  })

  it('doubles an embedded quote', () => {
    const csv = toCsv([{ name: 'قال "مرحبا"', note: '', amount: 0 }], columns)
    expect(csv.split('\r\n')[1]).toBe('"قال ""مرحبا""",,0')
  })

  it('quotes a value containing a newline', () => {
    const csv = toCsv([{ name: 'اسم', note: 'سطر\nثانٍ', amount: 0 }], columns)
    expect(csv).toContain('"سطر\nثانٍ"')
  })

  it('leaves ordinary values unquoted', () => {
    const csv = toCsv([{ name: 'سارة', note: 'عادي', amount: 80 }], columns)
    expect(csv.split('\r\n')[1]).toBe('سارة,عادي,80')
  })

  it('renders null and undefined as empty, not as the word', () => {
    const cols = [
      { header: 'a', value: (r) => r.a },
      { header: 'b', value: (r) => r.b },
    ]
    expect(toCsv([{ a: null, b: undefined }], cols).split('\r\n')[1]).toBe(',')
  })

  it('emits a header even with no rows', () => {
    expect(toCsv([], columns)).toBe('الاسم,ملاحظة,المبلغ\r\n')
  })

  it('separates rows with CRLF, per RFC 4180', () => {
    const csv = toCsv(
      [
        { name: 'أ', note: '', amount: 1 },
        { name: 'ب', note: '', amount: 2 },
      ],
      columns,
    )
    expect(csv.split('\r\n')).toHaveLength(3)
  })
})
