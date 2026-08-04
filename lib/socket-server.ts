import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import { EVENTS } from './socket-events'
import { getRoom, getRoomByCode } from './room-store'
import { findPlayerByToken, toPublicState } from './auth'

// Store on process (truly process-global; immune to webpack module isolation in Next.js dev).
// global._socketIO was tried but Next.js webpack bundles shadow the Node.js `global` object.
type ProcessWithIO = NodeJS.Process & { __socketIO?: Server }

export function getIO(): Server {
  const io = (process as ProcessWithIO).__socketIO
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}

export function initSocketServer(httpServer: HTTPServer): void {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  })
  ;(process as ProcessWithIO).__socketIO = io

  const board = io.of('/board')
  const player = io.of('/player')

  board.on('connection', (socket) => {
    const { roomCode } = socket.handshake.auth as { roomCode?: string }
    if (!roomCode) {
      socket.disconnect(true)
      return
    }

    const room = getRoomByCode(roomCode)
    if (!room) {
      socket.disconnect(true)
      return
    }

    socket.join(room.roomId)
    socket.emit(EVENTS.PLAYER_JOINED, {
      players: [...room.players.values()].map(toPublicState),
      status: room.status,
      bracketSize: room.bracketSize,
      roomCode: room.roomCode,
      topic: room.topic,
    })

    socket.on('disconnect', () => {
      console.log('[/board] disconnected', socket.id)
    })
  })

  player.on('connection', (socket) => {
    const { playerToken, roomId } = socket.handshake.auth as {
      playerToken?: string
      roomId?: string
    }
    if (!playerToken || !roomId) {
      socket.disconnect(true)
      return
    }

    const room = getRoom(roomId)
    const playerState = room ? findPlayerByToken(roomId, playerToken) : undefined
    if (!room || !playerState) {
      socket.disconnect(true)
      return
    }

    playerState.socketId = socket.id
    playerState.status = 'connected'
    socket.join(roomId)

    socket.emit(EVENTS.PLAYER_JOINED, {
      players: [...room.players.values()].map(toPublicState),
      status: room.status,
      bracketSize: room.bracketSize,
      roomCode: room.roomCode,
      topic: room.topic,
    })

    socket.on('disconnect', () => {
      playerState.socketId = null
      playerState.status = 'grace'
      // Full 60s grace timer implemented in M6; for now emit immediately
      player.to(roomId).emit(EVENTS.PLAYER_LEFT, {
        playerId: playerState.playerId,
        colour: playerState.colour,
      })
      console.log('[/player] disconnected', socket.id)
    })
  })

  console.log('[socket] /board and /player namespaces ready')
}
