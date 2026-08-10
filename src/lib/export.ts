/**
 * CSV export.
 *
 * Two details that are easy to get wrong and expensive to discover late:
 *
 * 1. The BOM. Excel opens a UTF-8 file without one as the system codepage,
 *    which turns every Arabic name into mojibake. Anyone exporting from an
 *    Arabic app and opening it in Excel — that is, the whole audience —
 *    would see garbage.
 * 2. Escaping. Names and notes contain commas, quotes and newlines. RFC 4180
 *    says wrap in quotes and double any inner quote; a naive join produces a
 *    file that silently shifts columns.
 */

export interface Column<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

function escape(raw: string | number | null | undefined): string {
  const s = raw == null ? '' : String(raw)
  if (!/[",\n\r]/.test(s)) return s
  return `"${s.replace(/"/g, '""')}"`
}

export function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const head = columns.map((c) => escape(c.header)).join(',')
  const body = rows.map((r) => columns.map((c) => escape(c.value(r))).join(',')).join('\r\n')
  return `${head}\r\n${body}`
}

/** Triggers a download. Returns nothing useful — it is a side effect. */
export function downloadCsv<T>(filename: string, rows: T[], columns: Column<T>[]): void {
  const blob = new Blob(['﻿', toCsv(rows, columns)], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
