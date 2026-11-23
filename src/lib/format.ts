const pad2 = (n: number) => String(n).padStart(2, '0')

/** 1284300 → "1.284.300" */
export const num = (n: number) => Math.round(n).toLocaleString('id-ID')

/** 180000 → "Rp 180rb", 1240000 → "Rp 1.240.000" */
export const rupiahShort = (n: number) => (n === 0 ? 'Rp 0' : n >= 1e6 ? `Rp ${num(n)}` : `Rp ${Math.round(n / 1000)}rb`)

/** 1.24 → "1,2×" */
export const times = (x: number) => `${x.toFixed(1).replace('.', ',')}×`

/** 42 → "0:42" */
export const duration = (s: number) => `${Math.floor(s / 60)}:${pad2(s % 60)}`

/** (19, 5) → "19.05" — format jam Indonesia. */
export const clock = (h: number, m: number) => `${pad2(h)}.${pad2(m)}`

/** "Jalan-Jalan Jogja" → "JJ" */
export const monogram = (name: string) =>
  name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
