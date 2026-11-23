/*
 * STORE — satu-satunya sumber data untuk semua halaman.
 *
 * Dua mode:
 *   - demo: diisi data contoh (sample.ts) bila database belum tersambung.
 *   - live: diisi dari API saat aplikasi dimulai dan setiap kali data berubah.
 * Halaman membaca array & fungsi di modul ini dan tidak pernah membuat data sendiri.
 * App merender ulang setelah hydrateLive()/loadSample() lewat penghitung versi.
 *
 * Metrik (views, follower, antrean video, pendapatan) belum punya sumber di
 * mode sungguhan sampai tahap metrik & penjadwal — nilainya 0/kosong, dan
 * halaman menampilkan keadaan kosong, bukan angka karangan.
 */
import {
  DEFAULT_MONETIZATION_RULES,
  DEFAULT_SETTINGS,
  normHandle,
  type ChannelDTO,
  type ConnectionDTO,
  type SettingsDTO,
} from '../../shared/contract'
import { clock, times } from './format'
import { sampleData } from './sample'
import type {
  AffiliateLink,
  Channel,
  Connection,
  MonetizationMetric,
  MonetizationRule,
  PlatformPost,
  Provider,
  Ratio,
  RevenueEntry,
  RevenueSource,
  Video,
} from './types'

export type Mode = 'demo' | 'live'
/** Mode berjalan. Hanya diubah oleh loadSample()/hydrateLive(). */
export let MODE: Mode = 'demo'
export let SETTINGS: SettingsDTO = DEFAULT_SETTINGS

export const PLATFORMS = ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'Threads'] as const
export const PLATFORM_CODE = ['YT', 'TT', 'IG', 'FB', 'TH'] as const
export const POSTER_COLORS = ['#E4572E', '#2F6F73', '#E9B44C', '#3D5A80', '#8C5E58', '#6A994E', '#BC4B51', '#4B3F72']

/** "Sekarang" versi data contoh: Senin 23 Nov 2026, 14.20 WIB. Kalender demo berpatokan ke sini. */
export const NOW = { day: 0, h: 14, m: 20, label: '23 Nov 2026, 14.20' }
export let CURRENT_MONTH = '2026-11'
export let PREVIOUS_MONTH = '2026-10'
export const monthLabel = (m: string) =>
  new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${m}-01T00:00:00Z`))
export let USD_RATE_DEFAULT = DEFAULT_SETTINGS.usdRate

// ─── Koneksi & rute ───────────────────────────────────────────────────────────

/** Koneksi Cloudinary global (mode demo: contoh; mode sungguhan: dari Pengaturan). */
export let GLOBAL_STORAGE_ID = ''

export const CONNECTIONS: Connection[] = []
export const CHANNELS: Channel[] = []

export const findConnection = (id: string | undefined) => CONNECTIONS.find((c) => c.id === id)

export const findChannel = (id: string | undefined) => CHANNELS.find((c) => c.id === id)
export const liveChannels = () => CHANNELS.filter((c) => c.stage !== 'Dipangkas')

export const connectionAt = (c: Channel, platform: number) => findConnection(c.routes[platform]?.connectionId)
export const providerAt = (c: Channel, platform: number): Provider | null =>
  (connectionAt(c, platform)?.provider as Provider | undefined) ?? null
export const profileAt = (c: Channel, platform: number) => {
  const r = c.routes[platform]
  return r ? findConnection(r.connectionId)?.profiles.find((p) => p.id === r.profileId) : undefined
}
export const usesGlobalStorage = (c: Channel) => c.storageId === GLOBAL_STORAGE_ID

/** Channel bisa dijadwalkan bila minimal satu rute menunjuk koneksi yang sehat. */
export const schedulerReady = (c: Channel) => c.routes.some((r) => r && findConnection(r.connectionId)?.status === 'ok')

/** Channel yang memakai koneksi ini, sebagai scheduler maupun storage. */
export const channelsUsing = (connectionId: string) =>
  CHANNELS.filter((c) => c.storageId === connectionId || c.routes.some((r) => r?.connectionId === connectionId))

/** Dua handle menunjuk akun yang sama? ("ternak.ig" dari Buffer = "@ternak.ig" dari Zernio.) */
const sameHandle = (a: string | undefined, b: string) => a !== undefined && normHandle(a) === normHandle(b)

/** Channel lain (masih hidup) yang menunjuk akun platform yang sama — dideteksi dari handle, bukan ID provider. */
export function sharedAccounts(c: Channel) {
  const out: { platform: number; handle: string; other: Channel }[] = []
  c.routes.forEach((_, p) => {
    const mine = profileAt(c, p)
    if (!mine) return
    liveChannels().forEach((o) => {
      if (o.id !== c.id && sameHandle(profileAt(o, p)?.handle, mine.handle)) out.push({ platform: p, handle: mine.handle, other: o })
    })
  })
  return out
}

/** Siapa yang sudah memakai akun ini — dipakai wizard untuk memperingatkan sebelum disimpan. */
export const ownerOfProfile = (platform: number, handle: string, exceptId?: string) =>
  liveChannels().find((o) => o.id !== exceptId && sameHandle(profileAt(o, platform)?.handle, handle))

// ─── Aturan bisnis ────────────────────────────────────────────────────────────

/** Berapa hari antrean bertahan pada laju posting sekarang. */
export const stockDays = (c: Channel) => (c.perDay > 0 ? Math.floor(c.queue / c.perDay) : 0)

export const targetRatio = (c: Channel) => c.viewsPerPost / c.target

/** Masa uji selesai bila KEDUA batas tercapai — hari dan jumlah video. */
export const testDone = (c: Channel) => c.day >= c.dayTotal && c.vids >= c.vidsTotal

export type Recommendation = 'siap-panen' | 'pangkas' | null

export function recommendation(c: Channel): Recommendation {
  if (c.stage === 'Dipangkas') return null
  if (testDone(c) && targetRatio(c) < 0.5) return 'pangkas'
  if (c.stage !== 'Panen' && targetRatio(c) >= 1) return 'siap-panen'
  return null
}

/** Kepala kalimat vonis untuk Rapor Eksperimen. */
export function verdictHead(c: Channel) {
  const r = targetRatio(c)
  if (c.stage === 'Dipangkas') return 'Dipangkas'
  if (testDone(c)) return r >= 1 ? 'Masa uji selesai, lulus' : 'Masa uji selesai, perlu keputusan'
  if (r >= 1) return 'Di atas target'
  if (r >= 0.7) return 'Mendekati target'
  return 'Di bawah target'
}

export const verdictLine = (c: Channel) => `${verdictHead(c)} — ${times(targetRatio(c))} target di hari ke-${c.day}.`

export const activeAccounts = (c: Channel) => c.accounts.filter((a) => a !== 'off').length

/** Masalah satu channel, sebagai kalimat pendek untuk kartu & sidebar. */
export function problems(c: Channel): string[] {
  if (c.stage === 'Dipangkas') return []
  const out: string[] = []
  const broken = [...new Set(c.routes.map((r) => findConnection(r?.connectionId)).filter((x) => x && x.status === 'error'))]
  if (c.routes.every((r) => r === null)) out.push('Scheduler kosong, posting terblokir')
  broken.forEach((k) => out.push(`Koneksi '${k!.label}' ditolak, posting terblokir`))
  c.accounts.forEach((a, i) => {
    if (a === 'fail') out.push(`${PLATFORMS[i]} gagal tayang`)
    if (a === 'login') out.push(`Login ${PLATFORMS[i]} kedaluwarsa`)
  })
  sharedAccounts(c).forEach((s) => out.push(`${PLATFORMS[s.platform]} ${s.handle} juga dipakai ${s.other.name}`))
  return out
}

/** Post berstatus "Belum pasti" yang menunggu dikonfirmasi operator. */
export const UNCERTAIN: { channelId: string; platform: number; count: number }[] = []

export type ActionKind = 'fail' | 'login' | 'scheduler' | 'shared' | 'uncertain' | 'storage'
export interface ActionItem {
  kind: ActionKind
  text: string
  channelId?: string
  connectionId?: string
}

/** Satu daftar "Perlu tindakan" — dipakai Ringkasan DAN angka lonceng, supaya tidak pernah beda. */
export function actionItems(): ActionItem[] {
  const out: ActionItem[] = []
  liveChannels().forEach((c) => {
    c.accounts.forEach((a, i) => {
      if (a === 'fail') out.push({ kind: 'fail', channelId: c.id, text: `${PLATFORMS[i]} '${c.name}' gagal tayang` })
      if (a === 'login') out.push({ kind: 'login', channelId: c.id, text: `Login ${PLATFORMS[i]} '${c.name}' kedaluwarsa` })
    })
    if (!schedulerReady(c))
      out.push({ kind: 'scheduler', channelId: c.id, text: `Scheduler '${c.name}' tidak bisa dipakai, posting terblokir` })
  })
  // Akun ganda dilaporkan sekali per pasangan.
  const seen = new Set<string>()
  liveChannels().forEach((c) =>
    sharedAccounts(c).forEach((s) => {
      const key = [s.platform, s.handle].join('|')
      if (seen.has(key)) return
      seen.add(key)
      out.push({ kind: 'shared', channelId: c.id, text: `${PLATFORMS[s.platform]} ${s.handle} dipakai '${c.name}' dan '${s.other.name}'` })
    }),
  )
  UNCERTAIN.forEach((u) =>
    out.push({
      kind: 'uncertain',
      channelId: u.channelId,
      text: `${PLATFORMS[u.platform]} '${findChannel(u.channelId)?.name}' belum pasti (${u.count})`,
    }),
  )
  CONNECTIONS.forEach((k) => {
    if (k.usage && k.usage.used / k.usage.limit >= 0.8)
      out.push({
        kind: 'storage',
        connectionId: k.id,
        text: `Kuota '${k.label}' terpakai ${Math.round((k.usage.used / k.usage.limit) * 100)}%`,
      })
  })
  return out
}

export const actionCount = () => actionItems().length

// ─── Uang ─────────────────────────────────────────────────────────────────────

export const AFFILIATE_SOURCES: RevenueSource[] = ['Shopee Affiliate', 'TikTok Shop']
export const REVENUE_SOURCES: RevenueSource[] = [
  'Shopee Affiliate',
  'TikTok Shop',
  'YouTube',
  'TikTok Creator Rewards',
  'Facebook',
  'Lainnya',
]

export const REVENUE: RevenueEntry[] = []

export function revenueOf(channelId: string, month = CURRENT_MONTH) {
  const rows = REVENUE.filter((r) => r.channelId === channelId && r.month === month)
  const affiliate = rows.filter((r) => AFFILIATE_SOURCES.includes(r.source)).reduce((s, r) => s + r.amount, 0)
  const platform = rows.filter((r) => !AFFILIATE_SOURCES.includes(r.source)).reduce((s, r) => s + r.amount, 0)
  return { affiliate, platform, total: affiliate + platform }
}

/** Pendapatan ÷ biaya bulan ini. null bila channel tidak berbiaya. */
export const roi = (c: Channel) => (c.costPerMonth > 0 ? revenueOf(c.id).total / c.costPerMonth : null)

export function moneySummary(month = CURRENT_MONTH) {
  const rows = CHANNELS.map((c) => revenueOf(c.id, month))
  const affiliate = rows.reduce((s, r) => s + r.affiliate, 0)
  const platform = rows.reduce((s, r) => s + r.platform, 0)
  const cost = CHANNELS.reduce((s, c) => s + c.costPerMonth, 0)
  return { affiliate, platform, revenue: affiliate + platform, cost, roi: cost > 0 ? (affiliate + platform) / cost : null }
}

export const LINKS: AffiliateLink[] = []

export const linksOf = (channelId: string) => LINKS.filter((l) => l.channelId === channelId)
export const clicksOf = (channelId: string) => linksOf(channelId).reduce((s, l) => s + l.clicks30, 0)

/** Baris contoh laporan komisi untuk pratinjau impor CSV. Channel dikenali dari kode link (Sub ID). */
export const IMPORT_PREVIEW: { date: string; product: string; subId: string; commission: number }[] = []
export const channelOfCode = (code: string) => findChannel(LINKS.find((l) => l.code === code)?.channelId)

// ─── Monetisasi platform ──────────────────────────────────────────────────────

/**
 * Syarat program monetisasi BAWAAN. Syarat resmi berubah dari waktu ke waktu dan
 * berbeda per negara — operator wajib bisa mengubahnya di Pengaturan, jangan
 * ditanam di logika.
 */

export let MONETIZATION_RULES: MonetizationRule[] = DEFAULT_MONETIZATION_RULES

const FOLLOWER_SHARE = [0.34, 0.33, 0.2, 0.08, 0.05]
const VIEW_FACTOR = [0.9, 1.4, 0.8, 0.5, 0.4]

/** Statistik satu akun platform (contoh). Channel ini hanya Shorts, jadi jam tayang video panjang = 0. */
export function platformStats(c: Channel, platform: number): Record<MonetizationMetric, number> & { followersPerDay: number } {
  const followersPerDay = c.followersPerDay * FOLLOWER_SHARE[platform]
  const perPost = c.viewsPerPost * VIEW_FACTOR[platform]
  return {
    followers: Math.round(followersPerDay * c.day),
    views30: Math.round(perPost * c.perDay * Math.min(c.day, 30)),
    views90: Math.round(perPost * c.perDay * Math.min(c.day, 90)),
    watchHours: 0,
    followersPerDay,
  }
}

/** Kemajuan satu channel menuju setiap program monetisasi pada platform yang dipakainya. */
export function monetizationProgress(c: Channel, rules = MONETIZATION_RULES) {
  return rules
    .filter((rule) => c.accounts[rule.platform] !== 'off')
    .map((rule) => {
      const s = platformStats(c, rule.platform)
      const row = (q: MonetizationRule['all'][number]) => ({ ...q, current: s[q.metric], done: s[q.metric] >= q.target })
      const all = rule.all.map(row)
      const anyOf = rule.anyOf.map(row)
      const followerReq = rule.all.find((q) => q.metric === 'followers')
      const daysToFollowers =
        followerReq && s.followers < followerReq.target && s.followersPerDay > 0
          ? Math.ceil((followerReq.target - s.followers) / s.followersPerDay)
          : null
      return { rule, all, anyOf, eligible: all.every((q) => q.done) && (anyOf.length === 0 || anyOf.some((q) => q.done)), daysToFollowers }
    })
}

// ─── Kurva kohort ─────────────────────────────────────────────────────────────

/** Views per post per hari sejak post pertama (rata-rata bergulir, contoh). */
export const curve = (c: Channel, n = 24) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n
    return c.viewsPerPost * (0.35 + 0.65 * t) * (1 + 0.12 * Math.sin(i * 1.7 + c.hue * 2))
  })

/** Median semua channel pada hari yang sama. */
export const medianCurve = (n = 24) => Array.from({ length: n }, (_, i) => 300 + 420 * ((i + 1) / n) ** 0.8)

/** Nilai kurva channel pada hari ke-d sejak post pertama, null bila channel belum seumur itu. */
export function curveAt(c: Channel, d: number) {
  if (c.day < d) return null
  return curve(c, c.day)[d - 1]
}

export const costPer1000Views = (c: Channel) =>
  c.perDay > 0 && c.costPerMonth > 0 ? (c.costPerMonth / (c.viewsPerPost * c.perDay * 30)) * 1000 : null

// ─── Slot harian ──────────────────────────────────────────────────────────────

const WINDOWS = [
  { name: 'Pagi', range: '06.00–08.00', h: 6, m: 48 },
  { name: 'Siang', range: '11.30–13.00', h: 12, m: 10 },
  { name: 'Malam', range: '19.00–21.00', h: 19, m: 12 },
]

/** Jendela yang dipakai channel hari ini, sesuai laju postingnya. */
export function slotPlan(c: Channel) {
  const picked = c.perDay >= 3 ? WINDOWS : c.perDay === 2 ? [WINDOWS[0], WINDOWS[2]] : c.perDay === 1 ? [WINDOWS[2]] : []
  return picked.map((w) => ({
    ...w,
    used: w.h < NOW.h,
    times: c.accounts
      .map((a, i) => (a === 'off' ? null : `${PLATFORMS[i]} ${clock(w.h, w.m + i * 7)}`))
      .filter(Boolean)
      .join(' · '),
  }))
}

// ─── Video contoh ─────────────────────────────────────────────────────────────

const TOPICS: Record<string, string[]> = {
  kuliner: [
    'Nasi goreng 30 detik',
    'Rendang anti gagal',
    'Sambal bawang rahasia',
    'Telur dadar gulung',
    'Bakso kuah bening',
    'Es teh solo',
    'Pisang goreng renyah',
    'Soto ayam kuning',
    'Tahu crispy',
    'Mie godok Jawa',
    'Kopi susu aren',
    'Bubur ayam pagi',
  ],
  otomotif: [
    'Avanza 2015 masih layak?',
    'Jazz RS bekas 90 jutaan',
    'Cek mesin sebelum beli',
    'Ertiga vs Xpander bekas',
    'Biaya servis Brio setahun',
    'Mobil keluarga di bawah 100 juta',
    'Tanda odometer diputar',
    'Karimun Wagon R irit?',
    'Pajak mobil bekas',
    'Grand Livina masih dicari',
    'Ban serep yang sering lupa',
    'Calya bekas: untung rugi',
  ],
  keuangan: [
    'Dana darurat 6 bulan',
    'Aturan 50/30/20',
    'Cicilan maksimal 30%',
    'Reksa dana pasar uang',
    'Gaji UMR mulai investasi',
    'Pinjol: hitung bunganya',
    'Emas atau deposito?',
    'Catat pengeluaran harian',
    'Asuransi kesehatan dulu',
    'Bayar utang metode bola salju',
    'THR jangan habis',
    'Pensiun dini mulai umur 25',
  ],
  horor: [
    'Rumah kosong di ujung gang',
    'Suara dari loteng',
    'Penunggu pohon beringin',
    'Ojek tengah malam',
    'Kamar kos nomor 13',
    'Pasar malam yang hilang',
    'Bayangan di cermin',
    'Jembatan tua desa',
    'Penumpang terakhir bus',
    'Sumur belakang rumah nenek',
    'Tetangga yang tak pernah keluar',
    'Lagu dari radio mati',
  ],
  edukasi: [
    'Kenapa langit biru',
    'Gurita punya tiga jantung',
    'Petir lebih panas dari matahari',
    'Madu tak pernah basi',
    'Kenapa kucing mendengkur',
    'Bulan menjauh dari bumi',
    'Pisang itu buah beri',
    'Air panas membeku lebih cepat?',
    'Otak dan gula',
    'Kenapa laut asin',
    'Semut tidak tidur',
    'Bintang yang sudah mati',
  ],
  travel: [
    'Bukit Bintang tanpa tiket',
    'Pantai Wediombo pagi hari',
    'Hutan pinus Mangunan',
    'Kali Biru dari atas',
    'Malioboro jam 5 pagi',
    'Air terjun Sri Gethuk',
    'Tebing Breksi senja',
    'Gumuk pasir Parangkusumo',
    'Embung Nglanggeran',
    'Watu Lumbung',
    'Taman Sari saat sepi',
    'Pantai Timang',
  ],
  properti: [
    'Rumah subsidi 160 juta',
    'Tur rumah tipe 36',
    'KPR tenor 20 tahun',
    'Cek legalitas SHM',
    'Rumah dekat stasiun',
    'Renovasi dapur 10 juta',
    'DP 0% beneran?',
    'Cluster tanpa IPL',
    'Rumah sudut lebih mahal?',
    'Biaya notaris',
    'Over kredit aman?',
    'Rumah inden atau jadi',
  ],
}

const CAPTION_TAIL: Record<string, string> = {
  kuliner: 'ikuti langkahnya sampai habis, simpan untuk dicoba di rumah.',
  otomotif: 'cek dulu sebelum transfer DP, simpan buat referensi.',
  keuangan: 'simpan dan praktikkan mulai gajian bulan ini.',
  horor: 'dengarkan sampai akhir, jangan sendirian.',
  edukasi: 'fakta singkat yang jarang orang tahu.',
  travel: 'spot gratis, datang sebelum ramai.',
  properti: 'hitung dulu sebelum tanda tangan.',
}

export type VideoKind = 'antre' | 'terjadwal' | 'tayang' | 'sampah'

export const videoCount = (c: Channel, kind: VideoKind) =>
  kind === 'antre'
    ? c.queue
    : kind === 'terjadwal'
      ? c.auto && schedulerReady(c) && c.queue > 0
        ? c.perDay
        : 0
      : kind === 'tayang'
        ? c.vids
        : c.trashed

const KIND_OFFSET: Record<VideoKind, number> = { antre: 0, terjadwal: 5, tayang: 3, sampah: 8 }

function postsFor(c: Channel, kind: VideoKind, k: number, index: number): PlatformPost[] {
  return c.accounts.map((a, i) => {
    if (a === 'off') return { state: 'off' }
    if (kind === 'terjadwal') return { state: 'terjadwal', time: clock(19, 12 + i * 7) }
    if (kind === 'tayang') {
      if (a === 'fail' && k % 3 === 0) return { state: 'gagal', reason: `${PLATFORMS[i]}: channel ditangguhkan` }
      return { state: 'tayang', views: Math.round(c.viewsPerPost * index * (0.7 + i * 0.1)) }
    }
    if (kind === 'antre' && k % 5 === 2 && i === 2) return { state: 'gagal', reason: 'Instagram: rasio video tidak didukung' }
    if (kind === 'antre' && k % 5 === 3 && i === 0) return { state: 'belum-pasti' }
    return { state: 'antre' }
  })
}

/** Daftar video contoh satu channel. Tab Tayang hanya menampilkan 12 terakhir. */
export function videosFor(c: Channel, kind: VideoKind): Video[] {
  const topics = TOPICS[c.niche] ?? TOPICS.kuliner
  const n = kind === 'tayang' ? Math.min(12, c.vids) : videoCount(c, kind)
  const twin = CHANNELS.find((o) => o.id !== c.id && o.niche === c.niche && o.stage !== 'Dipangkas')
  return Array.from({ length: n }, (_, k) => {
    const t = KIND_OFFSET[kind] + k
    const round = Math.floor(t / topics.length)
    const topic = topics[t % topics.length] + (round > 0 ? ` #${round + 1}` : '')
    const ratio: Ratio = k % 11 === 5 ? '16:9' : k % 11 === 9 ? '1:1' : '9:16'
    const index = +(0.6 + ((k * 37 + c.hue * 11) % 17) / 8).toFixed(1)
    return {
      id: `${c.id}-${kind}-${k}`,
      topic,
      caption: `${topic} — ${CAPTION_TAIL[c.niche] ?? ''}`,
      tags: [`#${c.niche}`, '#fyp', `#${c.niche}harian`, '#viral', '#indonesia', '#shorts'].slice(0, 3 + (k % 4)),
      duration: 18 + ((k * 7) % 40),
      ratio,
      hue: (c.hue + k) % 8,
      posts: postsFor(c, kind, k, index),
      reusedIn: kind === 'antre' && twin && (k === 1 || k === 6) ? twin.name : undefined,
      index,
      sent: kind === 'terjadwal' || kind === 'tayang' || (kind === 'sampah' && k % 2 === 0),
    }
  })
}

/** Video dengan indeks tertinggi lintas channel. */
export function topVideos(limit = 8) {
  return liveChannels()
    .flatMap((c) =>
      videosFor(c, 'tayang').map((v) => {
        const p = v.posts.findIndex((x) => x.state === 'tayang')
        const views7 = c.viewsPerPost * v.index
        return { video: v, channel: c, platform: p, views7, likes: views7 * 0.078 }
      }),
    )
    .filter((r) => r.platform >= 0)
    .sort((a, b) => b.video.index - a.video.index)
    .slice(0, limit)
}

// ─── Kalender ─────────────────────────────────────────────────────────────────

export const WEEK_DAYS = ['Senin 23', 'Selasa 24', 'Rabu 25', 'Kamis 26', 'Jumat 27', 'Sabtu 28', 'Minggu 29']

export interface CalendarPost {
  id: string
  day: number
  h: number
  m: number
  channel: Channel
  platforms: number[]
  conflict?: string
}

/** Channel bisa posting di hari d bila auto aktif, scheduler siap, dan stoknya belum habis. */
const postsOn = (c: Channel, d: number) => c.auto && schedulerReady(c) && stockDays(c) > d

export function weekPosts(): CalendarPost[] {
  const out: CalendarPost[] = []
  liveChannels().forEach((c, ci) => {
    const plan = slotPlan(c)
    for (let d = 0; d < 7; d++) {
      if (!postsOn(c, d)) continue
      plan.forEach((w, s) => {
        out.push({
          id: `${c.id}-${d}-${s}`,
          day: d,
          h: w.h,
          m: (w.m + ci * 9 + d * 4) % 60,
          channel: c,
          platforms: c.accounts.map((a, i) => (a === 'off' ? -1 : i)).filter((i) => i >= 0),
        })
      })
    }
  })
  // Demo: dua channel contoh menunjuk akun Instagram yang sama, selisih 3 menit.
  // Deteksi bentrok sungguhan dikerjakan penjadwal di server (tahap berikutnya).
  const a = MODE === 'demo' ? out.find((p) => p.channel.id === 'otomotif-harian' && p.day === 2 && p.h === 19) : undefined
  const b = MODE === 'demo' ? out.find((p) => p.channel.id === 'tips-cuan' && p.day === 2 && p.h === 19) : undefined
  if (a && b) {
    b.m = a.m + 3
    const why = 'Akun Instagram @otomotif.harian dipakai 2 channel dalam 5 menit'
    a.conflict = why
    b.conflict = why
  }
  return out
}

export function dayCapacity(d: number) {
  const live = liveChannels().filter((c) => c.auto)
  const total = live.reduce((s, c) => s + c.perDay, 0)
  const filled = live.reduce((s, c) => s + (postsOn(c, d) ? c.perDay : 0), 0)
  return { filled, total }
}

// ─── Pola (contoh) ────────────────────────────────────────────────────────────

/** Intensitas 0–1 untuk 7 hari × 12 blok jam. */
export const HOUR_HEAT = Array.from({ length: 84 }, (_, i) => 0.08 + (((i * 37) % 11) / 11) * 0.85 * (i % 12 > 6 ? 1 : 0.5))
export const BY_DURATION = [
  { label: '< 15 dtk', views: 420, n: 18 },
  { label: '15–30', views: 1180, n: 64 },
  { label: '30–60', views: 860, n: 41 },
  { label: '> 60', views: 300, n: 4 },
]
export const BY_FORMAT = [
  { label: 'Faceless', views: 1240, n: 27 },
  { label: 'Voice-over', views: 760, n: 72 },
  { label: 'Talking head', views: 540, n: 60 },
  { label: 'Slideshow', views: 380, n: 9 },
]

/** Ringkasan untuk kalimat pembuka & subjudul Ringkasan. */
export function summary() {
  const live = liveChannels()
  const recs = CHANNELS.map(recommendation)
  const money = moneySummary()
  return {
    channels: CHANNELS.length,
    accounts: CHANNELS.reduce((s, c) => s + activeAccounts(c), 0),
    views30: live.reduce((s, c) => s + c.viewsPerPost * c.perDay * 30 * activeAccounts(c), 0),
    cost: money.cost,
    revenue: money.revenue,
    roi: money.roi,
    ready: recs.filter((r) => r === 'siap-panen').length,
    prune: recs.filter((r) => r === 'pangkas').length,
    seedling: CHANNELS.filter((c) => c.stage === 'Bibit').length,
  }
}

// ─── Mengisi store ────────────────────────────────────────────────────────────

const replaceAll = <T>(target: T[], items: T[]) => {
  target.splice(0, target.length, ...items)
}

/** Isi store dengan data contoh (mode demo). */
export function loadSample() {
  const s = sampleData()
  MODE = 'demo'
  GLOBAL_STORAGE_ID = s.globalStorageId
  MONETIZATION_RULES = s.monetizationRules
  SETTINGS = { ...DEFAULT_SETTINGS, globalStorageId: s.globalStorageId }
  USD_RATE_DEFAULT = SETTINGS.usdRate
  CURRENT_MONTH = '2026-11'
  PREVIOUS_MONTH = '2026-10'
  replaceAll(CONNECTIONS, s.connections)
  replaceAll(CHANNELS, s.channels)
  replaceAll(REVENUE, s.revenue)
  replaceAll(LINKS, s.links)
  replaceAll(IMPORT_PREVIEW, s.importPreview)
  replaceAll(UNCERTAIN, s.uncertain)
}

/** Tanggal kalender WIB sebagai "YYYY-MM-DD". */
const wibDate = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

const shiftMonth = (m: string, delta: number) => {
  const [y, mo] = m.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1 + delta, 1)).toISOString().slice(0, 7)
}

const testedLabel = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }).format(new Date(iso))
    : 'belum dites'

/** Warna poster stabil per channel. */
function hashHue(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 8
}

/** Hari ke-N masa uji (hari mulai = 1), dihitung per tanggal WIB. 0 = belum dimulai. */
function experimentDay(startedAt: string | null) {
  if (!startedAt) return 0
  const start = Date.parse(wibDate(new Date(startedAt)))
  const today = Date.parse(wibDate(new Date()))
  return Math.max(1, Math.round((today - start) / 86_400_000) + 1)
}

export function connectionFromDTO(d: ConnectionDTO): Connection {
  return {
    id: d.id,
    provider: d.provider,
    label: d.label,
    keyHint: d.keyHint,
    status: d.status,
    testedAt: testedLabel(d.testedAt),
    error: d.error ?? undefined,
    profiles: d.profiles.map((p) => ({ id: p.id, platform: p.platform, handle: p.handle, missing: p.missing })),
    cloudName: d.cloudName ?? undefined,
    usage: d.usage ?? undefined,
  }
}

export function channelFromDTO(d: ChannelDTO): Channel {
  const routes = PLATFORMS.map((_, p) => {
    const r = d.routes.find((x) => x.platform === p)
    return r ? { connectionId: r.connectionId, profileId: r.profileId } : null
  })
  return {
    id: d.id,
    name: d.name,
    niche: d.niche,
    stage: d.stage,
    format: d.format,
    hypothesis: d.hypothesis,
    day: experimentDay(d.startedAt),
    dayTotal: d.dayTotal,
    vids: 0,
    vidsTotal: d.vidsTotal,
    viewsPerPost: 0,
    target: d.targetValue,
    followersPerDay: 0,
    costPerMonth: d.costPerMonth,
    queue: 0,
    perDay: d.perDay,
    trashed: 0,
    hue: hashHue(d.id),
    // Kesehatan akun sungguhan (gagal tayang, login kedaluwarsa, basi) menyusul
    // bersama penarik metrik; sampai saat itu hanya "dipakai" atau "tidak dipakai".
    accounts: routes.map((r) => (r ? 'linked' : 'off')),
    routes,
    lastPost: routes.map(() => ''),
    storageId: d.storageConnectionId ?? GLOBAL_STORAGE_ID,
    auto: d.auto,
    storageConnectionId: d.storageConnectionId,
    email: d.email,
    captionTemplate: d.captionTemplate,
    hashtags: d.hashtags,
    targetMetric: d.targetMetric,
    scheduleMode: d.scheduleMode,
    manualSlots: d.manualSlots,
    startedAt: d.startedAt,
  }
}

/** Isi store dari API (mode sungguhan). Urutan penting: pengaturan dulu, lalu koneksi, lalu channel. */
export function hydrateLive(data: { connections: ConnectionDTO[]; channels: ChannelDTO[]; settings: SettingsDTO }) {
  MODE = 'live'
  SETTINGS = data.settings
  GLOBAL_STORAGE_ID = data.settings.globalStorageId ?? ''
  MONETIZATION_RULES = data.settings.monetizationRules
  USD_RATE_DEFAULT = data.settings.usdRate
  CURRENT_MONTH = wibDate(new Date()).slice(0, 7)
  PREVIOUS_MONTH = shiftMonth(CURRENT_MONTH, -1)
  replaceAll(CONNECTIONS, data.connections.map(connectionFromDTO))
  replaceAll(CHANNELS, data.channels.map(channelFromDTO))
  // Belum ada sumber sungguhan untuk data di bawah — dikosongkan supaya contoh tidak bocor ke mode sungguhan.
  replaceAll(REVENUE, [])
  replaceAll(LINKS, [])
  replaceAll(IMPORT_PREVIEW, [])
  replaceAll(UNCERTAIN, [])
}

loadSample()
