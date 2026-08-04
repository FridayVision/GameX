import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import { EVENTS } from './socket-events'
import { getRoom, getRoomByCode } from './room-store'
import { findPlayerByToken, toPublicState } from './auth'
import type { AssignmentPayload } from '@/types/assignment.types'

// Store on process (truly process-global; immune to webpack module isolation in Next.js dev).
// global._socketIO was tried but Next.js webpack bundles shadow the Node.js `global` object.
type ProcessWithIO = NodeJS.Process & { __socketIO?: Server }

export function getIO(): Server {
  const io = (process as ProcessWithIO).__socketIO
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}

/** Build the confirmedPlayerIds list for the current round */
function getConfirmedPlayerIds(roomId: string): string[] {
  const room = getRoom(roomId)
  if (!room) return []
  return [...room.players.values()]
    .filter((p) => p.assignmentConfirmed && p.status !== 'removed' && p.status !== 'timedout')
    .map((p) => p.playerId)
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

    // Base payload always sent on board connect/reconnect
    const boardJoinPayload: Record<string, unknown> = {
      players: [...room.players.values()].map(toPublicState),
      status: room.status,
      bracketSize: room.bracketSize,
      roomCode: room.roomCode,
      topic: room.topic,
    }

    // Restore active-game state so board survives page refresh
    if (room.status === 'active') {
      boardJoinPayload.roundIndex = room.currentRound
      boardJoinPayload.totalRounds = Math.log2(room.bracketSize)
      boardJoinPayload.roundMatches = room.currentMatches.map((m) => ({
        matchId: m.matchId,
        matchIndex: m.matchIndex,
        itemA: m.itemA,
        itemB: m.itemB,
      }))
      boardJoinPayload.confirmedPlayerIds = getConfirmedPlayerIds(room.roomId)
    }

    socket.emit(EVENTS.PLAYER_JOINED, boardJoinPayload)

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

    const playerListPayload = {
      players: [...room.players.values()].map(toPublicState),
      status: room.status,
      bracketSize: room.bracketSize,
      roomCode: room.roomCode,
      topic: room.topic,
    }
    // Send full player list to the connecting socket
    socket.emit(EVENTS.PLAYER_JOINED, playerListPayload)
    // Broadcast reconnection to everyone else so their lists stay in sync
    socket.to(roomId).emit(EVENTS.PLAYER_JOINED, playerListPayload)
    board.to(roomId).emit(EVENTS.PLAYER_JOINED, {
      ...playerListPayload,
      // Include round state so board stays in sync on player reconnect
      ...(room.status === 'active' && {
        roundIndex: room.currentRound,
        totalRounds: Math.log2(room.bracketSize),
        roundMatches: room.currentMatches.map((m) => ({
          matchId: m.matchId,
          matchIndex: m.matchIndex,
          itemA: m.itemA,
          itemB: m.itemB,
        })),
        confirmedPlayerIds: getConfirmedPlayerIds(roomId),
      }),
    })

    // Re-send assignment to reconnecting player if game is active
    if (room.status === 'active') {
      const currentRound = room.currentRound
      const record = room.assignmentHistory.find(
        (r) => r.playerId === playerState.playerId && r.roundIndex === currentRound
      )
      if (record) {
        const item =
          room.survivingItems.find((i) => i.itemId === record.itemId) ??
          room.lockedItems.find((i) => i.itemId === record.itemId)
        if (item) {
          const payload: AssignmentPayload = {
            itemId: item.itemId,
            itemTitle: item.title,
            imageUrl: item.imageUrl,
            contextLine: item.contextLine,
            roundIndex: currentRound,
            totalRounds: Math.log2(room.bracketSize),
          }
          socket.emit(EVENTS.ASSIGNMENT, payload)
        }
      }
    }

    // Player confirms they've seen their assignment
    socket.on(EVENTS.ASSIGNMENT_CONFIRMED, () => {
      playerState.assignmentConfirmed = true
      const confirmedPlayerIds = getConfirmedPlayerIds(roomId)
      board.to(roomId).emit(EVENTS.ASSIGNMENT_CONFIRMED, { confirmedPlayerIds })
    })

    socket.on('disconnect', () => {
      playerState.socketId = null
      playerState.status = 'grace'
      // Delay PLAYER_LEFT by 300 ms — cancels if the player reconnects immediately
      // (handles page navigation where old socket closes before new one opens)
      const disconnectedId = playerState.playerId
      setTimeout(() => {
        if (playerState.socketId !== null) return // Already reconnected
        player.to(roomId).emit(EVENTS.PLAYER_LEFT, {
          playerId: disconnectedId,
          colour: playerState.colour,
        })
        board.to(roomId).emit(EVENTS.PLAYER_LEFT, {
          playerId: disconnectedId,
          colour: playerState.colour,
        })
      }, 300)
      console.log('[/player] disconnected', socket.id)
    })
  })

  console.log('[socket] /board and /player namespaces ready')
}
