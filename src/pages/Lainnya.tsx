import { Link } from 'react-router'
import { useApp } from '../app/context'
import { Icon, type IconName } from '../components/Icon'
import { Label, Switch } from '../components/ui'

const ITEMS: { to: string; label: string; icon: IconName; desc: string }[] = [
  { to: '/bandingkan', label: 'Bandingkan Niche', icon: 'chart', desc: 'Kurva per umur akun, titik periksa, pola' },
  { to: '/pendapatan', label: 'Pendapatan', icon: 'coin', desc: 'Afiliasi, monetisasi platform, ROI' },
  { to: '/koneksi', label: 'Koneksi', icon: 'plug', desc: 'Buffer, Zernio, Cloudinary' },
  { to: '/pengaturan', label: 'Pengaturan', icon: 'gear', desc: 'Masa uji, biaya, syarat monetisasi' },
]

/** Menu ponsel untuk halaman yang tidak muat di bar tab bawah, plus saklar yang di desktop ada di bar atas. */
export default function Lainnya() {
  const { auto, requestAuto, dark, setDark, signOut } = useApp()
  return (
    <div className="p-5">
      <h1 className="disp mb-6 text-[40px]">Lainnya</h1>
      <nav className="mb-8 border-t-[1.5px] border-ink" aria-label="Halaman lain">
        {ITEMS.map((it) => (
          <Link key={it.to} to={it.to} className="flex items-center gap-3 border-b border-line py-3">
            <Icon n={it.icon} />
            <span className="flex-1">
              <span className="block font-medium">{it.label}</span>
              <span className="text-[12px] text-muted">{it.desc}</span>
            </span>
            <Icon n="chev" className="text-muted" />
          </Link>
        ))}
      </nav>
      <Label>Saklar</Label>
      <label className="mb-4 flex items-center gap-3">
        <Switch on={auto} onChange={requestAuto} label="Auto-posting" />
        Auto-posting <span className={`mono ${auto ? 'font-semibold' : 'text-red'}`}>{auto ? 'AKTIF' : 'MATI'}</span>
      </label>
      <label className="mb-8 flex items-center gap-3">
        <Switch on={dark} onChange={setDark} label="Mode malam" />
        Mode malam
      </label>
      <button type="button" className="btn btn-outline" onClick={signOut}>
        Keluar
      </button>
    </div>
  )
}
