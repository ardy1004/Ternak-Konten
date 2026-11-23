import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useApp } from '../app/context'
import { useChannelAuto } from '../app/hooks'
import { Monogram, PlatGlyph, Poster, StageGlyph, StageTag, TickBar } from '../components/domain'
import { Icon } from '../components/Icon'
import { Seg, Switch, useSort } from '../components/ui'
import { num, rupiahShort, times } from '../lib/format'
import { CHANNELS, problems, revenueOf, roi, stockDays, targetRatio, usesGlobalStorage } from '../lib/store'
import type { Channel as Ch, Stage } from '../lib/types'

const STAGES: Stage[] = ['Bibit', 'Tumbuh', 'Panen', 'Dipangkas']
const MENU = ['Edit', 'Jeda', 'Salin pengaturan', 'Ubah tahap', 'Hapus'] as const

function ChannelCard({ c }: { c: Ch }) {
  const { openWizard, openModal, demoOnly } = useApp()
  const [menu, setMenu] = useState(false)
  const [auto, setAuto] = useChannelAuto(c)
  const gone = c.stage === 'Dipangkas'
  const days = stockDays(c)
  const r = targetRatio(c)
  const issues = problems(c)
  const money = roi(c)
  const income = revenueOf(c.id).total
  return (
    <article className="box relative overflow-hidden">
      <Link to={`/channel/${c.id}`} className="grid w-full grid-cols-3" aria-label={`Buka ${c.name}`}>
        {[0, 1, 2].map((i) => (
          <Poster key={i} hue={c.hue + i * 3} gray={gone} />
        ))}
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2.5">
          <Monogram name={c.name} />
          <div className="min-w-0">
            <h3 className={`disp text-[20px] ${gone ? 'text-gray line-through' : ''}`}>
              <Link to={`/channel/${c.id}`}>{c.name}</Link>
            </h3>
            <div className="text-[12px] text-muted">
              {c.niche} · {c.format}
            </div>
          </div>
        </div>
        <p className="text-[13px] italic text-ink2">{c.hypothesis}</p>
        {gone ? (
          <p className="mono text-[12px]">
            Berhenti di hari {c.day} · {num(c.viewsPerPost)} views/post
          </p>
        ) : (
          <>
            <div>
              <div className="mono mb-1 text-[11px]">
                Hari {c.day}/{c.dayTotal} · {c.vids}/{c.vidsTotal} video
              </div>
              <TickBar v={c.day} max={c.dayTotal} />
            </div>
            <div className="flex items-baseline justify-between">
              <span>
                <span className="mono text-[22px] font-semibold">{num(c.viewsPerPost)}</span>{' '}
                <span className="text-[12px] text-muted">views/post</span>
              </span>
              <span className={`mono text-[13px] ${r >= 1 ? 'font-semibold text-tomatotxt' : 'text-muted'}`}>{times(r)} target</span>
            </div>
            <div className="mono flex justify-between text-[12px]">
              <span className={days <= 2 ? 'font-semibold text-red' : ''}>{days === 0 ? 'Stok kosong' : `Stok ${days} hari`}</span>
              <span title={`Pendapatan bulan ini Rp ${num(income)}`}>
                ROI{' '}
                <span className={money !== null && money >= 1 ? 'font-semibold text-tomatotxt' : ''}>
                  {money === null ? '—' : times(money)}
                </span>
              </span>
            </div>
          </>
        )}
        <div className="flex gap-1.5">
          {c.accounts.map((s, i) => (
            <PlatGlyph key={i} i={i} state={s} />
          ))}
        </div>
        {(issues.length > 0 || usesGlobalStorage(c)) && !gone && (
          <div className="space-y-0.5 text-[12px]">
            {issues.map((p) => (
              <div key={p} className="flex items-center gap-1 text-red">
                <Icon n="alert" s={12} />
                {p}
              </div>
            ))}
            {usesGlobalStorage(c) && <div className="text-muted">Storage global</div>}
          </div>
        )}
        {!gone && (
          <div className="flex items-center justify-between border-t border-line pt-3">
            <span className="flex items-center gap-2 text-[12px]">
              <Switch on={auto} onChange={setAuto} label={`Auto ${c.name}`} />
              Auto
            </span>
            <div className="relative">
              <button type="button" onClick={() => setMenu(!menu)} aria-label={`Menu ${c.name}`} aria-expanded={menu}>
                <Icon n="more" />
              </button>
              {menu && (
                <div className="box absolute bottom-7 right-0 z-10 w-44 py-1 text-[13px]" role="menu">
                  {MENU.map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="menuitem"
                      className={`block w-full px-3 py-1.5 text-left hover:bg-sand ${m === 'Hapus' ? 'text-red' : ''}`}
                      onClick={() => {
                        setMenu(false)
                        if (m === 'Edit') openWizard(c.id)
                        else if (m === 'Jeda') setAuto(false)
                        else if (m === 'Hapus') openModal({ type: 'delete-channel', channelId: c.id })
                        else demoOnly(`${m}: ${c.name}`, m)
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

export default function Channel() {
  const { openWizard } = useApp()
  const navigate = useNavigate()
  const [view, setView] = useState<'Papan' | 'Tabel'>('Papan')
  const [q, setQ] = useState('')
  const list = CHANNELS.filter((c) => (c.name + c.niche).toLowerCase().includes(q.toLowerCase()))
  const { sorted, sortBy } = useSort(
    list.map((c) => ({ ...c, roi: roi(c) ?? -1 })),
    'viewsPerPost',
  )
  const count = (s: Stage) => CHANNELS.filter((c) => c.stage === s).length
  return (
    <div className="p-5 md:p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="disp text-[40px] md:text-[56px]">Channel</h1>
          <p className="mono mt-2 text-[12px] text-ink2">
            {CHANNELS.length} channel · {STAGES.map((s) => `${count(s)} ${s.toLowerCase()}`).join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Seg options={['Papan', 'Tabel'] as const} value={view} onChange={setView} label="Tampilan" />
          <input className="!w-48" placeholder="Cari channel…" aria-label="Cari channel" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="btn btn-primary" onClick={() => openWizard()}>
            <Icon n="plus" s={14} />
            Tambah Channel
          </button>
        </div>
      </div>

      {view === 'Papan' ? (
        <div className="scroll-x pb-4">
          <div className="grid min-w-[1000px] grid-cols-[repeat(4,minmax(240px,1fr))] gap-5">
            {STAGES.map((s) => (
              <div key={s} className="space-y-4">
                <div className="flex items-center gap-2 border-b-[1.5px] border-ink pb-2">
                  <StageGlyph stage={s} />
                  <span className="font-semibold">{s}</span>
                  <span className="mono text-muted">{count(s)}</span>
                </div>
                {list
                  .filter((c) => c.stage === s)
                  .map((c) => (
                    <ChannelCard key={c.id} c={c} />
                  ))}
                {count(s) === 0 && <p className="text-[13px] text-muted">Belum ada channel.</p>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="scroll-x">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="border-b-[1.5px] border-ink">
                {(
                  [
                    ['name', 'Channel'],
                    ['stage', 'Tahap'],
                    ['day', 'Hari'],
                    ['vids', 'Video'],
                    ['viewsPerPost', 'Views/post'],
                    ['followersPerDay', 'Foll./hari'],
                    ['queue', 'Stok'],
                    ['costPerMonth', 'Biaya'],
                    ['roi', 'ROI'],
                  ] as const
                ).map(([k, l]) => (
                  <th key={k} className="th py-2">
                    <button type="button" onClick={sortBy(k)}>
                      {l}
                    </button>
                  </th>
                ))}
                <th className="th">Platform</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const days = stockDays(c)
                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b border-line hover:bg-sand/40"
                    onClick={() => navigate(`/channel/${c.id}`)}
                  >
                    <td className="py-2.5">
                      <Link to={`/channel/${c.id}`} className="flex items-center gap-2">
                        <Monogram name={c.name} s={26} />
                        <span className={c.stage === 'Dipangkas' ? 'text-gray line-through' : 'font-medium'}>{c.name}</span>
                      </Link>
                    </td>
                    <td>
                      <StageTag stage={c.stage} />
                    </td>
                    <td className="mono">
                      {c.day}/{c.dayTotal}
                    </td>
                    <td className="mono">
                      {c.vids}/{c.vidsTotal}
                    </td>
                    <td className="mono">{num(c.viewsPerPost)}</td>
                    <td className="mono">{c.followersPerDay}</td>
                    <td className={`mono ${days <= 2 && c.stage !== 'Dipangkas' ? 'text-red' : ''}`}>{days} hari</td>
                    <td className="mono">{c.costPerMonth ? rupiahShort(c.costPerMonth) : '—'}</td>
                    <td className={`mono ${c.roi >= 1 ? 'font-semibold text-tomatotxt' : ''}`}>{c.roi < 0 ? '—' : times(c.roi)}</td>
                    <td>
                      <span className="flex gap-1">
                        {c.accounts.map((s, i) => (
                          <PlatGlyph key={i} i={i} state={s} />
                        ))}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
