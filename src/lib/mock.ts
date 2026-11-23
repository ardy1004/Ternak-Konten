/*
 * DATA CONTOH — dipakai sampai API tersedia.
 *
 * Semua halaman membaca data lewat ekspor modul ini, jadi saat backend siap
 * cukup modul ini yang diganti. Aturan bisnis (stok, rekomendasi, vonis) sudah
 * ditulis sebagai fungsi murni di sini supaya ikut terpakai saat data asli datang.
 *
 * Semua angka deterministik — tanpa Math.random — supaya tampilan stabil.
 */
import { clock, times } from './format'
import type { AccountState, Channel, PlatformPost, Ratio, Video } from './types'

export const PLATFORMS = ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'Threads'] as const
export const PLATFORM_CODE = ['YT', 'TT', 'IG', 'FB', 'TH'] as const
export const POSTER_COLORS = ['#E4572E', '#2F6F73', '#E9B44C', '#3D5A80', '#8C5E58', '#6A994E', '#BC4B51', '#4B3F72']

/** "Sekarang" versi data contoh: Senin 23 Nov 2026, 14.20 WIB. */
export const NOW = { day: 0, h: 14, m: 20, label: '23 Nov 2026, 14.20' }

const acc = (s: string) => s.split(',') as AccountState[]

export const CHANNELS: Channel[] = [
  {
    id: 'dapur-nenek',
    name: 'Dapur Nenek',
    niche: 'kuliner',
    stage: 'Panen',
    format: 'Faceless',
    hypothesis: 'Resep 30 detik tanpa bicara, close-up tangan',
    day: 18,
    dayTotal: 30,
    vids: 21,
    vidsTotal: 30,
    viewsPerPost: 1240,
    target: 1000,
    followersPerDay: 86,
    costPerMonth: 180000,
    queue: 28,
    perDay: 2,
    trashed: 4,
    hue: 0,
    accounts: acc('fail,ok,ok,ok,off'),
    providers: ['Buffer', 'Zernio', 'Zernio', 'Buffer', null],
    lastPost: ['3 hari lalu', '2 jam lalu', '5 jam lalu', '1 hari lalu', ''],
    storage: 'own',
    schedulerReady: true,
    auto: true,
  },
  {
    id: 'otomotif-harian',
    name: 'Otomotif Harian',
    niche: 'otomotif',
    stage: 'Tumbuh',
    format: 'Voice-over',
    hypothesis: 'Review mobil bekas di bawah 100 juta, narasi singkat',
    day: 24,
    dayTotal: 30,
    vids: 26,
    vidsTotal: 30,
    viewsPerPost: 1080,
    target: 1000,
    followersPerDay: 52,
    costPerMonth: 160000,
    queue: 18,
    perDay: 2,
    trashed: 1,
    hue: 1,
    accounts: acc('ok,ok,stale,ok,off'),
    providers: ['Buffer', 'Buffer', 'Buffer', 'Buffer', null],
    lastPost: ['4 jam lalu', '6 jam lalu', '8 hari lalu', '1 hari lalu', ''],
    storage: 'own',
    schedulerReady: true,
    auto: true,
  },
  {
    id: 'tips-cuan',
    name: 'Tips Cuan',
    niche: 'keuangan',
    stage: 'Tumbuh',
    format: 'Talking head',
    hypothesis: 'Satu tips uang per video, hook angka di 2 detik pertama',
    day: 21,
    dayTotal: 30,
    vids: 20,
    vidsTotal: 30,
    viewsPerPost: 1020,
    target: 1000,
    followersPerDay: 38,
    costPerMonth: 150000,
    queue: 12,
    perDay: 2,
    trashed: 0,
    hue: 2,
    accounts: acc('ok,ok,ok,off,ok'),
    providers: ['Zernio', 'Zernio', 'Zernio', null, 'Zernio'],
    lastPost: ['1 jam lalu', '3 jam lalu', '4 jam lalu', '', '9 jam lalu'],
    storage: 'own',
    schedulerReady: true,
    auto: true,
  },
  {
    id: 'cerita-malam',
    name: 'Cerita Malam',
    niche: 'horor',
    stage: 'Bibit',
    format: 'Voice-over',
    hypothesis: 'Horor 45 detik dengan visual stok gelap',
    day: 11,
    dayTotal: 30,
    vids: 12,
    vidsTotal: 30,
    viewsPerPost: 420,
    target: 1000,
    followersPerDay: 22,
    costPerMonth: 140000,
    queue: 2,
    perDay: 1,
    trashed: 2,
    hue: 3,
    accounts: acc('ok,login,ok,off,off'),
    providers: ['Buffer', 'Buffer', 'Buffer', null, null],
    lastPost: ['5 jam lalu', '8 hari lalu', '5 jam lalu', '', ''],
    storage: 'own',
    schedulerReady: true,
    auto: true,
  },
  {
    id: 'resep-kilat',
    name: 'Resep Kilat',
    niche: 'kuliner',
    stage: 'Bibit',
    format: 'Slideshow',
    hypothesis: 'Resep 5 bahan dalam slideshow bergaya majalah',
    day: 9,
    dayTotal: 30,
    vids: 9,
    vidsTotal: 30,
    viewsPerPost: 380,
    target: 1000,
    followersPerDay: 15,
    costPerMonth: 120000,
    queue: 0,
    perDay: 1,
    trashed: 0,
    hue: 4,
    accounts: acc('stale,stale,stale,off,off'),
    providers: ['Zernio', 'Zernio', 'Zernio', null, null],
    lastPost: ['8 hari lalu', '8 hari lalu', '8 hari lalu', '', ''],
    storage: 'own',
    schedulerReady: false,
    auto: true,
  },
  {
    id: 'jalan-jogja',
    name: 'Jalan-Jalan Jogja',
    niche: 'travel',
    stage: 'Bibit',
    format: 'Faceless',
    hypothesis: 'Spot gratis di Jogja, drone + teks di layar',
    day: 6,
    dayTotal: 30,
    vids: 6,
    vidsTotal: 30,
    viewsPerPost: 260,
    target: 1000,
    followersPerDay: 11,
    costPerMonth: 130000,
    queue: 12,
    perDay: 1,
    trashed: 0,
    hue: 5,
    accounts: acc('ok,ok,ok,ok,off'),
    providers: ['Buffer', 'Buffer', 'Buffer', 'Buffer', null],
    lastPost: ['6 jam lalu', '6 jam lalu', '6 jam lalu', '6 jam lalu', ''],
    storage: 'global',
    schedulerReady: true,
    auto: true,
  },
  {
    id: 'fakta-unik',
    name: 'Fakta Unik',
    niche: 'edukasi',
    stage: 'Bibit',
    format: 'Voice-over',
    hypothesis: 'Fakta sains 20 detik dengan animasi sederhana',
    day: 30,
    dayTotal: 30,
    vids: 34,
    vidsTotal: 30,
    viewsPerPost: 310,
    target: 1000,
    followersPerDay: 9,
    costPerMonth: 150000,
    queue: 16,
    perDay: 2,
    trashed: 1,
    hue: 6,
    accounts: acc('ok,ok,ok,off,ok'),
    providers: ['Zernio', 'Zernio', 'Zernio', null, 'Zernio'],
    lastPost: ['1 jam lalu', '1 jam lalu', '1 jam lalu', '', '2 jam lalu'],
    storage: 'own',
    schedulerReady: true,
    auto: true,
  },
  {
    id: 'rumah-idaman',
    name: 'Rumah Idaman',
    niche: 'properti',
    stage: 'Dipangkas',
    format: 'Talking head',
    hypothesis: 'Tur rumah subsidi dengan agen sebagai pembawa',
    day: 45,
    dayTotal: 45,
    vids: 40,
    vidsTotal: 30,
    viewsPerPost: 210,
    target: 1000,
    followersPerDay: 3,
    costPerMonth: 0,
    queue: 0,
    perDay: 0,
    trashed: 0,
    hue: 7,
    accounts: acc('off,off,off,off,off'),
    providers: [null, null, null, null, null],
    lastPost: ['', '', '', '', ''],
    storage: 'global',
    schedulerReady: false,
    auto: false,
  },
]

export const findChannel = (id: string | undefined) => CHANNELS.find((c) => c.id === id)
export const liveChannels = () => CHANNELS.filter((c) => c.stage !== 'Dipangkas')

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

export const activeAccounts = (c: Channel) => c.accounts.filter((a) => a !== 'off').length

/** Masalah yang perlu ditindak — dirakit dari kondisi akun & antrean. */
export function problems(c: Channel): string[] {
  const out: string[] = []
  if (!c.schedulerReady && c.stage !== 'Dipangkas') out.push('Scheduler kosong, posting terblokir')
  c.accounts.forEach((a, i) => {
    if (a === 'fail') out.push(`${PLATFORMS[i]} gagal tayang`)
    if (a === 'login') out.push(`Login ${PLATFORMS[i]} kedaluwarsa`)
  })
  return out
}

/** Post berstatus "Belum pasti" yang menunggu dikonfirmasi operator. */
export const UNCERTAIN = [{ channelId: 'otomotif-harian', platform: 2, count: 2 }]

/** Satu angka untuk lonceng notifikasi — sama dengan isi daftar "Perlu tindakan". */
export const actionCount = () => CHANNELS.reduce((s, c) => s + problems(c).length, 0) + UNCERTAIN.length

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
      ? c.auto && c.schedulerReady && c.queue > 0
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
const postsOn = (c: Channel, d: number) => c.auto && c.schedulerReady && stockDays(c) > d

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
  // Contoh bentrok: dua channel menunjuk akun Instagram yang sama, selisih 3 menit.
  const a = out.find((p) => p.channel.id === 'otomotif-harian' && p.day === 2 && p.h === 19)
  const b = out.find((p) => p.channel.id === 'tips-cuan' && p.day === 2 && p.h === 19)
  if (a && b) {
    b.m = a.m + 3
    const why = 'Akun Instagram yang sama dipakai 2 channel dalam 5 menit'
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
  return {
    channels: CHANNELS.length,
    accounts: CHANNELS.reduce((s, c) => s + activeAccounts(c), 0),
    views30: live.reduce((s, c) => s + c.viewsPerPost * c.perDay * 30 * activeAccounts(c), 0),
    cost: CHANNELS.reduce((s, c) => s + c.costPerMonth, 0),
    ready: recs.filter((r) => r === 'siap-panen').length,
    prune: recs.filter((r) => r === 'pangkas').length,
    seedling: CHANNELS.filter((c) => c.stage === 'Bibit').length,
  }
}

export const verdictLine = (c: Channel) => `${verdictHead(c)} — ${times(targetRatio(c))} target di hari ke-${c.day}.`
