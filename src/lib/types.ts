import type { Requirement } from '../../shared/contract'

export type Stage = 'Bibit' | 'Tumbuh' | 'Panen' | 'Dipangkas'
export type Provider = 'Buffer' | 'Zernio'
export type Ratio = '9:16' | '16:9' | '1:1'

/** Kesehatan satu akun platform milik channel. */
/** linked = tersambung, tapi kesehatannya belum diketahui (belum ada data metrik). */
export type AccountState = 'ok' | 'linked' | 'fail' | 'login' | 'stale' | 'off'

/** Status satu video di satu platform. */
export type PostState = 'antre' | 'terjadwal' | 'tayang' | 'gagal' | 'belum-pasti' | 'off'

export interface Channel {
  id: string
  name: string
  niche: string
  stage: Stage
  format: string
  hypothesis: string
  /** Umur eksperimen: hari berjalan / panjang masa uji. */
  day: number
  dayTotal: number
  /** Video yang sudah tayang / target video masa uji. */
  vids: number
  vidsTotal: number
  viewsPerPost: number
  target: number
  followersPerDay: number
  costPerMonth: number
  /** Video menunggu di antrean. */
  queue: number
  /** Laju posting per hari (menentukan berapa hari stok bertahan). */
  perDay: number
  trashed: number
  hue: number
  /** Urutan mengikuti PLATFORMS. */
  accounts: AccountState[]
  /**
   * Rute per platform: koneksi scheduler mana + akun tertaut mana. null = platform
   * tidak dipakai. Kredensial TIDAK disimpan di channel — hanya rujukan ke Koneksi.
   */
  routes: (Route | null)[]
  lastPost: string[]
  /** Koneksi Cloudinary efektif tempat video channel ini disimpan (sudah memperhitungkan storage global). */
  storageId: string
  auto: boolean
  // Field di bawah hanya ada di mode sungguhan; dipakai form edit channel.
  /** Pilihan storage tersimpan; null = ikut storage global. */
  storageConnectionId?: string | null
  email?: string
  captionTemplate?: string
  hashtags?: string[]
  targetMetric?: string
  scheduleMode?: 'auto' | 'manual'
  manualSlots?: string[]
  startedAt?: string | null
}

// ─── Koneksi (bank kredensial) ────────────────────────────────────────────────

export type ConnectionProvider = Provider | 'Cloudinary'
export type ConnectionStatus = 'ok' | 'error' | 'untested'

/** Akun media sosial yang tertaut di dalam satu koneksi Buffer/Zernio. */
export interface LinkedProfile {
  id: string
  platform: number
  /** Nama akun di platformnya. Dipakai untuk mendeteksi akun yang dipakai dua channel. */
  handle: string
  /** Tidak lagi muncul di provider saat tes terakhir, tapi masih dirujuk channel. */
  missing?: boolean
}

export interface Connection {
  id: string
  provider: ConnectionProvider
  label: string
  /** 4 karakter terakhir key — satu-satunya bagian secret yang boleh sampai ke browser. */
  keyHint: string
  status: ConnectionStatus
  testedAt: string
  error?: string
  profiles: LinkedProfile[]
  cloudName?: string
  /** Pemakaian kredit Cloudinary bulan ini. */
  usage?: { used: number; limit: number }
}

export interface Route {
  connectionId: string
  profileId: string
}

// ─── Uang ─────────────────────────────────────────────────────────────────────

export type RevenueSource = 'Shopee Affiliate' | 'TikTok Shop' | 'YouTube' | 'TikTok Creator Rewards' | 'Facebook' | 'Lainnya'

export interface RevenueEntry {
  channelId: string
  /** "2026-11" */
  month: string
  source: RevenueSource
  /** Selalu dalam Rupiah; USD dikonversi saat dicatat. */
  amount: number
}

export interface AffiliateLink {
  id: string
  channelId: string
  /** Kode pendek di URL /r/:code — juga dipakai sebagai Sub ID di program afiliasi. */
  code: string
  title: string
  program: 'Shopee Affiliate' | 'TikTok Shop' | 'Lainnya'
  clicks30: number
}

// Syarat monetisasi didefinisikan sekali di kontrak bersama server ↔ frontend.
export type { MonetizationRule, Requirement } from '../../shared/contract'
export type MonetizationMetric = Requirement['metric']

export interface PlatformPost {
  state: PostState
  time?: string
  reason?: string
  views?: number
}

export interface Video {
  id: string
  topic: string
  caption: string
  tags: string[]
  duration: number
  ratio: Ratio
  hue: number
  /** Urutan mengikuti PLATFORMS. */
  posts: PlatformPost[]
  /** Nama channel lain yang sudah memakai file yang sama. */
  reusedIn?: string
  /** Views hari ke-7 ÷ median channel+platform. */
  index: number
  /** Sudah pernah dikirim ke scheduler — tidak boleh kembali ke antrean. */
  sent: boolean
}
