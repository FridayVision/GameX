import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import { EVENTS } from './socket-events'

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
  // EVENTS will be used in M2 handlers (e.g. EVENTS.PLAYER_JOINED, EVENTS.ASSIGNMENT, etc.)
  void EVENTS
}
