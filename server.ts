import { createServer } from 'http'
import { spawnSync } from 'child_process'
import next from 'next'
import { initSocketServer } from './lib/socket-server'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT ?? '3000', 10)

// Verify python3 is available — required for pool generation
const pyCheck = spawnSync('python3', ['--version'], { encoding: 'utf8' })
if (pyCheck.error || pyCheck.status !== 0) {
  console.warn(
    '[server] WARNING: python3 not found — pool generation will fail. ' +
      'Install Python 3 and ensure it is on PATH.'
  )
} else {
  console.log(`[server] python3 found: ${(pyCheck.stdout || pyCheck.stderr).trim()}`)
}

const app = next({ dev })
const handler = app.getRequestHandler()

app
  .prepare()
  .then(() => {
    const httpServer = createServer(handler)

    initSocketServer(httpServer)

    httpServer.listen(port, () => {
      console.log(`> Ready on http://localhost:${port} [${dev ? 'dev' : 'prod'}]`)
    })
  })
  .catch((err) => {
    console.error('[server] Failed to prepare Next.js app:', err)
    process.exit(1)
  })
