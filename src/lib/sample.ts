/*
 * DATA CONTOH untuk mode demo — dipakai selama database belum tersambung.
 * Tidak pernah dipakai di mode sungguhan. Semua angka deterministik.
 */
import { DEFAULT_MONETIZATION_RULES } from '../../shared/contract'
import type { AccountState, AffiliateLink, Channel, Connection, LinkedProfile, RevenueEntry, Route } from './types'

const PLATFORM_COUNT = 5
export const SAMPLE_GLOBAL_STORAGE_ID = 'cld-global'

/**
 * [channel, platform, koneksi, handle khusus]. Satu baris = satu akun media sosial
 * yang tertaut di koneksi itu dan dipakai channel itu.
 * Instagram 'Tips Cuan' sengaja menunjuk akun milik 'Otomotif Harian' — contoh
 * kesalahan salin yang harus ditangkap peringatan akun ganda.
 */
const ROUTE_TABLE: [string, number, string, string?][] = [
  ['dapur-nenek', 0, 'buf-1'],
  ['dapur-nenek', 1, 'zer-1'],
  ['dapur-nenek', 2, 'zer-1'],
  ['dapur-nenek', 3, 'buf-1'],
  ['otomotif-harian', 0, 'buf-1'],
  ['otomotif-harian', 1, 'buf-1'],
  ['otomotif-harian', 2, 'buf-1', '@otomotif.harian'],
  ['otomotif-harian', 3, 'buf-1'],
  ['tips-cuan', 0, 'zer-1'],
  ['tips-cuan', 1, 'zer-1'],
  ['tips-cuan', 2, 'zer-1', '@otomotif.harian'],
  ['tips-cuan', 4, 'zer-1'],
  ['cerita-malam', 0, 'buf-1'],
  ['cerita-malam', 1, 'buf-1'],
  ['cerita-malam', 2, 'buf-1'],
  ['resep-kilat', 0, 'zer-2'],
  ['resep-kilat', 1, 'zer-2'],
  ['resep-kilat', 2, 'zer-2'],
  ['jalan-jogja', 0, 'buf-1'],
  ['jalan-jogja', 1, 'buf-1'],
  ['jalan-jogja', 2, 'buf-1'],
  ['jalan-jogja', 3, 'buf-1'],
  ['fakta-unik', 0, 'zer-1'],
  ['fakta-unik', 1, 'zer-1'],
  ['fakta-unik', 2, 'zer-1'],
  ['fakta-unik', 4, 'zer-1'],
]

const NAMES: Record<string, string> = {
  'dapur-nenek': 'Dapur Nenek',
  'otomotif-harian': 'Otomotif Harian',
  'tips-cuan': 'Tips Cuan',
  'cerita-malam': 'Cerita Malam',
  'resep-kilat': 'Resep Kilat',
  'jalan-jogja': 'Jalan-Jalan Jogja',
  'fakta-unik': 'Fakta Unik',
}

/** YouTube & Facebook memakai nama tampilan; platform lain memakai @handle. */
const handleFor = (channelId: string, platform: number) =>
  platform === 0 || platform === 3 ? NAMES[channelId] : `@${channelId.replace(/-/g, '')}`

const profileId = (conn: string, channelId: string, platform: number) => `${conn}:${channelId}:${platform}`

function profilesOf(conn: string): LinkedProfile[] {
  return ROUTE_TABLE.filter((r) => r[2] === conn).map(([ch, p, , handle]) => ({
    id: profileId(conn, ch, p),
    platform: p,
    handle: handle ?? handleFor(ch, p),
  }))
}

const CONNECTIONS: Connection[] = [
  {
    id: 'buf-1',
    provider: 'Buffer',
    label: 'Buffer Utama',
    keyHint: '9f2a',
    status: 'ok',
    testedAt: '23 Nov 14.02',
    // Satu akun tertaut yang belum dipakai channel mana pun.
    profiles: [...profilesOf('buf-1'), { id: 'buf-1:baru:1', platform: 1, handle: '@ceritapagi' }],
  },
  {
    id: 'zer-1',
    provider: 'Zernio',
    label: 'Zernio A',
    keyHint: 'c41e',
    status: 'ok',
    testedAt: '23 Nov 14.02',
    profiles: profilesOf('zer-1'),
  },
  {
    id: 'zer-2',
    provider: 'Zernio',
    label: 'Zernio B',
    keyHint: '07bd',
    status: 'error',
    testedAt: '23 Nov 14.02',
    error: 'API key ditolak (401) sejak 15 Nov',
    profiles: profilesOf('zer-2'),
  },
  {
    id: SAMPLE_GLOBAL_STORAGE_ID,
    provider: 'Cloudinary',
    label: 'Cloudinary Global',
    keyHint: '5d10',
    status: 'ok',
    testedAt: '23 Nov 09.00',
    profiles: [],
    cloudName: 'ternak-global',
    usage: { used: 12.4, limit: 25 },
  },
  {
    id: 'cld-a',
    provider: 'Cloudinary',
    label: 'Cloudinary Kuliner',
    keyHint: '88f3',
    status: 'ok',
    testedAt: '23 Nov 09.00',
    profiles: [],
    cloudName: 'ternak-kuliner',
    usage: { used: 21.8, limit: 25 },
  },
  {
    id: 'cld-b',
    provider: 'Cloudinary',
    label: 'Cloudinary B',
    keyHint: '2b7c',
    status: 'ok',
    testedAt: '23 Nov 09.00',
    profiles: [],
    cloudName: 'ternak-b',
    usage: { used: 9.1, limit: 25 },
  },
  {
    id: 'cld-c',
    provider: 'Cloudinary',
    label: 'Cloudinary C',
    keyHint: 'e0a4',
    status: 'ok',
    testedAt: '23 Nov 09.00',
    profiles: [],
    cloudName: 'ternak-c',
    usage: { used: 15.0, limit: 25 },
  },
]

function routesFor(channelId: string): (Route | null)[] {
  return Array.from({ length: PLATFORM_COUNT }, (_, p) => {
    const row = ROUTE_TABLE.find((r) => r[0] === channelId && r[1] === p)
    return row ? { connectionId: row[2], profileId: profileId(row[2], channelId, p) } : null
  })
}

// ─── Channel ──────────────────────────────────────────────────────────────────

const acc = (s: string) => s.split(',') as AccountState[]

type ChannelSeed = Omit<Channel, 'routes'>

const SEEDS: ChannelSeed[] = [
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
    lastPost: ['3 hari lalu', '2 jam lalu', '5 jam lalu', '1 hari lalu', ''],
    storageId: 'cld-a',
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
    lastPost: ['4 jam lalu', '6 jam lalu', '8 hari lalu', '1 hari lalu', ''],
    storageId: 'cld-b',
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
    lastPost: ['1 jam lalu', '3 jam lalu', '4 jam lalu', '', '9 jam lalu'],
    storageId: 'cld-b',
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
    lastPost: ['5 jam lalu', '8 hari lalu', '5 jam lalu', '', ''],
    storageId: 'cld-c',
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
    lastPost: ['8 hari lalu', '8 hari lalu', '8 hari lalu', '', ''],
    storageId: 'cld-a',
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
    lastPost: ['6 jam lalu', '6 jam lalu', '6 jam lalu', '6 jam lalu', ''],
    storageId: SAMPLE_GLOBAL_STORAGE_ID,
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
    lastPost: ['1 jam lalu', '1 jam lalu', '1 jam lalu', '', '2 jam lalu'],
    storageId: 'cld-c',
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
    lastPost: ['', '', '', '', ''],
    storageId: SAMPLE_GLOBAL_STORAGE_ID,
    auto: false,
  },
]

const CHANNELS: Channel[] = SEEDS.map((s) => ({ ...s, routes: routesFor(s.id) }))

const REVENUE: RevenueEntry[] = [
  { channelId: 'dapur-nenek', month: '2026-11', source: 'Shopee Affiliate', amount: 420000 },
  { channelId: 'dapur-nenek', month: '2026-11', source: 'TikTok Shop', amount: 310000 },
  { channelId: 'otomotif-harian', month: '2026-11', source: 'Shopee Affiliate', amount: 95000 },
  { channelId: 'tips-cuan', month: '2026-11', source: 'Shopee Affiliate', amount: 180000 },
  { channelId: 'tips-cuan', month: '2026-11', source: 'TikTok Shop', amount: 80000 },
  { channelId: 'resep-kilat', month: '2026-11', source: 'Shopee Affiliate', amount: 18000 },
  { channelId: 'fakta-unik', month: '2026-11', source: 'TikTok Shop', amount: 12000 },
  { channelId: 'dapur-nenek', month: '2026-10', source: 'Shopee Affiliate', amount: 260000 },
  { channelId: 'dapur-nenek', month: '2026-10', source: 'TikTok Shop', amount: 150000 },
  { channelId: 'otomotif-harian', month: '2026-10', source: 'Shopee Affiliate', amount: 40000 },
  { channelId: 'tips-cuan', month: '2026-10', source: 'Shopee Affiliate', amount: 70000 },
  { channelId: 'rumah-idaman', month: '2026-10', source: 'Shopee Affiliate', amount: 9000 },
]

const LINKS: AffiliateLink[] = [
  { id: 'l1', channelId: 'dapur-nenek', code: 'dn-wajan', title: 'Wajan anti lengket 28 cm', program: 'Shopee Affiliate', clicks30: 412 },
  { id: 'l2', channelId: 'dapur-nenek', code: 'dn-spatula', title: 'Set spatula silikon', program: 'TikTok Shop', clicks30: 268 },
  { id: 'l3', channelId: 'dapur-nenek', code: 'dn-rendang', title: 'Bumbu rendang instan', program: 'Shopee Affiliate', clicks30: 155 },
  { id: 'l4', channelId: 'tips-cuan', code: 'tc-buku', title: 'Buku keuangan pribadi', program: 'Shopee Affiliate', clicks30: 233 },
  { id: 'l5', channelId: 'tips-cuan', code: 'tc-dompet', title: 'Dompet kartu RFID', program: 'TikTok Shop', clicks30: 41 },
  { id: 'l6', channelId: 'otomotif-harian', code: 'oh-obd', title: 'OBD2 scanner bluetooth', program: 'Shopee Affiliate', clicks30: 120 },
  {
    id: 'l7',
    channelId: 'otomotif-harian',
    code: 'oh-kompresor',
    title: 'Kompresor ban portabel',
    program: 'Shopee Affiliate',
    clicks30: 18,
  },
  { id: 'l8', channelId: 'resep-kilat', code: 'rk-blender', title: 'Blender mini portabel', program: 'Shopee Affiliate', clicks30: 22 },
  { id: 'l9', channelId: 'fakta-unik', code: 'fu-teleskop', title: 'Teleskop anak', program: 'TikTok Shop', clicks30: 9 },
]

/** Baris contoh laporan komisi untuk pratinjau impor CSV. */
const IMPORT_PREVIEW = [
  { date: '21 Nov', product: 'Wajan anti lengket 28 cm', subId: 'dn-wajan', commission: 18500 },
  { date: '21 Nov', product: 'Buku keuangan pribadi', subId: 'tc-buku', commission: 9800 },
  { date: '22 Nov', product: 'OBD2 scanner bluetooth', subId: 'oh-obd', commission: 14200 },
  { date: '22 Nov', product: 'Bumbu rendang instan', subId: 'dn-rendang', commission: 3100 },
  { date: '22 Nov', product: 'Sarung tangan oven', subId: 'zz-lama', commission: 2400 },
]

export function sampleData() {
  return {
    channels: CHANNELS,
    connections: CONNECTIONS,
    revenue: REVENUE,
    links: LINKS,
    importPreview: IMPORT_PREVIEW,
    uncertain: [{ channelId: 'otomotif-harian', platform: 2, count: 2 }],
    globalStorageId: SAMPLE_GLOBAL_STORAGE_ID,
    monetizationRules: DEFAULT_MONETIZATION_RULES,
  }
}
