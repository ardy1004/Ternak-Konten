import { useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/context'
import { ACCOUNT_LABEL, Monogram, PlatGlyph, Spark, StageGlyph, StockBar, TickBar } from '../components/domain'
import { Icon, type IconName } from '../components/Icon'
import { Label, useSort } from '../components/ui'
import { clock, num, rupiahShort, times } from '../lib/format'
import {
  CHANNELS,
  findChannel,
  liveChannels,
  NOW,
  PLATFORMS,
  recommendation,
  summary,
  targetRatio,
  UNCERTAIN,
  weekPosts,
} from '../lib/mock'
import type { Channel } from '../lib/types'

type Filter = 'siap' | 'pangkas' | 'bibit' | null

const matches = (c: Channel, f: Filter) =>
  !f || (f === 'siap' ? recommendation(c) === 'siap-panen' : f === 'pangkas' ? recommendation(c) === 'pangkas' : c.stage === 'Bibit')

const BOARD_COLS = 'grid-cols-[40px_minmax(170px,1.4fr)_100px_80px_64px_minmax(110px,1fr)_72px]'

export default function Ringkasan() {
  const [filter, setFilter] = useState<Filter>(null)
  const s = summary()
  const { sorted, sortBy, key } = useSort(
    CHANNELS.filter((c) => matches(c, filter)),
    'viewsPerPost',
  )

  const Hl = ({ f, children }: { f: Exclude<Filter, null>; children: string }) => (
    <button
      type="button"
      aria-pressed={filter === f}
      onClick={() => setFilter(filter === f ? null : f)}
      className={`underline decoration-[3px] underline-offset-[6px] ${filter === f ? 'decoration-tomato' : 'decoration-ink'}`}
    >
      {children}
    </button>
  )
  const Th = ({ k, children, right }: { k: string; children: string; right?: boolean }) => (
    <button type="button" onClick={sortBy(k)} className={`th ${right ? 'text-right' : ''} ${key === k ? '!text-ink' : ''}`}>
      {children}
      {key === k ? ' ↓' : ''}
    </button>
  )

  return (
    <div className="max-w-[1400px] p-5 md:p-8">
      <div className="mb-10 max-w-4xl">
        <h1 className="disp text-[32px] md:text-[48px]">
          Minggu ini <Hl f="siap">{`${s.ready} niche siap panen`}</Hl>, <Hl f="pangkas">{`${s.prune} layak dipangkas`}</Hl>,{' '}
          <Hl f="bibit">{`${s.seedling} masih bibit`}</Hl>.
        </h1>
        <p className="mono mt-4 text-[12px] text-ink2">
          {s.channels} channel · {s.accounts} akun · {num(s.views30)} views 30 hari · biaya {rupiahShort(s.cost)}/bln
        </p>
      </div>

      <Decisions />

      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-12 min-w-0 xl:col-span-8">
          <Label
            right={
              filter && (
                <button type="button" className="chip" onClick={() => setFilter(null)}>
                  Hapus filter <Icon n="x" s={12} />
                </button>
              )
            }
          >
            Papan Niche
          </Label>

          {/* Desktop: buku besar berperingkat. Tahap digabung ke sel channel supaya nama tidak terpotong. */}
          <div className="hidden lg:block">
            <div className={`grid ${BOARD_COLS} items-end gap-3 border-b-[1.5px] border-ink pb-2`}>
              <span />
              <Th k="stage">Channel</Th>
              <span className="th">Kurva</span>
              <Th k="viewsPerPost" right>
                Views/post
              </Th>
              <Th k="followersPerDay" right>
                Foll./hari
              </Th>
              <Th k="day">Umur uji</Th>
              <Th k="costPerMonth" right>
                Biaya/bln
              </Th>
            </div>
            {sorted.map((c, i) => (
              <Link
                key={c.id}
                to={`/channel/${c.id}`}
                className={`grid ${BOARD_COLS} items-center gap-3 border-b border-line py-3 hover:bg-sand/40`}
              >
                <span className={`mono text-[28px] font-semibold leading-none ${c.stage === 'Panen' && i === 0 ? 'text-tomatotxt' : ''}`}>
                  {i + 1}
                </span>
                <ChannelCell c={c} />
                <Spark c={c} />
                <span className="mono text-right">{num(c.viewsPerPost)}</span>
                <span className="mono text-right">{c.followersPerDay}</span>
                <span>
                  <TickBar v={c.day} max={c.dayTotal} n={20} />
                  <span className="mono text-[11px] text-muted">
                    Hari {c.day}/{c.dayTotal}
                  </span>
                </span>
                <span className="mono text-right text-[12px]">{c.costPerMonth ? rupiahShort(c.costPerMonth).replace('Rp ', '') : '—'}</span>
              </Link>
            ))}
          </div>

          {/* Ponsel & tablet: baris bertumpuk, angka utama terlihat tanpa menggeser. */}
          <div className="border-t-[1.5px] border-ink lg:hidden">
            {sorted.map((c, i) => (
              <Link key={c.id} to={`/channel/${c.id}`} className="flex gap-3 border-b border-line py-3">
                <span
                  className={`mono w-7 text-[24px] font-semibold leading-none ${c.stage === 'Panen' && i === 0 ? 'text-tomatotxt' : ''}`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <ChannelCell c={c} />
                  <div className="flex items-baseline justify-between gap-2">
                    <span>
                      <span className="mono text-[20px] font-semibold">{num(c.viewsPerPost)}</span>{' '}
                      <span className="text-[12px] text-muted">views/post</span>
                    </span>
                    <span className={`mono text-[12px] ${targetRatio(c) >= 1 ? 'font-semibold text-tomatotxt' : 'text-muted'}`}>
                      {times(targetRatio(c))} target
                    </span>
                  </div>
                  <TickBar v={c.day} max={c.dayTotal} n={24} />
                  <div className="mono flex justify-between text-[11px] text-muted">
                    <span>
                      Hari {c.day}/{c.dayTotal}
                    </span>
                    <span>{c.costPerMonth ? `${rupiahShort(c.costPerMonth)}/bln` : '—'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="col-span-12 grid gap-8 sm:grid-cols-2 xl:col-span-4 xl:block xl:space-y-8">
          <NeedsAction />
          <div>
            <Label>Stok antrean</Label>
            <div className="space-y-2.5">
              {liveChannels().map((c) => (
                <StockBar key={c.id} c={c} />
              ))}
            </div>
          </div>
          <UpNext />
        </aside>
      </div>

      <HealthGrid />
    </div>
  )
}

function ChannelCell({ c }: { c: Channel }) {
  const gone = c.stage === 'Dipangkas'
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Monogram name={c.name} ink={c.stage === 'Panen'} />
      <span className="min-w-0">
        <span className={`block truncate font-semibold ${gone ? 'text-gray line-through' : ''}`}>{c.name}</span>
        <span className="flex items-center gap-1.5 text-[12px] text-muted">
          <StageGlyph stage={c.stage} s={11} />
          {c.stage} · {c.niche}
        </span>
      </span>
    </span>
  )
}

function Decisions() {
  const { openModal, toast } = useApp()
  const rows = CHANNELS.map((c) => ({ c, rec: recommendation(c) })).filter((r) => r.rec)
  if (rows.length === 0) return null
  return (
    <section className="mb-10">
      <Label>Keputusan menunggu ({rows.length})</Label>
      <div className="divide-y divide-line border-y-[1.5px] border-ink">
        {rows.map(({ c, rec }) =>
          rec === 'pangkas' ? (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="text-[14px]">
                Masa uji <b>{c.name}</b> selesai — median {num(c.viewsPerPost)} views/post, target {num(c.target)}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => openModal({ type: 'decision', channelId: c.id, choice: 'Lanjutkan' })}
                >
                  Lanjutkan
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => openModal({ type: 'decision', channelId: c.id, choice: 'Ubah format' })}
                >
                  Ubah format
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => openModal({ type: 'decision', channelId: c.id, choice: 'Pangkas' })}
                >
                  Pangkas
                </button>
              </div>
            </div>
          ) : (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="text-[14px]">
                <b>{c.name}</b> di atas target ({times(targetRatio(c))}) di hari ke-{c.day}. Naikkan ke Panen?
              </span>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" onClick={() => toast(`${c.name} naik ke Panen`)}>
                  Naikkan ke Panen
                </button>
                <button type="button" className="btn btn-outline" onClick={() => toast(`${c.name} tetap di ${c.stage}`)}>
                  Tunggu dulu
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  )
}

interface ActionItem {
  icon: IconName
  tone: string
  text: string
  action: string
  to?: string
  onClick?: () => void
}

function NeedsAction() {
  const { openModal } = useApp()
  const items: ActionItem[] = []
  CHANNELS.forEach((c) => {
    c.accounts.forEach((a, i) => {
      if (a === 'fail')
        items.push({
          icon: 'alert',
          tone: 'text-red',
          text: `${PLATFORMS[i]} '${c.name}' gagal tayang`,
          action: 'Lihat',
          to: `/channel/${c.id}`,
        })
      if (a === 'login')
        items.push({
          icon: 'link',
          tone: 'text-red',
          text: `Login ${PLATFORMS[i]} '${c.name}' kedaluwarsa`,
          action: 'Sambungkan',
          to: `/channel/${c.id}`,
        })
    })
    if (!c.schedulerReady && c.stage !== 'Dipangkas')
      items.push({
        icon: 'alert',
        tone: 'text-red',
        text: `Scheduler '${c.name}' kosong, posting terblokir`,
        action: 'Atur',
        to: `/channel/${c.id}`,
      })
  })
  UNCERTAIN.forEach((u) =>
    items.push({
      icon: 'clock',
      tone: 'text-amber',
      text: `${PLATFORMS[u.platform]} '${findChannel(u.channelId)?.name}' belum pasti (${u.count})`,
      action: 'Pastikan',
      onClick: () => openModal({ type: 'verify', channelId: u.channelId }),
    }),
  )
  return (
    <div>
      <Label>Perlu tindakan</Label>
      {items.map((it) => (
        <div key={it.text} className="flex items-start gap-2 border-b border-line py-2 text-[13px]">
          <Icon n={it.icon} className={`mt-0.5 ${it.tone}`} />
          <span className="flex-1">{it.text}</span>
          {it.to ? (
            <Link to={it.to} className="font-medium underline">
              {it.action}
            </Link>
          ) : (
            <button type="button" className="font-medium underline" onClick={it.onClick}>
              {it.action}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function UpNext() {
  const nowMin = NOW.h * 60 + NOW.m
  const next = weekPosts()
    .filter((p) => p.day === NOW.day && p.h * 60 + p.m > nowMin)
    .sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))
    .slice(0, 5)
  return (
    <div>
      <Label>Berikutnya</Label>
      {next.length === 0 && <p className="text-[13px] text-muted">Tidak ada post lagi hari ini.</p>}
      {next.map((p) => (
        <div key={p.id} className="flex items-center gap-3 border-b border-line py-2">
          <span className="mono w-12">{clock(p.h, p.m)}</span>
          <span className="flex-1 truncate">{p.channel.name}</span>
          <span className="flex gap-1">
            {p.platforms.map((i) => (
              <PlatGlyph key={i} i={i} />
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}

function HealthGrid() {
  return (
    <section className="mt-12">
      <Label>Kesehatan akun</Label>
      <div className="scroll-x">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead>
            <tr className="border-b-[1.5px] border-ink">
              <th className="th py-2">Channel</th>
              {PLATFORMS.map((p) => (
                <th key={p} className="th">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {liveChannels().map((c) => (
              <tr key={c.id} className="border-b border-line">
                <td className="py-2.5 font-medium">
                  <span className="flex items-center gap-2">
                    <StageGlyph stage={c.stage} s={12} />
                    {c.name}
                  </span>
                </td>
                {c.accounts.map((a, i) => {
                  const st = ACCOUNT_LABEL[a]
                  return (
                    <td key={i}>
                      {a === 'off' ? (
                        <span className="text-muted" title="Tidak dipakai">
                          —
                        </span>
                      ) : (
                        <div className="leading-tight">
                          <span className="flex items-center gap-1" style={{ color: st.color }}>
                            {st.icon && <Icon n={st.icon} s={13} />}
                            {st.label}
                          </span>
                          <span className="mono text-[11px] text-muted">
                            {c.providers[i]} · {c.lastPost[i]}
                          </span>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
