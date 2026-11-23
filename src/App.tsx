import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { AppContext, type AppApi, type ModalState, type ToastAction } from './app/context'
import { ChannelWizard } from './components/ChannelWizard'
import { Modals } from './components/modals'
import { Shell } from './components/Shell'
import { UploadSheet } from './components/UploadSheet'
import { api, ApiError, detectMode, errorText, loadLive } from './lib/api'
import { hydrateLive, loadSample, SETTINGS, type Mode } from './lib/store'
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

// Mode demo saja: tanda masuk di browser. Mode sungguhan memakai cookie sesi httpOnly dari server.
const DEMO_SESSION_KEY = 'tk_masuk'
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

type Boot = { state: 'loading' } | { state: 'ready'; mode: Mode; reason: string } | { state: 'error'; message: string }

export default function App() {
  const [boot, setBoot] = useState<Boot>({ state: 'loading' })
  const [signedIn, setSignedIn] = useState(false)
  const [, setVersion] = useState(0)
  const [dark, setDarkState] = useState(() => readFlag(() => localStorage, DARK_KEY))
  const [auto, setAutoState] = useState(true)
  const [toasts, setToasts] = useState<{ id: number; message: string; action?: ToastAction }[]>([])
  const [modal, setModal] = useState<ModalState | null>(null)
  const [wizard, setWizard] = useState<{ channelId?: string } | null>(null)
  const [upload, setUpload] = useState<string | null>(null)
  const toastId = useRef(0)
  const location = useLocation()
  const mode: Mode = boot.state === 'ready' ? boot.mode : 'demo'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const toast = useCallback((message: string, action?: ToastAction) => {
    const id = ++toastId.current
    const wrapped = action && { label: action.label, run: () => (action.run(), setToasts((t) => t.filter((x) => x.id !== id))) }
    setToasts((t) => [...t, { id, message, action: wrapped }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  /** Ambil semua data sungguhan, isi store, render ulang. */
  const refresh = useCallback(async () => {
    hydrateLive(await loadLive())
    setAutoState(SETTINGS.autoPosting)
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const check = await detectMode()
      if (cancelled) return
      if (check.mode === 'demo') {
        loadSample()
        setSignedIn(readFlag(() => sessionStorage, DEMO_SESSION_KEY))
        setBoot({ state: 'ready', mode: 'demo', reason: check.reason })
        return
      }
      try {
        await api('auth/me')
        await refresh()
        if (!cancelled) setSignedIn(true)
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 401)) {
          if (!cancelled) setBoot({ state: 'error', message: errorText(e) })
          return
        }
      }
      if (!cancelled) setBoot({ state: 'ready', mode: 'live', reason: '' })
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const setAuto = useCallback(
    (on: boolean) => {
      if (mode === 'demo') return setAutoState(on)
      api('settings', { method: 'PUT', body: { autoPosting: on } })
        .then(() => {
          setAutoState(on)
          toast(on ? 'Auto-posting dinyalakan' : 'Auto-posting dimatikan')
        })
        .catch((e) => toast(errorText(e)))
    },
    [mode, toast],
  )

  const appApi = useMemo<AppApi>(
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
      mode,
      demoReason: boot.state === 'ready' ? boot.reason : '',
      reload: async () => {
        if (mode !== 'live') return
        try {
          await refresh()
        } catch (e) {
          toast(`Gagal memuat ulang data: ${errorText(e)}`)
        }
      },
      demoOnly: (demoMessage, feature) =>
        toast(mode === 'demo' ? demoMessage : `${feature} belum tersambung ke server — menyusul di tahap berikutnya.`),
      signOut: () => {
        if (mode === 'live') {
          api('auth/logout', { method: 'POST' }).finally(() => window.location.assign('/masuk'))
          return
        }
        try {
          sessionStorage.removeItem(DEMO_SESSION_KEY)
        } catch {
          /* abaikan */
        }
        window.location.assign('/masuk')
      },
    }),
    [toast, dark, auto, setAuto, mode, boot, refresh],
  )

  /** Mengembalikan pesan galat, atau null bila berhasil masuk. */
  const signIn = async (email: string, password: string) => {
    if (mode === 'demo') {
      writeFlag(() => sessionStorage, DEMO_SESSION_KEY, true)
      setSignedIn(true)
      return null
    }
    try {
      await api('auth/login', { method: 'POST', body: { email, password } })
      await refresh()
      setSignedIn(true)
      return null
    } catch (e) {
      return errorText(e)
    }
  }
  // Setelah masuk, route /masuk sendiri yang mengalihkan ke halaman asal. Jangan
  // memanggil navigate() di signIn: render ulang karena setSignedIn bisa lebih dulu
  // menjalankan pengalihan /masuk → "/" dan menimpa tujuan aslinya.
  const returnTo = (location.state as { from?: string } | null)?.from
  const afterSignIn = returnTo && returnTo !== '/masuk' ? returnTo : '/'

  if (boot.state === 'loading') return <Splash text="Memuat…" />
  if (boot.state === 'error') return <Splash text={`Server bermasalah: ${boot.message}`} retry />

  // Halaman publik (link-in-bio & pengalih link afiliasi) terbuka tanpa masuk dan
  // tanpa sidebar. Di mode sungguhan datanya belum punya API publik — jangan tampilkan contoh.
  if (/^\/(l|r)\//.test(location.pathname)) {
    if (mode === 'live') return <Splash text="Halaman ini belum tersedia." />
    return (
      <Routes>
        <Route path="/l/:id" element={<LinkInBio />} />
        <Route path="/r/:code" element={<AffiliateRedirect />} />
      </Routes>
    )
  }

  if (!signedIn) {
    return (
      <AppContext.Provider value={appApi}>
        <Routes>
          <Route path="/masuk" element={<Login onSignIn={signIn} mode={mode} demoReason={appApi.demoReason} />} />
          <Route path="*" element={<Navigate to="/masuk" replace state={{ from: location.pathname }} />} />
        </Routes>
      </AppContext.Provider>
    )
  }

  return (
    <AppContext.Provider value={appApi}>
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

function Splash({ text, retry }: { text: string; retry?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper p-6 text-center">
      <div>
        <p className="disp mb-2 text-[28px]">Ternak Konten</p>
        <p className="text-ink2" role="status">
          {text}
        </p>
        {retry && (
          <button type="button" className="btn btn-outline mt-4" onClick={() => window.location.reload()}>
            Coba lagi
          </button>
        )}
      </div>
    </main>
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
