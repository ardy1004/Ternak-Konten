import { createContext, useContext } from 'react'

export type DecisionChoice = 'Lanjutkan' | 'Ubah format' | 'Pangkas'

export type ModalState =
  | { type: 'decision'; channelId: string; choice?: DecisionChoice }
  | { type: 'schedule'; channelId: string }
  | { type: 'verify'; channelId: string }
  | { type: 'retry'; channelId: string }
  | { type: 'move'; channelId: string; count: number; sentCount: number }
  | { type: 'delete'; count: number }
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
}

export const AppContext = createContext<AppApi | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp dipakai di luar AppContext')
  return ctx
}
