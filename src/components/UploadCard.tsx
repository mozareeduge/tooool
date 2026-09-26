import type { ChangeEvent, ReactNode } from 'react'

interface UploadCardProps {
  label: string
  detail: string
  accept: string
  onFile: (file: File) => void | Promise<void>
  children?: ReactNode
  disabled?: boolean
}

export function UploadCard({
  label,
  detail,
  accept,
  onFile,
  children,
  disabled = false,
}: UploadCardProps) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void onFile(file)
  }

  return (
    <label
      className={`block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-slate-300 hover:shadow'
      }`}
    >
      <input
        className="sr-only"
        type="file"
        accept={accept}
        onChange={onChange}
        disabled={disabled}
      />
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg text-slate-600">
          +
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          <div className="truncate text-xs text-slate-500">{detail}</div>
        </div>
      </div>
      {children}
    </label>
  )
}
