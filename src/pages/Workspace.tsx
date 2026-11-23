import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useApp } from '../app/context'
import { PostMark, Poster, StageGlyph, TickBar } from '../components/domain'
import { Icon, type IconName } from '../components/Icon'
import { Label, Seg, Switch } from '../components/ui'
import { duration, num, times } from '../lib/format'
import {
  findChannel,
  monetizationProgress,
  PLATFORMS,
  revenueOf,
  roi,
  schedulerReady,
  slotPlan,
  stockDays,
  targetRatio,
  verdictHead,
  videoCount,
  videosFor,
  type VideoKind,
} from '../lib/mock'
import type { Channel, Ratio, Video } from '../lib/types'

const TABS: { kind: VideoKind; label: string }[] = [
  { kind: 'antre', label: 'Antrean' },
  { kind: 'terjadwal', label: 'Terjadwal' },
  { kind: 'tayang', label: 'Tayang' },
  { kind: 'sampah', label: 'Sampah' },
]
const CARD_WIDTH = { Kecil: 150, Sedang: 190, Besar: 240 } as const
type Size = keyof typeof CARD_WIDTH
type Action = 'Edit caption' | 'Salin caption' | 'Unduh' | 'Jadwalkan sekarang' | 'Pindah channel' | 'Sampah'
const ACTIONS: { icon: IconName; action: Action }[] = [
  { icon: 'edit', action: 'Edit caption' },
  { icon: 'copy', action: 'Salin caption' },
  { icon: 'dl', action: 'Unduh' },
  { icon: 'clock', action: 'Jadwalkan sekarang' },
  { icon: 'move', action: 'Pindah channel' },
  { icon: 'trash', action: 'Sampah' },
]

export default function Workspace() {
  const { id } = useParams()
  const c = findChannel(id)
  if (!c) {
    return (
      <div className="p-8">
        <h1 className="disp mb-4 text-[40px]">Channel tidak ditemukan</h1>
        <Link to="/channel" className="btn btn-primary">
          Kembali ke daftar channel
        </Link>
      </div>
    )
  }
  return <ChannelWorkspace key={c.id} c={c} />
}

function ChannelWorkspace({ c }: { c: Channel }) {
  const { toast, openModal, openUpload, openWizard } = useApp()
  const [tab, setTab] = useState<VideoKind>('antre')
  const [queue, setQueue] = useState<Video[]>(() => videosFor(c, 'antre'))
  const [selected, setSelected] = useState<string[]>([])
  const [anchor, setAnchor] = useState<number | null>(null)
  const [ratio, setRatio] = useState<'Semua' | Ratio>('Semua')
  const [size, setSize] = useState<Size>('Sedang')
  const [openSlot, setOpenSlot] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [posEdit, setPosEdit] = useState<{ id: string; value: string } | null>(null)
  const [bulkPos, setBulkPos] = useState('')
  const [menu, setMenu] = useState<{ x: number; y: number; video: Video } | null>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [auto, setAuto] = useState(c.auto)
  const previous = useRef<Video[] | null>(null)

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    document.addEventListener('click', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', close)
    }
  }, [menu])

  const gone = c.stage === 'Dipangkas'
  const r = targetRatio(c)
  const days = stockDays(c)
  const money = roi(c)
  const income = revenueOf(c.id).total
  const slots = slotPlan(c)
  const width = CARD_WIDTH[size]
  const isQueue = tab === 'antre'
  const shown = isQueue ? queue.filter((v) => ratio === 'Semua' || v.ratio === ratio) : videosFor(c, tab)
  const count = (k: VideoKind) => (k === 'antre' ? queue.length : videoCount(c, k))

  const reorder = (next: Video[], message = 'Urutan diubah') => {
    previous.current = queue
    setQueue(next)
    toast(message, { label: 'Batalkan', run: () => previous.current && setQueue(previous.current) })
  }
  const moveTo = (ids: string[], position: number) => {
    const moving = queue.filter((v) => ids.includes(v.id))
    const rest = queue.filter((v) => !ids.includes(v.id))
    const at = Math.max(0, Math.min(rest.length, position - 1))
    reorder([...rest.slice(0, at), ...moving, ...rest.slice(at)])
  }
  const toggle = (i: number, shift: boolean) => {
    const vid = shown[i].id
    if (shift && anchor !== null) {
      const [a, b] = [Math.min(anchor, i), Math.max(anchor, i)]
      setSelected([...new Set([...selected, ...shown.slice(a, b + 1).map((v) => v.id)])])
    } else {
      setSelected(selected.includes(vid) ? selected.filter((x) => x !== vid) : [...selected, vid])
    }
    setAnchor(i)
  }
  const trash = (ids: string[]) => {
    setQueue(queue.filter((v) => !ids.includes(v.id)))
    setSelected([])
    toast(`${ids.length} video dipindah ke Sampah`)
  }
  const drop = (to: number) => {
    if (drag === null || drag === to) return
    const next = [...queue]
    const [m] = next.splice(drag, 1)
    next.splice(to, 0, m)
    reorder(next)
    setDrag(null)
    setOver(null)
  }
  const act = (a: Action, v: Video) => {
    if (a === 'Edit caption') setEditing({ id: v.id, text: v.caption })
    else if (a === 'Salin caption') {
      navigator.clipboard?.writeText(v.caption).catch(() => undefined)
      toast('Caption disalin')
    } else if (a === 'Unduh') toast(`Mengunduh ${v.topic}`)
    else if (a === 'Jadwalkan sekarang') openModal({ type: 'schedule', channelId: c.id })
    else if (a === 'Pindah channel') openModal({ type: 'move', channelId: c.id, count: 1, sentCount: v.sent ? 1 : 0 })
    else trash([v.id])
  }

  return (
    <div className="p-5 pb-28 md:p-8">
      <header className="mb-8 flex flex-wrap justify-between gap-5">
        <div className="max-w-3xl">
          <h1 className={`disp text-[36px] md:text-[56px] ${gone ? 'text-gray line-through' : ''}`}>{c.name}</h1>
          <p className="mt-3 flex items-center gap-2 text-[14px]">
            <span className="text-muted">
              {c.niche} · {c.format}
            </span>
            <StageGlyph stage={c.stage} />
            <span>{c.stage}</span>
          </p>
          <p className="mt-1 italic text-ink2">{c.hypothesis}</p>
        </div>
        {!gone && (
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex items-center gap-2">
              <Switch on={auto} onChange={setAuto} label={`Auto ${c.name}`} />
              Auto
            </span>
            <button type="button" className="btn btn-tomato" onClick={() => openUpload(c.id)}>
              <Icon n="upload" s={14} />
              Unggah Video
            </button>
            <button type="button" className="btn btn-outline" onClick={() => openWizard(c.id)}>
              Pengaturan channel
            </button>
          </div>
        )}
      </header>

      <section className="mb-6">
        <Label>Rapor eksperimen</Label>
        <div className="grid grid-cols-2 border-t-[1.5px] border-ink md:grid-cols-5 md:border-b-[1.5px]">
          {(
            [
              [`Hari ${c.day}/${c.dayTotal}`, <TickBar key="t" v={c.day} max={c.dayTotal} n={20} />, false],
              [`${c.vids}/${c.vidsTotal} video`, 'sudah tayang', false],
              [num(c.viewsPerPost), `views/post · target ${num(c.target)}`, false],
              [
                `Rp ${num(income)}`,
                money === null ? 'pendapatan bulan ini' : `pendapatan · ROI ${times(money)}`,
                money !== null && money >= 1,
              ],
              [`Stok ${queue.length} video`, days === 0 ? 'habis' : `${days} hari`, false],
            ] as const
          ).map(([a, b, good], i) => (
            <div
              key={i}
              className={`border-b-[1.5px] border-ink px-4 py-5 md:border-b-0 ${i % 2 ? 'border-l border-l-line' : ''} ${i > 0 ? 'md:border-l md:border-l-line' : ''}`}
            >
              <div className="mono text-[20px] font-semibold md:text-[24px]">{a}</div>
              <div
                className={`mono mt-1 text-[12px] ${i === 4 && days <= 2 ? 'text-red' : good ? 'font-semibold text-tomatotxt' : 'text-muted'}`}
              >
                {b}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[14px]">
          {verdictHead(c)} — <span className={`mono ${r >= 1 ? 'font-semibold text-tomatotxt' : ''}`}>{times(r)}</span> target di hari ke-
          {c.day}.{' '}
          <Link to="/bandingkan" className="ml-2 underline">
            Bandingkan dengan niche lain
          </Link>
        </p>
      </section>

      {!gone && <MonetizationPath c={c} />}

      {!gone && (
        <section className="mb-8">
          <Label>
            Slot hari ini {slots.filter((s) => s.used).length}/{slots.length} · Otomatis bertahap · hari ke-{c.day}
          </Label>
          {slots.length === 0 || !schedulerReady(c) ? (
            <p className="text-[13px] text-red">
              {schedulerReady(c) ? 'Tidak ada slot aktif.' : 'Scheduler tidak bisa dipakai — periksa koneksinya di halaman Koneksi.'}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    className="chip mono"
                    aria-pressed={openSlot === s.name}
                    onClick={() => setOpenSlot(openSlot === s.name ? null : s.name)}
                  >
                    {s.name} {s.range} {s.used ? 'terpakai' : 'kosong'}
                  </button>
                ))}
              </div>
              {openSlot && <p className="mono mt-2 text-[12px] text-ink2">{slots.find((s) => s.name === openSlot)?.times}</p>}
            </>
          )}
        </section>
      )}

      <div className="mb-4 flex gap-6 overflow-x-auto border-b-[1.5px] border-ink" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            role="tab"
            aria-selected={tab === t.kind}
            onClick={() => {
              setTab(t.kind)
              setSelected([])
            }}
            className={`-mb-[1.5px] whitespace-nowrap border-b-[3px] pb-2 ${tab === t.kind ? 'border-tomato font-semibold' : 'border-transparent text-muted'}`}
          >
            {t.label} <span className="mono">{count(t.kind)}</span>
          </button>
        ))}
      </div>

      {isQueue && queue.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <Seg options={['Semua', '9:16', '16:9', '1:1'] as const} value={ratio} onChange={setRatio} label="Filter rasio" />
          <Seg options={['Kecil', 'Sedang', 'Besar'] as const} value={size} onChange={setSize} label="Ukuran kartu" />
          <select
            className="!w-44"
            aria-label="Susun otomatis"
            value=""
            onChange={(e) => {
              const m = e.target.value
              if (m === 'terbaik')
                reorder(
                  [...queue].sort((a, b) => b.index - a.index),
                  'Disusun: terbaik dulu',
                )
              if (m === 'seling')
                reorder(
                  [...queue].sort((a, b) => a.topic.localeCompare(b.topic)),
                  'Disusun: selang-seling topik',
                )
              if (m === 'terlama')
                reorder(
                  videosFor(c, 'antre').filter((v) => queue.some((q) => q.id === v.id)),
                  'Disusun: terlama dulu',
                )
            }}
          >
            <option value="">Susun otomatis</option>
            <option value="seling">Selang-seling topik</option>
            <option value="terbaik">Terbaik dulu</option>
            <option value="terlama">Terlama dulu</option>
          </select>
          <span className="text-[12px] text-muted">Shift + klik untuk memilih rentang · klik kanan untuk menu</span>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="py-20">
          <p className="disp mb-4 text-[32px]">
            {isQueue
              ? gone
                ? 'Channel ini sudah dipangkas.'
                : 'Antrean kosong. Channel ini berhenti posting besok.'
              : 'Belum ada video di sini.'}
          </p>
          {isQueue && !gone && (
            <button type="button" className="btn btn-tomato" onClick={() => openUpload(c.id)}>
              Unggah Video
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(auto-fill, ${width}px)` }}>
          {shown.map((v, i) => {
            const qi = queue.indexOf(v)
            const isSel = selected.includes(v.id)
            const failed = v.posts.some((p) => p.state === 'gagal')
            const unsure = v.posts.some((p) => p.state === 'belum-pasti')
            return (
              <article
                key={v.id}
                className={`relative ${drag === qi ? 'opacity-40' : ''} ${isQueue && over === qi && drag !== qi ? 'outline-dashed outline-2 outline-offset-4 outline-ink' : ''}`}
                draggable={isQueue && ratio === 'Semua'}
                onDragStart={() => setDrag(qi)}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOver(qi)
                }}
                onDrop={() => drop(qi)}
                onDragEnd={() => {
                  setDrag(null)
                  setOver(null)
                }}
                onContextMenu={(e) => {
                  if (tab === 'sampah') return
                  e.preventDefault()
                  setMenu({ x: e.clientX, y: e.clientY, video: v })
                }}
              >
                <div className={`box relative overflow-hidden ${isSel ? '!border-[3px] !border-tomato' : ''}`}>
                  <Poster hue={v.hue} title={v.topic} ratio={v.ratio} gray={tab === 'sampah'} />
                  {isQueue && (
                    <div
                      className="absolute left-1.5 top-1.5 flex cursor-grab items-center gap-1 rounded-[4px] border-[1.5px] border-ink bg-paper px-1 py-0.5"
                      title="Geser untuk ubah urutan"
                    >
                      <Icon n="drag" s={12} />
                      {posEdit?.id === v.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            const n = parseInt(posEdit.value, 10)
                            if (n >= 1) moveTo([v.id], n)
                            setPosEdit(null)
                          }}
                        >
                          <input
                            autoFocus
                            className="mono !w-12 !border-0 !p-0 !text-[11px]"
                            inputMode="numeric"
                            aria-label="Posisi baru"
                            value={posEdit.value}
                            onChange={(e) => setPosEdit({ id: v.id, value: e.target.value })}
                            onBlur={() => setPosEdit(null)}
                          />
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="mono text-[11px]"
                          title="Klik untuk pindah ke nomor antrean lain"
                          onClick={() => setPosEdit({ id: v.id, value: String(qi + 1) })}
                        >
                          #{qi + 1}
                        </button>
                      )}
                    </div>
                  )}
                  {tab !== 'sampah' && (
                    <input
                      type="checkbox"
                      className="absolute right-2 top-2 h-4 w-4"
                      checked={isSel}
                      onChange={() => undefined}
                      onClick={(e) => toggle(i, e.shiftKey)}
                      aria-label={`Pilih ${v.topic}`}
                    />
                  )}
                  <div className="mono absolute inset-x-0 bottom-0 flex justify-between bg-[#141210]/70 px-2 py-1 text-[10px] text-white">
                    <span>{duration(v.duration)}</span>
                    <span>{v.ratio}</span>
                  </div>
                </div>

                <h4 className="mt-2 truncate text-[13px] font-semibold">{v.topic}</h4>
                {editing?.id === v.id ? (
                  <div className="mt-1">
                    <textarea
                      rows={3}
                      className="!text-[12px]"
                      value={editing.text}
                      onChange={(e) => setEditing({ id: v.id, text: e.target.value })}
                      aria-label="Caption"
                    />
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary !py-1"
                        onClick={() => {
                          setQueue(queue.map((x) => (x.id === v.id ? { ...x, caption: editing.text } : x)))
                          setEditing(null)
                          toast('Caption disimpan')
                        }}
                      >
                        Simpan caption
                      </button>
                      <button type="button" className="btn btn-outline !py-1" onClick={() => setEditing(null)}>
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="line-clamp-2 text-[12px] text-ink2">{v.caption}</p>
                )}
                <p className="mono truncate text-[11px] text-muted">
                  {v.tags.slice(0, 3).join(' ')}
                  {v.tags.length > 3 ? ` +${v.tags.length - 3}` : ''}
                </p>

                {tab === 'tayang' ? (
                  <div className="mono mt-1 flex justify-between text-[12px]">
                    <span>{num(c.viewsPerPost * v.index)} views</span>
                    <span className={v.index >= 1.5 ? 'font-semibold text-tomatotxt' : ''}>Indeks {times(v.index)}</span>
                  </div>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {v.posts.map((p, k) => (
                      <PostMark key={k} i={k} post={p} />
                    ))}
                  </div>
                )}
                {(failed || unsure) && isQueue && (
                  <div className="mt-1 flex gap-3 text-[11px]">
                    {failed && (
                      <button type="button" className="text-red underline" onClick={() => openModal({ type: 'retry', channelId: c.id })}>
                        Ulangi gagal
                      </button>
                    )}
                    {unsure && (
                      <button type="button" className="text-amber underline" onClick={() => openModal({ type: 'verify', channelId: c.id })}>
                        Pastikan status
                      </button>
                    )}
                  </div>
                )}
                {v.reusedIn && isQueue && (
                  <span className="mt-1.5 inline-block rounded-[3px] border border-amber px-1.5 text-[11px] text-amber">
                    Juga di {v.reusedIn}
                  </span>
                )}

                {tab === 'sampah' ? (
                  <div className="mt-2 text-[12px]">
                    <p className="mono mb-1.5">Dihapus permanen dalam 23 hari</p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className="btn btn-outline !py-1"
                        disabled={v.sent}
                        title={v.sent ? 'Sudah terkirim. Tidak bisa kembali ke antrean karena akan tayang dua kali.' : undefined}
                        onClick={() => toast('Video dipulihkan ke antrean')}
                      >
                        Pulihkan
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline !py-1 text-red"
                        onClick={() => openModal({ type: 'delete', count: 1 })}
                      >
                        Hapus permanen
                      </button>
                    </div>
                  </div>
                ) : (
                  isQueue && (
                    <div className="mt-2 flex gap-1">
                      {ACTIONS.map(({ icon, action }) => (
                        <button
                          key={action}
                          type="button"
                          title={action}
                          aria-label={action}
                          className="rounded-[4px] border border-line p-1 hover:bg-sand"
                          onClick={() => act(action, v)}
                        >
                          <Icon n={icon} s={13} />
                        </button>
                      ))}
                    </div>
                  )
                )}
              </article>
            )
          })}
        </div>
      )}

      {menu && (
        <div
          className="box fixed z-50 w-48 py-1 text-[13px]"
          style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 220) }}
          role="menu"
        >
          {ACTIONS.map(({ icon, action }) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-sand"
              onClick={() => act(action, menu.video)}
            >
              <Icon n={icon} s={13} />
              {action}
            </button>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-30 flex flex-wrap items-center gap-3 bg-ink px-5 py-3 text-paper md:bottom-0 md:left-[var(--sidebar-w)] md:pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <b className="mono">{selected.length} dipilih</b>
          {isQueue && (
            <>
              <BulkButton onClick={() => moveTo(selected, 1)}>Ke depan</BulkButton>
              <BulkButton onClick={() => moveTo(selected, queue.length)}>Ke belakang</BulkButton>
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault()
                  const n = parseInt(bulkPos, 10)
                  if (n >= 1) moveTo(selected, n)
                  setBulkPos('')
                }}
              >
                <input
                  className="mono !w-16 !border-paper !bg-transparent !py-1 !text-paper"
                  placeholder="No."
                  inputMode="numeric"
                  aria-label="Ke posisi"
                  value={bulkPos}
                  onChange={(e) => setBulkPos(e.target.value)}
                />
                <BulkButton type="submit">Ke posisi</BulkButton>
              </form>
            </>
          )}
          <BulkButton
            onClick={() => {
              const sent = shown.filter((v) => selected.includes(v.id) && v.sent).length
              openModal({ type: 'move', channelId: c.id, count: selected.length, sentCount: sent })
            }}
          >
            Pindah channel
          </BulkButton>
          {isQueue && <BulkButton onClick={() => trash(selected)}>Sampah</BulkButton>}
          <BulkButton onClick={() => setSelected([])}>Batal</BulkButton>
        </div>
      )}
    </div>
  )
}

function BulkButton({ children, onClick, type = 'button' }: { children: string; onClick?: () => void; type?: 'button' | 'submit' }) {
  return (
    <button type={type} className="rounded-[4px] border-[1.5px] border-paper px-3 py-1 text-[13px]" onClick={onClick}>
      {children}
    </button>
  )
}

/** Kemajuan menuju syarat monetisasi tiap platform yang dipakai channel ini. */
function MonetizationPath({ c }: { c: Channel }) {
  const programs = monetizationProgress(c)
  if (programs.length === 0) return null
  return (
    <section className="mb-8">
      <Label
        right={
          <Link to="/pengaturan" className="text-[12px] underline">
            Atur syarat
          </Link>
        }
      >
        Jalan ke monetisasi
      </Label>
      <div className="grid gap-4 md:grid-cols-3">
        {programs.map((p) => (
          <div key={p.rule.program} className="box space-y-3 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">{p.rule.program}</h3>
              <span className="mono text-[11px] text-muted">{PLATFORMS[p.rule.platform]}</span>
            </div>
            {p.all.map((q) => (
              <Requirement key={q.label} q={q} />
            ))}
            {p.anyOf.length > 0 && (
              <div className="space-y-3 border-t border-dashed border-line pt-3">
                <span className="mono block text-[10px] uppercase tracking-wider text-muted">Salah satu</span>
                {p.anyOf.map((q) => (
                  <Requirement key={q.label} q={q} />
                ))}
              </div>
            )}
            <p className={`text-[12px] ${p.eligible ? 'font-semibold text-tomatotxt' : 'text-muted'}`}>
              {p.eligible
                ? 'Syarat terpenuhi — ajukan monetisasi.'
                : p.daysToFollowers
                  ? `Syarat follower ± ${num(p.daysToFollowers)} hari lagi pada laju sekarang.`
                  : 'Belum memenuhi syarat.'}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Requirement({ q }: { q: { label: string; current: number; target: number; done: boolean } }) {
  const pct = Math.min(1, q.current / q.target)
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-[12px]">
        <span>{q.label}</span>
        <span className={`mono ${q.done ? 'font-semibold text-green' : ''}`}>
          {num(q.current)} / {num(q.target)}
        </span>
      </div>
      <div className="h-2 bg-line" aria-hidden="true">
        <div
          className="h-full"
          style={{ width: `${Math.max(pct * 100, pct > 0 ? 1 : 0)}%`, background: q.done ? 'var(--green)' : 'var(--ink)' }}
        />
      </div>
    </div>
  )
}
