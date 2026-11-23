import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

/** Label seksi editorial: huruf mono kecil + garis rambut sepanjang baris. */
export function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="mono whitespace-nowrap text-[11px] uppercase tracking-[0.14em] text-muted">{children}</span>
      <span className="h-px flex-1 bg-line" />
      {right}
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[12px] font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  )
}

export function Chips<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" className="chip" aria-pressed={value === o} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

export function MultiChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[]
  value: T[]
  onChange: (v: T[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button
            key={o}
            type="button"
            className="chip"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  label?: string
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-[4px] border-[1.5px] border-ink" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`px-3 py-1 text-[13px] ${value === o ? 'bg-ink text-paper' : ''}`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (b: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-[4px] border-[1.5px] border-ink ${on ? 'bg-tomato' : 'bg-transparent'}`}
    >
      <span className={`absolute top-[2px] h-3 w-3 rounded-[2px] bg-ink transition-all ${on ? 'left-[18px]' : 'left-[2px]'}`} />
    </button>
  )
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
}

export function Modal({
  title,
  children,
  onClose,
  wide,
  footer,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
  footer?: ReactNode
}) {
  useEscape(onClose)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#141210]/50 p-0 sm:p-6" onClick={onClose}>
      <div
        className={`box flex h-full max-h-full w-full flex-col overflow-auto sm:h-auto sm:max-h-[90vh] ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 border-b-[1.5px] border-ink p-5">
          <h2 className="disp text-[26px]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup">
            <Icon n="x" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Sheet({
  title,
  children,
  onClose,
  width = 480,
  footer,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  width?: number
  footer?: ReactNode
}) {
  useEscape(onClose)
  return (
    <div className="fixed inset-0 z-50 bg-[#141210]/40" onClick={onClose}>
      <aside
        className="absolute right-0 top-0 flex h-full w-full flex-col border-l-[1.5px] border-ink bg-paper"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b-[1.5px] border-ink p-5 pt-[max(1.25rem,env(safe-area-inset-top,0px))]">
          <h2 className="disp text-[26px]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup">
            <Icon n="x" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center gap-2 border-t-[1.5px] border-ink p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </aside>
    </div>
  )
}

/** Urutkan baris berdasarkan satu kolom; klik kolom yang sama membalik arah. */
export function useSort<T>(rows: T[], initial: keyof T & string) {
  const [key, setKey] = useState<string>(initial)
  const [dir, setDir] = useState(-1)
  const sorted = [...rows].sort((a, b) => {
    const x = (a as Record<string, unknown>)[key] as number | string
    const y = (b as Record<string, unknown>)[key] as number | string
    return (x > y ? 1 : x < y ? -1 : 0) * dir
  })
  const sortBy = (k: string) => () => {
    if (k === key) setDir(-dir)
    else {
      setKey(k)
      setDir(-1)
    }
  }
  return { sorted, sortBy, key, dir }
}
