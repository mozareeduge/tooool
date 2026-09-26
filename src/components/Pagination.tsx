import { useEffect, useState } from 'react'

interface PaginationProps {
  pageIndex: number
  pageCount: number
  onChange: (pageIndex: number) => void
}

export function Pagination({ pageIndex, pageCount, onChange }: PaginationProps) {
  const [draft, setDraft] = useState(String(pageIndex + 1))

  useEffect(() => {
    setDraft(String(pageIndex + 1))
  }, [pageIndex, pageCount])

  const jump = () => {
    if (pageCount <= 0) {
      setDraft(String(pageIndex + 1))
      return
    }

    const requested = Number.parseInt(draft, 10)
    if (!Number.isFinite(requested)) {
      setDraft(String(pageIndex + 1))
      return
    }
    const clamped = Math.min(pageCount, Math.max(1, requested))
    onChange(clamped - 1)
    setDraft(String(clamped))
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
      <button
        className="min-w-11 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        disabled={pageIndex <= 0}
        onClick={() => onChange(pageIndex - 1)}
        aria-label="Previous page"
      >
        <span className="hidden sm:inline">Previous</span>
        <span className="text-lg leading-none sm:hidden" aria-hidden="true">‹</span>
      </button>

      <div className="flex items-center gap-2 px-1 text-sm text-slate-500">
        <span>Page</span>
        <input
          aria-label="Jump to page"
          className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2"
          inputMode="numeric"
          min={1}
          max={Math.max(1, pageCount)}
          type="number"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={jump}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              jump()
              event.currentTarget.blur()
            }
          }}
        />
        <span>of {pageCount || '—'}</span>
      </div>

      <button
        className="min-w-11 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        disabled={pageCount === 0 || pageIndex >= pageCount - 1}
        onClick={() => onChange(pageIndex + 1)}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <span className="text-lg leading-none sm:hidden" aria-hidden="true">›</span>
      </button>
    </div>
  )
}
