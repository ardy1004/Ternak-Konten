/*
 * Kontrak data antara server (api/, server/) dan frontend (src/).
 * Satu sumber untuk bentuk JSON — ubah di sini, kedua sisi ikut terperiksa typecheck.
 * File ini TIDAK boleh mengimpor apa pun dari server/ atau src/.
 */

/** Urutan platform dipakai sebagai indeks di seluruh aplikasi. */
export const PLATFORM_KEYS = ['youtube', 'tiktok', 'instagram', 'facebook', 'threads'] as const
export type PlatformKey = (typeof PLATFORM_KEYS)[number]

export const platformIndex = (raw: unknown): number => {
  if (typeof raw !== 'string') return -1
  const k = raw.toLowerCase()
  return PLATFORM_KEYS.findIndex((p) => k === p || k.startsWith(p))
}

/**
 * Bentuk pembanding nama akun. Buffer menyimpan "ternak.ig", Zernio "@ternak.ig" —
 * akun yang sama harus dikenali sama, kalau tidak deteksi akun ganda bisa lolos.
 */
export const normHandle = (h: string) => h.trim().replace(/^@+/, '').toLowerCase()

export type ProviderName = 'Buffer' | 'Zernio' | 'Cloudinary'
export type ConnectionStatusName = 'ok' | 'error' | 'untested'
export type StageName = 'Bibit' | 'Tumbuh' | 'Panen' | 'Dipangkas'
export const STAGES: StageName[] = ['Bibit', 'Tumbuh', 'Panen', 'Dipangkas']

/** Amplop semua respons API. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface HealthDTO {
  /** ok = siap dipakai; selain itu aplikasi berjalan dalam mode demo. */
  db: 'ok' | 'missing-env' | 'unreachable' | 'not-migrated'
  auth: boolean
  /** Saat auth=false: variabel login mana yang bermasalah (nama & aturan saja, tanpa nilai). */
  authProblems?: string[]
}

export interface ProfileDTO {
  id: string
  platform: number
  handle: string
  /** Akun tidak lagi muncul di provider saat tes terakhir, tapi masih dirujuk channel. */
  missing: boolean
}

export interface ConnectionDTO {
  id: string
  provider: ProviderName
  label: string
  /** 4 karakter terakhir API key — satu-satunya bagian secret yang dikirim ke browser. */
  keyHint: string
  cloudName: string | null
  status: ConnectionStatusName
  error: string | null
  testedAt: string | null
  usage: { used: number; limit: number } | null
  profiles: ProfileDTO[]
}

export interface ConnectionInput {
  provider: ProviderName
  label: string
  cloudName?: string
  /** Kosong saat edit = pertahankan nilai lama. */
  apiKey?: string
  apiSecret?: string
}

export interface ConnectionTestDTO {
  ok: boolean
  error: string | null
  profiles: number
  usage: { used: number; limit: number } | null
}

export interface RouteDTO {
  platform: number
  connectionId: string
  profileId: string
}

export interface ChannelDTO {
  id: string
  name: string
  niche: string
  stage: StageName
  format: string
  hypothesis: string
  email: string
  captionTemplate: string
  hashtags: string[]
  dayTotal: number
  vidsTotal: number
  targetMetric: string
  targetValue: number
  costPerMonth: number
  perDay: number
  scheduleMode: 'auto' | 'manual'
  manualSlots: string[]
  /** null = ikut storage global. */
  storageConnectionId: string | null
  auto: boolean
  /** null = masa uji belum dimulai. */
  startedAt: string | null
  createdAt: string
  routes: RouteDTO[]
}

export type ChannelInput = Omit<ChannelDTO, 'id' | 'createdAt' | 'startedAt'> & { start?: boolean }

export interface Requirement {
  metric: 'followers' | 'views30' | 'views90' | 'watchHours'
  label: string
  target: number
}

export interface MonetizationRule {
  platform: number
  program: string
  all: Requirement[]
  anyOf: Requirement[]
}

export interface SettingsDTO {
  workspaceName: string
  autoPosting: boolean
  globalStorageId: string | null
  usdRate: number
  prices: { buffer: number; zernio: number; cloudinary: number }
  testDefaults: { days: number; videos: number; metric: string; target: number }
  monetizationRules: MonetizationRule[]
}

/**
 * Syarat program monetisasi BAWAAN. Syarat resmi berubah dari waktu ke waktu dan
 * berbeda per negara — operator mengubahnya di Pengaturan, logika tidak boleh
 * menanam angka ini.
 */
export const DEFAULT_MONETIZATION_RULES: MonetizationRule[] = [
  {
    platform: 0,
    program: 'YouTube Partner Program',
    all: [{ metric: 'followers', label: 'Subscriber', target: 1000 }],
    anyOf: [
      { metric: 'views90', label: 'Views Shorts 90 hari', target: 10_000_000 },
      { metric: 'watchHours', label: 'Jam tayang video panjang 12 bulan', target: 4000 },
    ],
  },
  {
    platform: 1,
    program: 'TikTok Creator Rewards',
    all: [
      { metric: 'followers', label: 'Follower', target: 10_000 },
      { metric: 'views30', label: 'Views 30 hari', target: 100_000 },
    ],
    anyOf: [],
  },
  {
    platform: 3,
    program: 'Monetisasi Facebook',
    all: [{ metric: 'followers', label: 'Follower', target: 10_000 }],
    anyOf: [],
  },
]

export const DEFAULT_SETTINGS: SettingsDTO = {
  workspaceName: 'Ternak Konten',
  autoPosting: true,
  globalStorageId: null,
  usdRate: 16500,
  prices: { buffer: 60000, zernio: 45000, cloudinary: 0 },
  testDefaults: { days: 30, videos: 30, metric: 'Median views/post', target: 1000 },
  monetizationRules: DEFAULT_MONETIZATION_RULES,
}
