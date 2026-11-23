// Mendaftarkan semua route (efek samping impor), lalu mengekspor satu pintu masuk.
import './routes/system.js'
import './routes/connections.js'
import './routes/channels.js'
import './routes/settings.js'

export { dispatch as handle } from './router.js'
