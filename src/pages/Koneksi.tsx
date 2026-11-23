import { useState } from 'react'
import { Link } from 'react-router'
import type { ConnectionDTO } from '../../shared/contract'
import { useApp } from '../app/context'
import { api, errorText } from '../lib/api'
import { ConnectionSheet } from '../components/ConnectionSheet'
import { PlatGlyph } from '../components/domain'
import { Icon } from '../components/Icon'
import { Label } from '../components/ui'
import { channelsUsing, CHANNELS, CONNECTIONS, GLOBAL_STORAGE_ID, PLATFORMS, profileAt } from '../lib/store'
import type { Connection, ConnectionProvider } from '../lib/types'

type SheetState = { id?: string; provider?: ConnectionProvider } | null

/** Channel yang memakai satu akun tertaut (bisa lebih dari satu → itu masalah). */
const usersOfHandle = (platform: number, handle: string) =>
  CHANNELS.filter((c) => c.stage !== 'Dipangkas' && profileAt(c, platform)?.handle === handle)

export default function Koneksi() {
  const [sheet, setSheet] = useState<SheetState>(null)
  const scheduler = CONNECTIONS.filter((k) => k.provider !== 'Cloudinary')
  const storage = CONNECTIONS.filter((k) => k.provider === 'Cloudinary')
  const broken = CONNECTIONS.filter((k) => k.status === 'error').length
  const linked = scheduler.reduce((s, k) => s + k.profiles.length, 0)

  return (
    <div className="max-w-[1200px] p-5 md:p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="disp text-[40px] md:text-[56px]">Koneksi</h1>
          <p className="mono mt-2 text-[12px] text-ink2">
            {CONNECTIONS.length} koneksi · <span className={broken ? 'text-red' : ''}>{broken} bermasalah</span> · {linked} akun media
            sosial tertaut
          </p>
          <p className="mt-3 max-w-2xl text-[14px] text-ink2">
            Kredensial didaftarkan sekali di sini. Channel hanya memilih koneksi dan akun yang dipakainya — ganti key cukup di satu tempat.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setSheet({})}>
          <Icon n="plus" s={14} />
          Tambah koneksi
        </button>
      </div>

      <section className="mb-12">
        <Label
          right={
            <button type="button" className="chip" onClick={() => setSheet({ provider: 'Buffer' })}>
              + Buffer / Zernio
            </button>
          }
        >
          Scheduler
        </Label>
        <div className="space-y-4">
          {scheduler.length === 0 && (
            <p className="text-[13px] text-muted">Belum ada koneksi Buffer atau Zernio. Tambahkan supaya channel bisa posting.</p>
          )}
          {scheduler.map((k) => (
            <SchedulerRow key={k.id} k={k} onEdit={() => setSheet({ id: k.id })} />
          ))}
        </div>
      </section>

      <section>
        <Label
          right={
            <button type="button" className="chip" onClick={() => setSheet({ provider: 'Cloudinary' })}>
              + Cloudinary
            </button>
          }
        >
          Storage
        </Label>
        {storage.length === 0 && (
          <p className="text-[13px] text-muted">Belum ada koneksi Cloudinary. Tambahkan supaya video bisa diunggah.</p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {storage.map((k) => (
            <StorageRow key={k.id} k={k} onEdit={() => setSheet({ id: k.id })} />
          ))}
        </div>
      </section>

      {sheet && (
        <ConnectionSheet
          key={sheet.id ?? sheet.provider ?? 'baru'}
          id={sheet.id}
          provider={sheet.provider}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

function StatusLine({ k }: { k: Connection }) {
  return k.status === 'error' ? (
    <span className="flex items-center gap-1 text-[13px] text-red">
      <Icon n="alert" s={13} />
      {k.error}
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[13px] text-green">
      <Icon n="check" s={13} />
      Terhubung · dites {k.testedAt}
    </span>
  )
}

function RowActions({ k, onEdit }: { k: Connection; onEdit: () => void }) {
  const { toast, mode, reload } = useApp()
  const [busy, setBusy] = useState<'test' | 'delete' | null>(null)
  // Hapus dua langkah: klik pertama meminta konfirmasi di tombol yang sama.
  const [confirming, setConfirming] = useState(false)
  const used = channelsUsing(k.id).length
  const isGlobal = k.id === GLOBAL_STORAGE_ID
  const blocked = used > 0 || isGlobal

  const retest = async () => {
    if (mode === 'demo') return toast(`Mengetes '${k.label}'…`)
    setBusy('test')
    try {
      const r = await api<ConnectionDTO>(`connections/${k.id}/test`, { method: 'POST' })
      await reload()
      toast(r.status === 'ok' ? `'${k.label}' terhubung · ${r.profiles.length} akun tertaut` : `'${k.label}' gagal: ${r.error ?? ''}`)
    } catch (e) {
      toast(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!confirming) return setConfirming(true)
    if (mode === 'demo') {
      setConfirming(false)
      return toast(`Koneksi '${k.label}' dihapus`)
    }
    setBusy('delete')
    try {
      await api(`connections/${k.id}`, { method: 'DELETE' })
      await reload()
      toast(`Koneksi '${k.label}' dihapus`)
    } catch (e) {
      toast(errorText(e))
    } finally {
      setBusy(null)
      setConfirming(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn btn-outline !py-1" disabled={busy !== null} onClick={retest}>
        <Icon n="refresh" s={13} />
        {busy === 'test' ? 'Mengetes…' : 'Tes ulang'}
      </button>
      <button type="button" className="btn btn-outline !py-1" disabled={busy !== null} onClick={onEdit}>
        <Icon n="edit" s={13} />
        Edit
      </button>
      <button
        type="button"
        className={`btn !py-1 ${confirming ? 'btn-danger' : 'btn-outline text-red'}`}
        disabled={blocked || busy !== null}
        title={
          used > 0
            ? `Masih dipakai ${used} channel. Pindahkan dulu channelnya ke koneksi lain.`
            : isGlobal
              ? 'Ini storage global. Pilih storage global lain di Pengaturan dulu.'
              : undefined
        }
        onClick={remove}
        onBlur={() => setConfirming(false)}
      >
        <Icon n="trash" s={13} />
        {busy === 'delete' ? 'Menghapus…' : confirming ? 'Yakin hapus?' : 'Hapus'}
      </button>
    </div>
  )
}

function UsedBy({ id }: { id: string }) {
  const users = channelsUsing(id).filter((c) => c.stage !== 'Dipangkas')
  if (users.length === 0) return <span className="text-[13px] text-muted">Belum dipakai channel mana pun</span>
  return (
    <span className="text-[13px]">
      Dipakai{' '}
      {users.map((c, i) => (
        <span key={c.id}>
          {i > 0 && ', '}
          <Link to={`/channel/${c.id}`} className="underline">
            {c.name}
          </Link>
        </span>
      ))}
    </span>
  )
}

function SchedulerRow({ k, onEdit }: { k: Connection; onEdit: () => void }) {
  const [open, setOpen] = useState(k.status === 'error')
  const counts = PLATFORMS.map((_, p) => k.profiles.filter((x) => x.platform === p).length)
  return (
    <article className={`box p-4 ${k.status === 'error' ? '!border-red' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono rounded-[3px] border-[1.5px] border-ink px-1.5 text-[10px] uppercase">{k.provider}</span>
            <h2 className="disp text-[22px]">{k.label}</h2>
            <span className="mono text-[12px] text-muted">••••{k.keyHint}</span>
          </div>
          <StatusLine k={k} />
          <UsedBy id={k.id} />
        </div>
        <RowActions k={k} onEdit={onEdit} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        {counts.map((n, p) =>
          n > 0 ? (
            <span key={p} className="mono flex items-center gap-1 text-[12px]">
              <PlatGlyph i={p} />×{n}
            </span>
          ) : null,
        )}
        <button type="button" className="ml-auto text-[13px] underline" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Sembunyikan' : `Lihat ${k.profiles.length} akun tertaut`}
        </button>
      </div>
      {open && (
        <div className="scroll-x mt-3">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b-[1.5px] border-ink">
                <th className="th py-1.5">Platform</th>
                <th className="th">Akun</th>
                <th className="th">ID di {k.provider}</th>
                <th className="th">Dipakai oleh</th>
              </tr>
            </thead>
            <tbody>
              {k.profiles.map((p) => {
                const users = usersOfHandle(p.platform, p.handle)
                const owner = CHANNELS.find((c) => c.routes[p.platform]?.profileId === p.id)
                return (
                  <tr key={p.id} className="border-b border-line">
                    <td className="py-1.5">
                      <PlatGlyph i={p.platform} />
                    </td>
                    <td>{p.handle}</td>
                    <td className="mono text-[11px] text-muted">{p.id.split(':').slice(1).join('-')}</td>
                    <td>
                      {owner ? owner.name : <span className="text-muted">belum dipakai</span>}
                      {users.length > 1 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[12px] text-amber">
                          <Icon n="alert" s={12} />
                          akun ini dipakai {users.length} channel
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}

function StorageRow({ k, onEdit }: { k: Connection; onEdit: () => void }) {
  const pct = k.usage ? k.usage.used / k.usage.limit : 0
  const hot = pct >= 0.8
  return (
    <article className="box space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="disp text-[22px]">{k.label}</h2>
        {k.id === GLOBAL_STORAGE_ID && <span className="chip !py-0 !text-[11px]">Global</span>}
      </div>
      <p className="mono text-[12px] text-muted">
        {k.cloudName} · ••••{k.keyHint}
      </p>
      <StatusLine k={k} />
      {k.usage && (
        <div>
          <div className="h-2 bg-line" aria-hidden="true">
            <div className="h-full" style={{ width: `${pct * 100}%`, background: hot ? 'var(--red)' : 'var(--ink)' }} />
          </div>
          <p className={`mono mt-1 text-[12px] ${hot ? 'font-semibold text-red' : ''}`}>
            {String(k.usage.used).replace('.', ',')}/{k.usage.limit} kredit bulan ini · {Math.round(pct * 100)}%
          </p>
        </div>
      )}
      <UsedBy id={k.id} />
      <RowActions k={k} onEdit={onEdit} />
    </article>
  )
}
