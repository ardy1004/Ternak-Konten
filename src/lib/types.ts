export type Stage = 'Bibit' | 'Tumbuh' | 'Panen' | 'Dipangkas'
export type Provider = 'Buffer' | 'Zernio'
export type Ratio = '9:16' | '16:9' | '1:1'

/** Kesehatan satu akun platform milik channel. */
export type AccountState = 'ok' | 'fail' | 'login' | 'stale' | 'off'

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
  providers: (Provider | null)[]
  lastPost: string[]
  storage: 'global' | 'own'
  schedulerReady: boolean
  auto: boolean
}

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
