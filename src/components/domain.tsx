import { monogram } from '../lib/format'
import { curve, medianCurve, PLATFORM_CODE, PLATFORMS, POSTER_COLORS, stockDays } from '../lib/mock'
import type { AccountState, Channel, PlatformPost, Ratio, Stage } from '../lib/types'
import { Icon, type IconName } from './Icon'

const STAGE_COLOR: Record<Stage, string> = { Bibit: '#D9CFB8', Tumbuh: 'var(--olive)', Panen: '#FF5A1F', Dipangkas: '#8A847B' }

/** Glyph tahap: lingkaran kosong → setengah → penuh → silang. Tidak pernah warna saja. */
export function StageGlyph({ stage, s = 14 }: { stage: Stage; s?: number }) {
  const c = STAGE_COLOR[stage]
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" className="shrink-0" role="img" aria-label={stage}>
      <circle cx="8" cy="8" r="6.2" fill={stage === 'Panen' ? c : 'none'} stroke={stage === 'Bibit' ? '#A89A76' : c} strokeWidth="1.8" />
      {stage === 'Tumbuh' && <path d="M8 1.8a6.2 6.2 0 010 12.4z" fill={c} />}
      {stage === 'Dipangkas' && <path d="M4 4l8 8M12 4l-8 8" stroke={c} strokeWidth="1.5" />}
    </svg>
  )
}

export function StageTag({ stage }: { stage: Stage }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      <StageGlyph stage={stage} />
      {stage}
    </span>
  )
}

export function Monogram({ name, ink, s = 32 }: { name: string; ink?: boolean; s?: number }) {
  return (
    <span
      aria-hidden="true"
      className={`disp inline-grid shrink-0 place-items-center rounded-[4px] ${ink ? 'bg-ink text-paper' : 'bg-sand text-[#141210]'}`}
      style={{ width: s, height: s, fontSize: s * 0.42, letterSpacing: '-0.02em' }}
    >
      {monogram(name)}
    </span>
  )
}

/** Kode platform: pekat = tersambung, garis = tidak dipakai, titik = bermasalah. */
export function PlatGlyph({ i, state = 'ok' }: { i: number; state?: AccountState }) {
  const on = state !== 'off'
  return (
    <span
      title={`${PLATFORMS[i]}${on ? '' : ' (tidak dipakai)'}`}
      className={`mono relative inline-grid h-[18px] w-[22px] place-items-center rounded-[3px] border-[1.5px] text-[9px] ${
        on ? 'border-ink bg-ink text-paper' : 'border-line text-muted'
      }`}
    >
      {PLATFORM_CODE[i]}
      {(state === 'fail' || state === 'login') && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red" />}
      {state === 'stale' && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber" />}
    </span>
  )
}

/**
 * Pengganti poster video selama belum ada file asli. Judul diberi jarak atas
 * minimal 34px supaya tidak tertutup badge nomor antrean pada poster 16:9 / 1:1.
 */
export function Poster({
  hue,
  title,
  ratio = '9:16',
  gray,
  className = '',
}: {
  hue: number
  title?: string
  ratio?: Ratio
  gray?: boolean
  className?: string
}) {
  const ar = ratio === '16:9' ? '16/9' : ratio === '1:1' ? '1/1' : '9/16'
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: ar, background: POSTER_COLORS[hue % 8], filter: gray ? 'grayscale(1)' : undefined }}
    >
      <div
        className="absolute rounded-full"
        style={{ width: '70%', aspectRatio: '1', right: '-18%', top: '12%', background: 'rgba(255,255,255,.22)' }}
      />
      <div className="absolute" style={{ left: '10%', bottom: '24%', width: '36%', height: '18%', background: 'rgba(20,18,16,.35)' }} />
      {title && (
        <div
          className="disp absolute left-[8%] right-[8%] text-[clamp(13px,1.6vw,20px)] text-[#fffaf0]"
          style={{ top: 'max(8%, 34px)', lineHeight: 1.05 }}
        >
          {title}
        </div>
      )}
    </div>
  )
}

export function TickBar({ v, max, n = 30, red }: { v: number; max: number; n?: number; red?: boolean }) {
  const filled = Math.round((Math.min(v, max) / max) * n)
  return (
    <div className="flex gap-[2px]" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="h-3 min-w-[2px] flex-1"
          style={{ background: i < filled ? (red ? 'var(--red)' : 'var(--ink)') : 'var(--line)' }}
        />
      ))}
    </div>
  )
}

/** Kurva kecil channel di atas pita median semua channel. */
export function Spark({ c, w = 96, h = 28 }: { c: Channel; w?: number; h?: number }) {
  const a = curve(c)
  const m = medianCurve()
  const mx = Math.max(...a, ...m)
  const pt = (arr: number[]) => arr.map((v, i) => `${(i / (arr.length - 1)) * w},${h - (v / mx) * (h - 2) - 1}`)
  const band = [...pt(m.map((v) => v * 1.25)), ...pt(m.map((v) => v * 0.75)).reverse()].join(' ')
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden="true">
      <polygon points={band} fill="var(--sand)" opacity=".7" />
      <polyline points={pt(a).join(' ')} fill="none" stroke={c.stage === 'Panen' ? 'var(--tomato)' : 'var(--ink)'} strokeWidth="1.5" />
    </svg>
  )
}

export function StockBar({ c }: { c: Channel }) {
  const days = stockDays(c)
  const red = days <= 2
  return (
    <div className="grid grid-cols-[110px_1fr_64px] items-center gap-2 text-[13px]">
      <span className="truncate">{c.name}</span>
      <div className="h-2 bg-line">
        <div className="h-full" style={{ width: `${Math.min(100, (days / 14) * 100)}%`, background: red ? 'var(--red)' : 'var(--ink)' }} />
      </div>
      <span className={`mono text-right ${red ? 'text-red' : ''}`}>{days === 0 ? 'Kosong' : `${days} hari`}</span>
    </div>
  )
}

export const ACCOUNT_LABEL: Record<AccountState, { label: string; color: string; icon: IconName | null }> = {
  ok: { label: 'Sehat', color: 'var(--green)', icon: 'check' },
  fail: { label: 'Gagal tayang', color: 'var(--red)', icon: 'alert' },
  login: { label: 'Login kedaluwarsa', color: 'var(--red)', icon: 'alert' },
  stale: { label: 'Basi', color: 'var(--amber)', icon: 'clock' },
  off: { label: 'Tidak dipakai', color: 'var(--muted)', icon: null },
}

const POST_STYLE: Record<PlatformPost['state'], { color: string; mark: string; label: string }> = {
  antre: { color: 'var(--ink)', mark: '', label: 'Antre' },
  terjadwal: { color: 'var(--blue)', mark: '', label: 'Terjadwal' },
  tayang: { color: 'var(--green)', mark: '✓', label: 'Tayang' },
  gagal: { color: 'var(--red)', mark: '!', label: 'Gagal' },
  'belum-pasti': { color: 'var(--amber)', mark: '?', label: 'Belum pasti' },
  off: { color: 'var(--line)', mark: '—', label: 'Tidak dipakai' },
}

/** Tanda status satu platform pada kartu video. */
export function PostMark({ i, post }: { i: number; post: PlatformPost }) {
  const st = POST_STYLE[post.state]
  const title = post.reason ?? `${PLATFORMS[i]}: ${st.label}${post.time ? ` ${post.time}` : ''}`
  return (
    <span
      title={title}
      className="mono rounded-[3px] border-[1.5px] px-[3px] text-[9px]"
      style={{ color: post.state === 'off' ? 'var(--muted)' : st.color, borderColor: st.color }}
    >
      {PLATFORM_CODE[i]}
      {post.state === 'terjadwal' ? ` ${post.time}` : st.mark}
    </span>
  )
}
