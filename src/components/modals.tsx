import { useState } from 'react'
import { useApp, type DecisionChoice, type ModalState } from '../app/context'
import { num, times } from '../lib/format'
import { CHANNELS, curve, findChannel, medianCurve, PLATFORMS, stockDays, targetRatio } from '../lib/mock'
import type { Channel } from '../lib/types'
import { Monogram, StageTag } from './domain'
import { Chips, Modal } from './ui'

export function Modals({ m, close }: { m: ModalState; close: () => void }) {
  switch (m.type) {
    case 'decision':
      return <DecisionModal channel={findChannel(m.channelId)!} initial={m.choice ?? 'Pangkas'} close={close} />
    case 'schedule':
      return <ScheduleModal channel={findChannel(m.channelId)!} close={close} />
    case 'verify':
      return <VerifyModal channel={findChannel(m.channelId)!} close={close} />
    case 'retry':
      return <RetryModal close={close} />
    case 'move':
      return <MoveModal fromId={m.channelId} count={m.count} sentCount={m.sentCount} close={close} />
    case 'delete':
      return <DeleteModal count={m.count} close={close} />
    case 'auto-off':
      return <AutoOffModal close={close} />
  }
}

const DECISIONS: { choice: DecisionChoice; desc: string }[] = [
  { choice: 'Lanjutkan', desc: 'Naik ke Tumbuh atau perpanjang masa uji.' },
  { choice: 'Ubah format', desc: 'Akun tetap. Ubah hipotesis/format, jam uji mulai ulang.' },
  { choice: 'Pangkas', desc: 'Berhenti posting. Data dan akun disimpan, pindah ke Dipangkas.' },
]

function DecisionModal({ channel: c, initial, close }: { channel: Channel; initial: DecisionChoice; close: () => void }) {
  const { toast } = useApp()
  const [choice, setChoice] = useState<DecisionChoice>(initial)
  const a = curve(c, 30)
  const b = medianCurve(30)
  const mx = Math.max(...a, ...b)
  const pts = (r: number[]) => r.map((v, i) => `${(i / 29) * 400},${80 - (v / mx) * 74}`)
  const confirm = choice === 'Pangkas' ? `Pangkas ${c.name}` : choice === 'Lanjutkan' ? 'Lanjutkan eksperimen' : 'Ubah format & mulai ulang'
  return (
    <Modal
      title={`Masa uji selesai: ${c.name}`}
      onClose={close}
      wide
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={close}>
            Batal
          </button>
          <button
            type="button"
            className={`btn ${choice === 'Pangkas' ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              toast(`${c.name}: ${choice.toLowerCase()}`)
              close()
            }}
          >
            {confirm}
          </button>
        </>
      }
    >
      <p className="mono mb-4 text-[18px] font-semibold md:text-[20px]">
        Hari {c.day} · {c.vids} video · median {num(c.viewsPerPost)} views/post · target {num(c.target)} ({times(targetRatio(c))})
      </p>
      <svg viewBox="0 0 400 84" className="mb-1 h-24 w-full" role="img" aria-label={`Kurva ${c.name} dibanding median semua channel`}>
        <polygon points={[...pts(b.map((v) => v * 1.25)), ...pts(b.map((v) => v * 0.75)).reverse()].join(' ')} fill="var(--sand)" />
        <polyline points={pts(a).join(' ')} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      </svg>
      <p className="mono mb-5 text-[11px] text-muted">Garis = {c.name} · pita = median semua channel di hari yang sama</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {DECISIONS.map(({ choice: t, desc }) => (
          <button
            key={t}
            type="button"
            aria-pressed={choice === t}
            onClick={() => setChoice(t)}
            className={`box p-4 text-left ${choice === t ? '!border-[3px] !border-tomato' : ''}`}
          >
            <b className="disp block text-[20px]">{t}</b>
            <span className="text-[12px] text-ink2">{desc}</span>
            {t === 'Pangkas' && c.queue > 0 && (
              <span className="mt-2 block text-[12px] text-tomatotxt">{c.queue} video di antrean bisa dipindah ke channel lain.</span>
            )}
          </button>
        ))}
      </div>
    </Modal>
  )
}

const CAPTION_LIMIT = [5000, 2200, 2200, 63206, 500]

function ScheduleModal({ channel: c, close }: { channel: Channel; close: () => void }) {
  const { toast } = useApp()
  const usable = c.accounts.map((a) => a !== 'off')
  const [picked, setPicked] = useState(usable)
  const [when, setWhen] = useState<'Slot berikutnya (19.12 WIB)' | 'Pilih waktu'>('Slot berikutnya (19.12 WIB)')
  const [tab, setTab] = useState(usable.findIndex(Boolean))
  const [caption, setCaption] = useState(`Contoh caption ${c.niche} — simpan dulu, coba nanti.`)
  const [busy, setBusy] = useState(false)
  const limit = CAPTION_LIMIT[tab] ?? 2200
  const count = picked.filter(Boolean).length
  return (
    <Modal
      title="Jadwalkan sekarang"
      onClose={close}
      footer={
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || count === 0 || caption.length > limit}
          onClick={() => {
            setBusy(true)
            setTimeout(() => {
              toast(`Dijadwalkan ke ${count} platform`)
              close()
            }, 700)
          }}
        >
          {busy ? 'Menjadwalkan…' : 'Jadwalkan'}
        </button>
      }
    >
      <fieldset className="mb-4 grid grid-cols-2 gap-2">
        <legend className="mb-2 text-[12px] font-medium">Platform</legend>
        {PLATFORMS.map((p, i) => (
          <label key={p} className={`flex items-center gap-2 ${usable[i] ? '' : 'text-muted'}`}>
            <input
              type="checkbox"
              checked={picked[i]}
              disabled={!usable[i]}
              onChange={() => setPicked(picked.map((x, k) => (k === i ? !x : x)))}
            />
            {p}
            {!usable[i] && <span className="text-[12px]">tidak dipakai</span>}
          </label>
        ))}
      </fieldset>
      <div className="mb-3">
        <Chips options={['Slot berikutnya (19.12 WIB)', 'Pilih waktu'] as const} value={when} onChange={setWhen} />
      </div>
      {when === 'Pilih waktu' && <input type="datetime-local" className="mono mb-4" defaultValue="2026-11-23T19:30" />}
      <div className="mb-2 flex gap-4 overflow-x-auto border-b border-line">
        {PLATFORMS.map((p, i) =>
          usable[i] ? (
            <button
              key={p}
              type="button"
              onClick={() => setTab(i)}
              className={`-mb-px whitespace-nowrap border-b-2 pb-1 text-[13px] ${tab === i ? 'border-tomato font-semibold' : 'border-transparent text-muted'}`}
            >
              {p}
            </button>
          ) : null,
        )}
      </div>
      <textarea rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} aria-label="Caption" />
      <p className={`mono text-right text-[12px] ${caption.length > limit ? 'text-red' : 'text-muted'}`}>
        {num(caption.length)}/{num(limit)}
      </p>
    </Modal>
  )
}

type VerifyChoice = 'Sudah tayang' | 'Tidak ada, kirim ulang'

function VerifyModal({ channel: c, close }: { channel: Channel; close: () => void }) {
  const { toast } = useApp()
  const rows = [
    { platform: 2, video: 'video #4' },
    { platform: 2, video: 'video #9' },
  ]
  const [choices, setChoices] = useState<(VerifyChoice | null)[]>(rows.map(() => null))
  return (
    <Modal
      title="Pastikan status posting"
      onClose={close}
      footer={
        <button
          type="button"
          className="btn btn-primary"
          disabled={choices.some((x) => x === null)}
          onClick={() => {
            toast('Status disimpan')
            close()
          }}
        >
          Simpan
        </button>
      }
    >
      <p className="mb-4 rounded-[4px] border-[1.5px] border-amber p-3 text-[13px] text-amber">
        Buffer/Zernio tidak memberi jawaban pasti. Post mungkin sudah dibuat. Cek dulu sebelum mengirim ulang supaya tidak tayang dua kali.
      </p>
      {rows.map((r, i) => (
        <div key={i} className="border-b border-line py-3">
          <div className="mb-2 flex justify-between gap-3">
            <b>
              {PLATFORMS[r.platform]} · {r.video}
            </b>
            <a className="text-[13px] underline" href="#" onClick={(e) => e.preventDefault()}>
              Buka akun {PLATFORMS[r.platform]} {c.name} ↗
            </a>
          </div>
          <Chips
            options={['Sudah tayang', 'Tidak ada, kirim ulang'] as const}
            value={choices[i] ?? ('' as VerifyChoice)}
            onChange={(v) => setChoices(choices.map((x, k) => (k === i ? v : x)))}
          />
          {choices[i] === 'Sudah tayang' && <input className="mt-2" placeholder="URL post (opsional)" />}
        </div>
      ))}
    </Modal>
  )
}

type RetryChoice = 'Kirim ulang' | 'Ternyata sudah tayang' | 'Lewati'

function RetryModal({ close }: { close: () => void }) {
  const { toast } = useApp()
  const rows = ['TikTok: video terlalu pendek (min. 3 detik)', 'YouTube: channel ditangguhkan']
  const [choices, setChoices] = useState<RetryChoice[]>(rows.map(() => 'Lewati'))
  return (
    <Modal
      title="Ulangi platform gagal"
      onClose={close}
      footer={
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const n = choices.filter((x) => x === 'Kirim ulang').length
            toast(n ? `${n} platform dikirim ulang` : 'Tidak ada yang dikirim ulang')
            close()
          }}
        >
          Proses
        </button>
      }
    >
      {rows.map((t, i) => (
        <div key={t} className="border-b border-line py-3">
          <p className="mb-2 text-[13px] text-red">{t}</p>
          <Chips
            options={['Kirim ulang', 'Ternyata sudah tayang', 'Lewati'] as const}
            value={choices[i]}
            onChange={(v) => setChoices(choices.map((x, k) => (k === i ? v : x)))}
          />
        </div>
      ))}
    </Modal>
  )
}

function MoveModal({ fromId, count, sentCount, close }: { fromId: string; count: number; sentCount: number; close: () => void }) {
  const { toast } = useApp()
  const [target, setTarget] = useState<Channel | null>(null)
  const [place, setPlace] = useState<'Akhir antrean' | 'Depan antrean'>('Akhir antrean')
  const movable = count - sentCount
  const targets = CHANNELS.filter((c) => c.stage !== 'Dipangkas' && c.id !== fromId)
  return (
    <Modal
      title="Pindah channel"
      onClose={close}
      footer={
        <button
          type="button"
          className="btn btn-primary"
          disabled={!target || movable === 0}
          onClick={() => {
            toast(`${movable} video dipindah ke ${target!.name}`)
            close()
          }}
        >
          Pindahkan {movable} video
        </button>
      }
    >
      <div className="mb-4">
        {targets.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={target?.id === c.id}
            onClick={() => setTarget(c)}
            className={`flex w-full items-center gap-3 border-b border-line px-2 py-2 ${target?.id === c.id ? 'bg-sand' : 'hover:bg-sand/40'}`}
          >
            <Monogram name={c.name} s={28} />
            <span className="flex-1 text-left">{c.name}</span>
            <StageTag stage={c.stage} />
            <span className="mono w-20 text-right text-[12px]">stok {stockDays(c)} hari</span>
          </button>
        ))}
      </div>
      {sentCount > 0 && (
        <p className="mb-3 text-[13px] text-amber">{sentCount} video sudah pernah dikirim ke scheduler dan tidak ikut dipindah.</p>
      )}
      <Chips options={['Akhir antrean', 'Depan antrean'] as const} value={place} onChange={setPlace} />
    </Modal>
  )
}

function DeleteModal({ count, close }: { count: number; close: () => void }) {
  const { toast } = useApp()
  return (
    <Modal
      title={`Hapus permanen ${count} video?`}
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={close}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              toast(`${count} video dihapus permanen`)
              close()
            }}
          >
            Hapus permanen
          </button>
        </>
      }
    >
      <p>File di Cloudinary ikut terhapus. Tidak bisa dibatalkan.</p>
    </Modal>
  )
}

function AutoOffModal({ close }: { close: () => void }) {
  const { setAuto } = useApp()
  return (
    <Modal
      title="Matikan auto-posting?"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={close}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              setAuto(false)
              close()
            }}
          >
            Matikan
          </button>
        </>
      }
    >
      <p>
        Semua channel berhenti memposting sampai auto-posting dinyalakan lagi. Video yang sudah terjadwal di Buffer/Zernio tetap tayang.
      </p>
    </Modal>
  )
}
