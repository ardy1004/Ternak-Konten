import { Link, useParams } from 'react-router'
import { Monogram } from '../components/domain'
import { Icon } from '../components/Icon'
import { findChannel, LINKS, linksOf } from '../lib/mock'

/*
 * Halaman PUBLIK — dibuka penonton dari link di bio, tanpa login.
 * Jangan tampilkan apa pun yang internal (hipotesis, tahap eksperimen, angka,
 * nama aplikasi ini): penonton hanya perlu melihat channel & produknya.
 */

const TAGLINE: Record<string, string> = {
  kuliner: 'Resep rumahan yang gampang ditiru.',
  otomotif: 'Cek dulu sebelum beli mobil bekas.',
  keuangan: 'Satu tips uang, tiap hari.',
  horor: 'Cerita seram sebelum tidur.',
  edukasi: 'Fakta singkat yang jarang orang tahu.',
  travel: 'Tempat gratis yang layak didatangi.',
  properti: 'Seputar rumah pertama.',
}

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper p-6 text-center">
      <p className="disp text-[32px]">Halaman tidak ditemukan.</p>
    </main>
  )
}

export function LinkInBio() {
  const { id } = useParams()
  const c = findChannel(id)
  if (!c || c.stage === 'Dipangkas') return <NotFound />
  const links = linksOf(c.id)
  return (
    <main className="min-h-screen bg-paper px-5 py-12 pb-[max(3rem,env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Monogram name={c.name} s={72} ink />
          </div>
          <h1 className="disp text-[40px]">{c.name}</h1>
          <p className="mt-1 text-ink2">{TAGLINE[c.niche] ?? ''}</p>
        </div>
        <ul className="space-y-3">
          {links.map((l) => (
            <li key={l.id}>
              <a href={`/r/${l.code}`} rel="nofollow sponsored" className="box flex items-center justify-between gap-3 p-4 hover:bg-sand">
                <span>
                  <span className="block font-semibold">{l.title}</span>
                  <span className="text-[12px] text-muted">
                    {l.program === 'Lainnya' ? 'Toko online' : l.program.replace(' Affiliate', '')}
                  </span>
                </span>
                <Icon n="chev" />
              </a>
            </li>
          ))}
          {links.length === 0 && <li className="text-center text-muted">Belum ada produk.</li>}
        </ul>
        <p className="mt-8 text-center text-[12px] text-muted">
          Sebagian link di halaman ini adalah link afiliasi: kami bisa mendapat komisi tanpa biaya tambahan untukmu.
        </p>
      </div>
    </main>
  )
}

/**
 * /r/:code — di versi live ini dikerjakan server: catat klik, lalu alihkan 302 ke
 * URL afiliasi asli. Selama belum ada backend, halaman ini hanya menjelaskan.
 */
export function AffiliateRedirect() {
  const { code } = useParams()
  const link = LINKS.find((l) => l.code === code)
  if (!link) return <NotFound />
  return (
    <main className="grid min-h-screen place-items-center bg-paper p-6">
      <div className="max-w-sm text-center">
        <p className="disp mb-3 text-[28px]">Mengalihkan ke {link.program.replace(' Affiliate', '')}…</p>
        <p className="mb-6 text-[13px] text-muted">
          Pratinjau: di versi live, klik dicatat lalu penonton langsung diteruskan ke halaman produk “{link.title}”.
        </p>
        <Link to={`/l/${link.channelId}`} className="btn btn-outline">
          Kembali
        </Link>
      </div>
    </main>
  )
}
