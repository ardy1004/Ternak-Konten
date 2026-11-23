import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { AppContext, type AppApi, type ModalState, type ToastAction } from './app/context'
import { ChannelWizard } from './components/ChannelWizard'
import { Modals } from './components/modals'
import { Shell } from './components/Shell'
import { UploadSheet } from './components/UploadSheet'
import Bandingkan from './pages/Bandingkan'
import Channel from './pages/Channel'
import Kalender from './pages/Kalender'
import Koneksi from './pages/Koneksi'
import Lainnya from './pages/Lainnya'
import { AffiliateRedirect, LinkInBio } from './pages/LinkInBio'
import Login from './pages/Login'
import Massal from './pages/Massal'
import Pendapatan from './pages/Pendapatan'
import Pengaturan from './pages/Pengaturan'
import Ringkasan from './pages/Ringkasan'
import Workspace from './pages/Workspace'

// Sesi sementara di sisi browser — diganti cookie sesi dari backend.
const SESSION_KEY = 'tk_masuk'
const DARK_KEY = 'tk_mode_malam'

function readFlag(storage: () => Storage, key: string) {
  try {
    return storage().getItem(key) === '1'
  } catch {
    return false
  }
}
function writeFlag(storage: () => Storage, key: string, on: boolean) {
  try {
    storage().setItem(key, on ? '1' : '0')
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
}

export default function App() {
  const [signedIn, setSignedIn] = useState(() => readFlag(() => sessionStorage, SESSION_KEY))
  const [dark, setDarkState] = useState(() => readFlag(() => localStorage, DARK_KEY))
  const [auto, setAuto] = useState(true)
  const [toasts, setToasts] = useState<{ id: number; message: string; action?: ToastAction }[]>([])
  const [modal, setModal] = useState<ModalState | null>(null)
  const [wizard, setWizard] = useState<{ channelId?: string } | null>(null)
  const [upload, setUpload] = useState<string | null>(null)
  const toastId = useRef(0)
  const location = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const toast = useCallback((message: string, action?: ToastAction) => {
    const id = ++toastId.current
    const wrapped = action && { label: action.label, run: () => (action.run(), setToasts((t) => t.filter((x) => x.id !== id))) }
    setToasts((t) => [...t, { id, message, action: wrapped }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  const api = useMemo<AppApi>(
    () => ({
      toast,
      openModal: setModal,
      dark,
      setDark: (on) => {
        setDarkState(on)
        writeFlag(() => localStorage, DARK_KEY, on)
      },
      auto,
      setAuto,
      requestAuto: (on) => (on ? setAuto(true) : setModal({ type: 'auto-off' })),
      openWizard: (channelId) => setWizard({ channelId }),
      openUpload: setUpload,
    }),
    [toast, dark, auto],
  )

  // Setelah masuk, route /masuk sendiri yang mengalihkan ke halaman asal. Jangan
  // memanggil navigate() di sini: render ulang karena setSignedIn bisa lebih dulu
  // menjalankan pengalihan /masuk → "/" dan menimpa tujuan aslinya.
  const signIn = () => {
    writeFlag(() => sessionStorage, SESSION_KEY, true)
    setSignedIn(true)
  }
  const returnTo = (location.state as { from?: string } | null)?.from
  const afterSignIn = returnTo && returnTo !== '/masuk' ? returnTo : '/'

  // Halaman publik (link-in-bio & pengalih link afiliasi) terbuka tanpa masuk
  // dan tanpa sidebar — yang membukanya adalah penonton, bukan operator.
  if (/^\/(l|r)\//.test(location.pathname)) {
    return (
      <Routes>
        <Route path="/l/:id" element={<LinkInBio />} />
        <Route path="/r/:code" element={<AffiliateRedirect />} />
      </Routes>
    )
  }

  if (!signedIn) {
    return (
      <AppContext.Provider value={api}>
        <Routes>
          <Route path="/masuk" element={<Login onSignIn={signIn} />} />
          <Route path="*" element={<Navigate to="/masuk" replace state={{ from: location.pathname }} />} />
        </Routes>
      </AppContext.Provider>
    )
  }

  return (
    <AppContext.Provider value={api}>
      <Shell toasts={toasts}>
        <Routes>
          <Route path="/" element={<Ringkasan />} />
          <Route path="/channel" element={<Channel />} />
          <Route path="/channel/:id" element={<Workspace />} />
          <Route path="/unggah" element={<Massal />} />
          <Route path="/kalender" element={<Kalender />} />
          <Route path="/bandingkan" element={<Bandingkan />} />
          <Route path="/pendapatan" element={<Pendapatan />} />
          <Route path="/koneksi" element={<Koneksi />} />
          <Route path="/pengaturan" element={<Pengaturan />} />
          <Route path="/lainnya" element={<Lainnya />} />
          <Route path="/masuk" element={<Navigate to={afterSignIn} replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
      {wizard && <ChannelWizard key={wizard.channelId ?? 'baru'} channelId={wizard.channelId} onClose={() => setWizard(null)} />}
      {upload && <UploadSheet channelId={upload} onClose={() => setUpload(null)} />}
      {modal && <Modals m={modal} close={() => setModal(null)} />}
    </AppContext.Provider>
  )
}

function NotFound() {
  return (
    <div className="p-8">
      <h1 className="disp mb-4 text-[40px]">Halaman tidak ada.</h1>
      <Link to="/" className="btn btn-primary">
        Ke Ringkasan
      </Link>
    </div>
  )
}
