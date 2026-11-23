import { useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/context'
import { StageGlyph, TickBar } from '../components/domain'
import { Icon } from '../components/Icon'
import { Field, Label, Seg, Sheet } from '../components/ui'
import { num, rupiahShort, times } from '../lib/format'
import {
  CHANNELS,
  channelOfCode,
  clicksOf,
  CURRENT_MONTH,
  findChannel,
  IMPORT_PREVIEW,
  LINKS,
  liveChannels,
  monetizationProgress,
  moneySummary,
  MONTH_LABEL,
  PLATFORMS,
  PREVIOUS_MONTH,
  revenueOf,
  roi,
} from '../lib/mock'

export default function Pendapatan() {
  const { openModal } = useApp()
  const [importing, setImporting] = useState(false)
  const [addingLink, setAddingLink] = useState(false)
  const m = moneySummary()
  const prev = moneySummary(PREVIOUS_MONTH)
  const rows = CHANNELS.map((c) => ({
    c,
    ...revenueOf(c.id),
    prev: revenueOf(c.id, PREVIOUS_MONTH).total,
    roi: roi(c),
    clicks: clicksOf(c.id),
  })).sort((a, b) => (b.roi ?? -1) - (a.roi ?? -1))
  const maxRoi = Math.max(1, ...rows.map((r) => r.roi ?? 0))

  return (
    <div className="max-w-[1300px] p-5 md:p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="disp text-[32px] md:text-[48px]">
            {MONTH_LABEL[CURRENT_MONTH]}: {rupiahShort(m.revenue)} masuk, ROI{' '}
            <span className={(m.roi ?? 0) >= 1 ? 'text-tomatotxt' : ''}>{times(m.roi ?? 0)}</span>.
          </h1>
          <p className="mono mt-4 text-[12px] text-ink2">
            afiliasi Rp {num(m.affiliate)} · monetisasi platform Rp {num(m.platform)} · biaya Rp {num(m.cost)} · bulan lalu Rp{' '}
            {num(prev.revenue)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => openModal({ type: 'revenue' })}>
            <Icon n="plus" s={14} />
            Catat pendapatan
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setImporting(true)}>
            <Icon n="upload" s={14} />
            Impor komisi CSV
          </button>
        </div>
      </div>

      <section className="mb-12">
        <Label>Per channel</Label>
        <div className="scroll-x">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="border-b-[1.5px] border-ink">
                <th className="th py-2">Channel</th>
                <th className="th text-right">Afiliasi</th>
                <th className="th text-right">Monetisasi</th>
                <th className="th text-right">Total</th>
                <th className="th text-right">vs bulan lalu</th>
                <th className="th text-right">Biaya</th>
                <th className="th pl-6">ROI</th>
                <th className="th text-right">Klik 30 hari</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, affiliate, platform, total, prev: before, roi: r, clicks }) => {
                const delta = before > 0 ? (total - before) / before : null
                return (
                  <tr key={c.id} className="border-b border-line">
                    <td className="py-2.5">
                      <Link
                        to={`/channel/${c.id}`}
                        className={`flex items-center gap-2 font-medium ${c.stage === 'Dipangkas' ? 'text-gray line-through' : ''}`}
                      >
                        <StageGlyph stage={c.stage} s={12} />
                        {c.name}
                      </Link>
                    </td>
                    <td className="mono text-right">{affiliate ? num(affiliate) : '—'}</td>
                    <td className="mono text-right">{platform ? num(platform) : '—'}</td>
                    <td className="mono text-right font-semibold">{total ? num(total) : '—'}</td>
                    <td className={`mono text-right text-[12px] ${delta === null ? 'text-muted' : delta >= 0 ? 'text-green' : 'text-red'}`}>
                      {delta === null ? (total ? 'baru' : '—') : `${delta >= 0 ? '+' : ''}${Math.round(delta * 100)}%`}
                    </td>
                    <td className="mono text-right">{c.costPerMonth ? num(c.costPerMonth) : '—'}</td>
                    <td className="pl-6">
                      {r === null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-24 bg-line" aria-hidden="true">
                            <span
                              className="block h-full"
                              style={{ width: `${(r / maxRoi) * 100}%`, background: r >= 1 ? 'var(--tomato)' : 'var(--ink)' }}
                            />
                          </span>
                          <span className={`mono ${r >= 1 ? 'font-semibold text-tomatotxt' : ''}`}>{times(r)}</span>
                        </span>
                      )}
                    </td>
                    <td className="mono text-right">{clicks ? num(clicks) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-[12px] text-muted">
          ROI = pendapatan bulan berjalan ÷ biaya per bulan. Komisi afiliasi bisa masih tertunda sampai pesanan selesai, jadi angka bulan
          berjalan masih bisa berubah.
        </p>
      </section>

      <section className="mb-12">
        <Label
          right={
            <button type="button" className="chip" onClick={() => setAddingLink(true)}>
              + Tambah link
            </button>
          }
        >
          Link afiliasi
        </Label>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-muted">Halaman link-in-bio:</span>
          {liveChannels()
            .filter((c) => LINKS.some((l) => l.channelId === c.id))
            .map((c) => (
              <a key={c.id} href={`/l/${c.id}`} target="_blank" rel="noreferrer" className="chip mono">
                /l/{c.id} <Icon n="ext" s={11} />
              </a>
            ))}
        </div>
        <div className="scroll-x">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b-[1.5px] border-ink">
                <th className="th py-2">Produk</th>
                <th className="th">Channel</th>
                <th className="th">Program</th>
                <th className="th">Link pendek / Sub ID</th>
                <th className="th text-right">Klik 30 hari</th>
              </tr>
            </thead>
            <tbody>
              {[...LINKS]
                .sort((a, b) => b.clicks30 - a.clicks30)
                .map((l) => (
                  <tr key={l.id} className="border-b border-line">
                    <td className="py-2.5 font-medium">{l.title}</td>
                    <td>{findChannel(l.channelId)?.name}</td>
                    <td>{l.program}</td>
                    <td>
                      <CopyCode code={l.code} />
                    </td>
                    <td className="mono text-right">{num(l.clicks30)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-[12px] text-muted">
          Link di caption umumnya tidak bisa diklik, jadi penonton masuk lewat link di bio. Setiap klik lewat /r/kode tercatat, dan kode
          yang sama dipasang sebagai Sub ID di program afiliasi supaya komisi bisa dicocokkan ke channel.
        </p>
      </section>

      <MonetizationOverview />

      {importing && <ImportSheet onClose={() => setImporting(false)} />}
      {addingLink && <LinkSheet onClose={() => setAddingLink(false)} />}
    </div>
  )
}

function CopyCode({ code }: { code: string }) {
  const { toast } = useApp()
  return (
    <button
      type="button"
      className="mono inline-flex items-center gap-1.5 text-[12px] hover:underline"
      title="Salin link pendek"
      onClick={() => {
        navigator.clipboard?.writeText(`${location.origin}/r/${code}`).catch(() => undefined)
        toast('Link disalin')
      }}
    >
      /r/{code}
      <Icon n="copy" s={12} />
    </button>
  )
}

/** Program mana yang paling dekat dicapai, lintas channel. Rincian ada di ruang kerja tiap channel. */
function MonetizationOverview() {
  const rows = liveChannels()
    .flatMap((c) =>
      monetizationProgress(c).map((p) => {
        const pct = (q: { current: number; target: number }) => Math.min(1, q.current / q.target)
        const need = Math.min(...p.all.map(pct), p.anyOf.length ? Math.max(...p.anyOf.map(pct)) : 1)
        return { c, p, need }
      }),
    )
    .sort((a, b) => b.need - a.need)
    .slice(0, 8)
  return (
    <section>
      <Label>Jalan ke monetisasi — paling dekat</Label>
      <div className="divide-y divide-line border-y-[1.5px] border-ink">
        {rows.map(({ c, p, need }) => (
          <Link
            key={c.id + p.rule.program}
            to={`/channel/${c.id}`}
            className="block py-2.5 hover:bg-sand/40 md:grid md:grid-cols-[200px_220px_1fr_60px] md:items-center md:gap-3"
          >
            <span className="flex justify-between gap-2 md:block">
              <span className="font-medium">{c.name}</span>
              <span className="mono text-[13px] md:hidden">{p.eligible ? 'Layak' : `${Math.round(need * 100)}%`}</span>
            </span>
            <span className="block text-[13px] text-muted">
              {PLATFORMS[p.rule.platform]} · {p.rule.program}
            </span>
            <span className="mt-1.5 block md:mt-0">
              <TickBar v={need} max={1} n={30} />
            </span>
            <span className="mono hidden text-right text-[13px] md:block">{p.eligible ? 'Layak' : `${Math.round(need * 100)}%`}</span>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-muted">
        Persentase = syarat yang paling jauh tertinggal. Syarat tiap program diatur di Pengaturan → Syarat monetisasi.
      </p>
    </section>
  )
}

function ImportSheet({ onClose }: { onClose: () => void }) {
  const { toast } = useApp()
  const [program, setProgram] = useState<'Shopee Affiliate' | 'TikTok Shop'>('Shopee Affiliate')
  const [loaded, setLoaded] = useState(false)
  const [assign, setAssign] = useState<Record<number, string>>({})
  const rows = IMPORT_PREVIEW.map((r, i) => ({ ...r, channel: channelOfCode(r.subId)?.id ?? assign[i] ?? '' }))
  const unknown = rows.filter((r) => !r.channel).length
  const total = rows.reduce((s, r) => s + r.commission, 0)
  return (
    <Sheet
      title="Impor komisi CSV"
      width={640}
      onClose={onClose}
      footer={
        <>
          {loaded && unknown > 0 && <span className="text-[12px] text-amber">{unknown} baris belum punya channel</span>}
          <button
            type="button"
            className="btn btn-primary ml-auto"
            disabled={!loaded || unknown > 0}
            onClick={() => {
              toast(`${rows.length} baris komisi diimpor (Rp ${num(total)})`)
              onClose()
            }}
          >
            Impor {loaded ? rows.length : ''} baris
          </button>
        </>
      }
    >
      <Field label="Program">
        <Seg options={['Shopee Affiliate', 'TikTok Shop'] as const} value={program} onChange={setProgram} label="Program afiliasi" />
      </Field>
      <label className="mb-5 block cursor-pointer rounded-[6px] border-2 border-dashed border-ink p-6 text-center">
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onClick={(e) => {
            // Selama impor sungguhan belum tersambung, klik memuat contoh laporan.
            e.preventDefault()
            setLoaded(true)
          }}
        />
        <Icon n="upload" s={22} className="mx-auto mb-2" />
        <span className="block font-semibold">Pilih file laporan {program}</span>
        <span className="mono block text-[12px] text-muted">Ekspor laporan konversi/komisi dari dashboard program, format CSV</span>
      </label>
      {loaded && (
        <>
          <p className="mb-3 text-[12px] text-muted">
            Channel dikenali dari Sub ID (= kode link pendek). Baris dengan Sub ID asing perlu dipilih channelnya.
          </p>
          <div className="scroll-x">
            <table className="w-full min-w-[520px] text-[12px]">
              <thead>
                <tr className="border-b-[1.5px] border-ink">
                  <th className="th py-1.5">Tanggal</th>
                  <th className="th">Produk</th>
                  <th className="th">Sub ID</th>
                  <th className="th text-right">Komisi</th>
                  <th className="th pl-3">Channel</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-line">
                    <td className="mono py-1.5">{r.date}</td>
                    <td>{r.product}</td>
                    <td className="mono">{r.subId}</td>
                    <td className="mono text-right">{num(r.commission)}</td>
                    <td className="pl-3">
                      {channelOfCode(r.subId) ? (
                        channelOfCode(r.subId)!.name
                      ) : (
                        <select
                          className="!py-0.5 !text-[12px]"
                          value={assign[i] ?? ''}
                          onChange={(e) => setAssign({ ...assign, [i]: e.target.value })}
                          aria-label="Pilih channel"
                        >
                          <option value="">Tidak dikenali…</option>
                          {CHANNELS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mono mt-3 text-[13px] font-semibold">Total Rp {num(total)}</p>
        </>
      )}
    </Sheet>
  )
}

function LinkSheet({ onClose }: { onClose: () => void }) {
  const { toast } = useApp()
  const live = liveChannels()
  const [channelId, setChannelId] = useState(live[0].id)
  const [title, setTitle] = useState('')
  const prefix = channelId
    .split('-')
    .map((w) => w[0])
    .join('')
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 2)
    .join('-')
  const code = `${prefix}-${slug || 'produk'}`
  return (
    <Sheet
      title="Tambah link afiliasi"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn-primary ml-auto"
          disabled={!title.trim()}
          onClick={() => {
            toast(`Link /r/${code} dibuat`)
            onClose()
          }}
        >
          Simpan link
        </button>
      }
    >
      <Field label="Channel">
        <select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
          {live.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nama produk">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wajan anti lengket 28 cm" />
      </Field>
      <Field label="Program">
        <select>
          <option>Shopee Affiliate</option>
          <option>TikTok Shop</option>
          <option>Lainnya</option>
        </select>
      </Field>
      <Field
        label="URL afiliasi asli"
        hint="Link dari dashboard program afiliasi. Penonton tidak melihat URL ini — mereka melihat link pendek."
      >
        <input className="mono" placeholder="https://…" />
      </Field>
      <div className="box p-3 text-[13px]">
        Link pendek: <span className="mono font-semibold">/r/{code}</span>
        <span className="mt-1 block text-[12px] text-muted">
          Pasang “{code}” sebagai Sub ID saat membuat link di program afiliasi, supaya laporan komisinya cocok otomatis.
        </span>
      </div>
    </Sheet>
  )
}
