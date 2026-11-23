import { boolean, integer, jsonb, pgTable, primaryKey, real, smallint, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

/** Bank kredensial. Secret hanya tersimpan terenkripsi (AES-256-GCM) di secret_enc. */
export const connections = pgTable('connections', {
  id: text('id').primaryKey(),
  provider: text('provider', { enum: ['buffer', 'zernio', 'cloudinary'] }).notNull(),
  label: text('label').notNull(),
  secretEnc: text('secret_enc').notNull(),
  keyHint: text('key_hint').notNull(),
  cloudName: text('cloud_name'),
  status: text('status', { enum: ['ok', 'error', 'untested'] })
    .notNull()
    .default('untested'),
  error: text('error'),
  testedAt: timestamp('tested_at', { withTimezone: true }),
  usageUsed: real('usage_used'),
  usageLimit: real('usage_limit'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

/** Akun media sosial yang tertaut di dalam satu koneksi Buffer/Zernio. */
export const linkedProfiles = pgTable(
  'linked_profiles',
  {
    id: text('id').primaryKey(),
    connectionId: text('connection_id')
      .notNull()
      .references(() => connections.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    platform: smallint('platform').notNull(),
    handle: text('handle').notNull(),
    /** Tidak muncul lagi di provider saat tes terakhir. Dipertahankan bila masih dirujuk channel. */
    missing: boolean('missing').notNull().default(false),
  },
  (t) => [uniqueIndex('linked_profiles_conn_ext').on(t.connectionId, t.externalId)],
)

export const channels = pgTable('channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  niche: text('niche').notNull(),
  stage: text('stage', { enum: ['Bibit', 'Tumbuh', 'Panen', 'Dipangkas'] })
    .notNull()
    .default('Bibit'),
  format: text('format').notNull().default('Faceless'),
  hypothesis: text('hypothesis').notNull().default(''),
  email: text('email').notNull().default(''),
  captionTemplate: text('caption_template').notNull().default(''),
  hashtags: text('hashtags').array().notNull().default([]),
  dayTotal: integer('day_total').notNull().default(30),
  vidsTotal: integer('vids_total').notNull().default(30),
  targetMetric: text('target_metric').notNull().default('Median views/post'),
  targetValue: real('target_value').notNull().default(1000),
  costPerMonth: integer('cost_per_month').notNull().default(0),
  perDay: smallint('per_day').notNull().default(1),
  scheduleMode: text('schedule_mode', { enum: ['auto', 'manual'] })
    .notNull()
    .default('auto'),
  manualSlots: text('manual_slots').array().notNull().default([]),
  /** null = ikut storage global di pengaturan. */
  storageConnectionId: text('storage_connection_id').references(() => connections.id, { onDelete: 'restrict' }),
  auto: boolean('auto').notNull().default(false),
  /** null = masa uji belum dimulai. */
  startedAt: timestamp('started_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

/** Satu baris per platform yang dipakai channel. Kredensial tetap di connections. */
export const channelRoutes = pgTable(
  'channel_routes',
  {
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    platform: smallint('platform').notNull(),
    connectionId: text('connection_id')
      .notNull()
      .references(() => connections.id, { onDelete: 'restrict' }),
    profileId: text('profile_id')
      .notNull()
      .references(() => linkedProfiles.id, { onDelete: 'restrict' }),
  },
  (t) => [primaryKey({ columns: [t.channelId, t.platform] })],
)

/** Pengaturan workspace sebagai dokumen JSON per kunci. */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: updatedAt(),
})
