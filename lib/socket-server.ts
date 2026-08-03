import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'

export function initSocketServer(httpServer: HTTPServer): void {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  })

  const board = io.of('/board')
  const player = io.of('/player')

  board.on('connection', (socket) => {
    console.log('[/board] connected', socket.id)
    socket.on('disconnect', () => {
      console.log('[/board] disconnected', socket.id)
    })
  })

  player.on('connection', (socket) => {
    console.log('[/player] connected', socket.id)
    socket.on('disconnect', () => {
      console.log('[/player] disconnected', socket.id)
    })
  })

  console.log('[socket] /board and /player namespaces ready')
}
