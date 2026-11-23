import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useMatch, useNavigate } from 'react-router'
import { useApp, type ToastAction } from '../app/context'
import { actionCount, CHANNELS, findChannel, liveChannels, problems } from '../lib/mock'
import { StageGlyph } from './domain'
import { Icon, type IconName } from './Icon'
import { Switch } from './ui'

export const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Ringkasan', icon: 'home' },
  { to: '/channel', label: 'Channel', icon: 'grid' },
  { to: '/unggah', label: 'Unggah Massal', icon: 'upload' },
  { to: '/kalender', label: 'Kalender', icon: 'cal' },
  { to: '/bandingkan', label: 'Bandingkan Niche', icon: 'chart' },
  { to: '/pengaturan', label: 'Pengaturan', icon: 'gear' },
]

const RAIL_KEY = 'tk_sidebar_ciut'

function readRail() {
  try {
    return localStorage.getItem(RAIL_KEY) === '1'
  } catch {
    return false
  }
}

export function Shell({ children, toasts }: { children: ReactNode; toasts: { id: number; message: string; action?: ToastAction }[] }) {
  const [rail, setRail] = useState(readRail)
  const toggleRail = () => {
    const next = !rail
    setRail(next)
    try {
      localStorage.setItem(RAIL_KEY, next ? '1' : '0')
    } catch {
      /* penyimpanan browser tidak tersedia — cukup untuk sesi ini */
    }
  }
  return (
    <div className={`shell min-h-screen bg-paper text-ink ${rail ? 'rail' : ''}`}>
      <Sidebar onToggle={toggleRail} />
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 md:pl-[var(--sidebar-w)]">
        <TopBar />
        <main>{children}</main>
      </div>
      <MobileTabBar />
      <div
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-5 z-[60] space-y-2 md:bottom-5"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-4 rounded-[4px] bg-ink px-4 py-3 text-[13px] text-paper">
            {t.message}
            {t.action && (
              <button type="button" className="font-medium underline" onClick={t.action.run}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Sidebar({ onToggle }: { onToggle: () => void }) {
  const [showPruned, setShowPruned] = useState(false)
  const pruned = CHANNELS.filter((c) => c.stage === 'Dipangkas')
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `flex w-full items-center gap-3 rounded-[4px] px-2.5 py-2 ${isActive ? 'bg-ink text-paper' : 'hover:bg-sand'}`
  const chCls = ({ isActive }: { isActive: boolean }) =>
    `flex w-full items-center gap-2 py-1.5 text-left text-[13px] ${isActive ? 'font-semibold' : ''}`
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[var(--sidebar-w)] flex-col overflow-y-auto border-r-[1.5px] border-ink bg-paper md:flex">
      <div className="flex items-center justify-between p-4">
        <span className="disp wide-only text-[22px]">Ternak Konten</span>
        <button type="button" onClick={onToggle} aria-label="Ciutkan atau lebarkan sidebar">
          <Icon n="menu" />
        </button>
      </div>
      <nav className="space-y-0.5 px-2" aria-label="Navigasi utama">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} title={n.label} className={navCls}>
            <Icon n={n.icon} />
            <span className="wide-only">{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="wide-only mt-6 px-4">
        <div className="mono mb-2 text-[11px] uppercase tracking-[0.14em] text-muted">Channel</div>
        {liveChannels().map((c) => (
          <NavLink key={c.id} to={`/channel/${c.id}`} className={chCls}>
            <StageGlyph stage={c.stage} />
            <span className="flex-1 truncate">{c.name}</span>
            {problems(c).length > 0 && <span className="h-2 w-2 rounded-full bg-red" title="Ada masalah" />}
          </NavLink>
        ))}
        {pruned.length > 0 && (
          <>
            <button
              type="button"
              className="py-1.5 text-[13px] text-muted"
              aria-expanded={showPruned}
              onClick={() => setShowPruned(!showPruned)}
            >
              Dipangkas ({pruned.length}) {showPruned ? '▾' : '▸'}
            </button>
            {showPruned &&
              pruned.map((c) => (
                <NavLink key={c.id} to={`/channel/${c.id}`} className="flex items-center gap-2 py-1 pl-2 text-[13px]">
                  <StageGlyph stage="Dipangkas" />
                  <span className="text-gray line-through">{c.name}</span>
                </NavLink>
              ))}
          </>
        )}
      </div>
    </aside>
  )
}

function pageTitle(path: string) {
  if (path.startsWith('/channel/')) return findChannel(path.split('/')[2])?.name ?? 'Channel'
  return NAV.find((n) => (n.to === '/' ? path === '/' : path.startsWith(n.to)))?.label ?? ''
}

function TopBar() {
  const { auto, requestAuto, openUpload } = useApp()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const onChannel = useMatch('/channel/:id')
  const issueCount = actionCount()
  // Di halaman channel, Unggah langsung ke channel itu; di tempat lain ke Unggah Massal.
  const upload = () => (onChannel?.params.id ? openUpload(onChannel.params.id) : navigate('/unggah'))
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-paper px-5 md:px-8">
      <span className="hidden whitespace-nowrap text-[13px] text-muted sm:block">
        Ternak Konten / <span className="text-ink">{pageTitle(pathname)}</span>
      </span>
      <div className="relative ml-auto max-w-sm flex-1 sm:ml-4">
        <Icon n="search" s={14} className="absolute left-2.5 top-3 text-muted" />
        <input className="!pl-8" placeholder="Cari video, caption, channel…" aria-label="Cari" />
      </div>
      <label className="hidden items-center gap-2 text-[12px] md:flex">
        <Switch on={auto} onChange={requestAuto} label="Auto-posting" />
        Auto-posting
        <span className={`mono ${auto ? 'font-semibold' : 'text-red'}`}>{auto ? 'AKTIF' : 'MATI'}</span>
      </label>
      <button type="button" className="relative" aria-label={`Notifikasi: ${issueCount} masalah`} onClick={() => navigate('/')}>
        <Icon n="bell" />
        {issueCount > 0 && (
          <span className="mono absolute -right-2 -top-1.5 rounded-full bg-tomato px-1 text-[9px] text-[#141210]">{issueCount}</span>
        )}
      </button>
      <button type="button" className="btn btn-tomato" onClick={upload}>
        <Icon n="upload" s={14} />
        <span className="hidden sm:inline">Unggah</span>
      </button>
    </header>
  )
}

const MOBILE_NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Ringkasan', icon: 'home' },
  { to: '/channel', label: 'Channel', icon: 'grid' },
  { to: '/unggah', label: 'Unggah', icon: 'upload' },
  { to: '/kalender', label: 'Kalender', icon: 'cal' },
  { to: '/pengaturan', label: 'Lainnya', icon: 'dots' },
]

function MobileTabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-[1.5px] border-ink bg-paper pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      aria-label="Navigasi utama"
    >
      {MOBILE_NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === '/'}
          className={({ isActive }) => `flex flex-col items-center py-2 text-[11px] ${isActive ? 'font-semibold text-tomatotxt' : ''}`}
        >
          <Icon n={n.icon} />
          {n.label}
        </NavLink>
      ))}
    </nav>
  )
}
