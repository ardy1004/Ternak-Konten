/*
 * Titik masuk fungsi Vercel. scripts/build-vercel.ts membundel file ini (beserta
 * seluruh server/ dan dependensinya) menjadi SATU file:
 *   .vercel/output/functions/api.func/index.mjs
 * Tidak ada impor relatif yang perlu dipecahkan Vercel saat runtime.
 */
import { handle } from './app.js'
import { toNodeHandler } from './node-handler.js'

export default toNodeHandler(handle)
