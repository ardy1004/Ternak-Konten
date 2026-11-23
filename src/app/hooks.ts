import { useState } from 'react'
import { api, errorText } from '../lib/api'
import type { Channel } from '../lib/types'
import { useApp } from './context'

/**
 * Saklar Auto satu channel. Demo: hanya tampilan. Sungguhan: disimpan ke server;
 * bila gagal, saklar dikembalikan ke posisi semula supaya tampilan tidak berbohong.
 */
export function useChannelAuto(c: Channel) {
  const { mode, reload, toast } = useApp()
  const [auto, setAuto] = useState(c.auto)
  const change = async (on: boolean) => {
    setAuto(on)
    if (mode === 'demo') return
    try {
      await api(`channels/${c.id}`, { method: 'PATCH', body: { auto: on } })
      await reload()
      toast(on ? `${c.name}: auto-posting aktif` : `${c.name}: auto-posting dijeda`)
    } catch (e) {
      setAuto(!on)
      toast(errorText(e))
    }
  }
  return [auto, change] as const
}
