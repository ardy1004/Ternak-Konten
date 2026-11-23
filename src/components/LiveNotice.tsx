import type { ReactNode } from 'react'
import { useApp } from '../app/context'
import { Notice } from './ui'

/** Catatan yang hanya muncul di mode sungguhan — untuk bagian yang sumber datanya belum tersambung. */
export function LiveNotice({ children }: { children: ReactNode }) {
  const { mode } = useApp()
  return mode === 'live' ? <Notice>{children}</Notice> : null
}
