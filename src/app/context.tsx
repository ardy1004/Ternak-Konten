import { createContext, useContext } from 'react'
import type { Mode } from '../lib/store'

export type DecisionChoice = 'Lanjutkan' | 'Ubah format' | 'Pangkas'

export type ModalState =
  | { type: 'decision'; channelId: string; choice?: DecisionChoice }
  | { type: 'schedule'; channelId: string }
  | { type: 'verify'; channelId: string }
  | { type: 'retry'; channelId: string }
  | { type: 'move'; channelId: string; count: number; sentCount: number }
  | { type: 'delete'; count: number }
  | { type: 'delete-channel'; channelId: string }
  | { type: 'auto-off' }
  | { type: 'revenue'; channelId?: string }

export interface ToastAction {
  label: string
  run: () => void
}

export interface AppApi {
  toast: (message: string, action?: ToastAction) => void
  openModal: (m: ModalState) => void
  dark: boolean
  setDark: (on: boolean) => void
  auto: boolean
  /** Menyalakan langsung; mematikan selalu lewat konfirmasi. */
  requestAuto: (on: boolean) => void
  setAuto: (on: boolean) => void
  /** Tanpa argumen = tambah channel baru; dengan id = edit channel itu. */
  openWizard: (channelId?: string) => void
  openUpload: (channelId: string) => void
  /** 'live' = tersambung database; 'demo' = data contoh. */
  mode: Mode
  /** Kenapa masih demo (mis. "database belum diatur"). Kosong di mode sungguhan. */
  demoReason: string
  /** Ambil ulang data dari server lalu render ulang. Tidak melakukan apa pun di mode demo. */
  reload: () => Promise<void>
  /**
   * Untuk aksi yang BELUM punya backend. Demo: tampilkan pesan sukses contoh.
   * Sungguhan: katakan terus terang bahwa fiturnya belum tersambung — jangan pura-pura berhasil.
   */
  demoOnly: (demoMessage: string, feature: string) => void
  signOut: () => void
}

export const AppContext = createContext<AppApi | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp dipakai di luar AppContext')
  return ctx
}
