import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import { EVENTS } from './socket-events'
import { getRoom, getRoomByCode } from './room-store'
import { findPlayerByToken, toPublicState } from './auth'
import { drawRound, runAssignment } from './bracket-engine'
import type { AssignmentPayload } from '@/types/assignment.types'
import type { Match, MatchPublic } from '@/types/match.types'
import type { RoomState } from '@/types/room.types'

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

function toMatchPublic(match: Match, totalMatches: number): MatchPublic {
  return {
    matchId: match.matchId,
    matchIndex: match.matchIndex,
    roundIndex: match.roundIndex,
    totalMatches,
    itemA: match.itemA,
    itemB: match.itemB,
    phase: match.phase,
  }
}

function getCurrentVotes(room: RoomState): Array<{ colour: string; side: 'A' | 'B' }> {
  const match = room.currentMatches[room.currentMatchIndex]
  if (!match) return []
  return Object.entries(match.votes).map(([pid, side]) => {
    const p = room.players.get(pid)
    return { colour: p?.colour ?? '#ffffff', side }
  })
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
      const activeMatch = room.currentMatches[room.currentMatchIndex]
      boardJoinPayload.currentMatch =
        activeMatch && activeMatch.phase !== 'pending'
          ? toMatchPublic(activeMatch, room.currentMatches.length)
          : null
      boardJoinPayload.currentVotes = getCurrentVotes(room)
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
    // Send full player list to the connecting socket (include confirmedPlayerIds for host)
    socket.emit(EVENTS.PLAYER_JOINED, {
      ...playerListPayload,
      ...(room.status === 'active' && {
        roundIndex: room.currentRound,
        totalRounds: Math.log2(room.bracketSize),
        confirmedPlayerIds: getConfirmedPlayerIds(roomId),
      }),
    })
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

      // Re-send current match state to reconnecting player
      const activeMatch = room.currentMatches[room.currentMatchIndex]
      if (activeMatch && activeMatch.phase !== 'pending') {
        socket.emit(EVENTS.MATCH_START, toMatchPublic(activeMatch, room.currentMatches.length))
        // Re-send all current votes
        const votes = getCurrentVotes(room)
        for (const vote of votes) {
          socket.emit(EVENTS.PLAYER_VOTE, vote)
        }
        // Re-send vote result if voting is complete
        if (activeMatch.phase === 'result') {
          const winnerItem = activeMatch.winner === 'A' ? activeMatch.itemA : activeMatch.itemB
          socket.emit(EVENTS.VOTE_RESULT, { side: activeMatch.winner, winnerItem })
        } else if (activeMatch.phase === 'tied') {
          socket.emit(EVENTS.VOTE_RESULT, { side: 'tie', winnerItem: null })
        } else if (activeMatch.phase === 'voting') {
          socket.emit(EVENTS.VOTE_OPEN, { matchId: activeMatch.matchId })
        }
      }
    }

    // Player confirms they've seen their assignment
    socket.on(EVENTS.ASSIGNMENT_CONFIRMED, () => {
      playerState.assignmentConfirmed = true
      const confirmedPlayerIds = getConfirmedPlayerIds(roomId)
      board.to(roomId).emit(EVENTS.ASSIGNMENT_CONFIRMED, { confirmedPlayerIds })
      // Also broadcast to player namespace so the host's player socket can track it
      player.to(roomId).emit(EVENTS.ASSIGNMENT_CONFIRMED, { confirmedPlayerIds })
    })

    socket.on(EVENTS.HOST_NEXT_MATCH, () => {
      // validate host
      if (playerState.playerId !== room.hostId) return

      const totalMatches = room.currentMatches.length
      const currentMatch = room.currentMatches[room.currentMatchIndex]

      if (!currentMatch) return

      // Phase: pending → start this match (debate phase)
      // Gate: all active players must have confirmed their assignment first
      if (currentMatch.phase === 'pending') {
        const activePlayers = [...room.players.values()].filter(
          (p) => p.status !== 'removed' && p.status !== 'timedout'
        )
        const confirmed = getConfirmedPlayerIds(roomId)
        if (confirmed.length < activePlayers.length) return // block until everyone's ready

        currentMatch.phase = 'debate'
        const pub = toMatchPublic(currentMatch, totalMatches)
        board.to(roomId).emit(EVENTS.MATCH_START, pub)
        player.to(roomId).emit(EVENTS.MATCH_START, pub)
        return
      }

      // Guard: only advance from result or tied (after coin flip)
      if (currentMatch.phase !== 'result' && currentMatch.phase !== 'tied') return
      // If tied but no winner (coin flip not done), block
      if (currentMatch.phase === 'tied' && !currentMatch.winner) return

      // Advance — record match result
      const winnerId =
        currentMatch.winner === 'A' ? currentMatch.itemA.itemId : currentMatch.itemB.itemId
      room.matchHistory.push({
        roundIndex: currentMatch.roundIndex,
        matchIndex: currentMatch.matchIndex,
        itemAId: currentMatch.itemA.itemId,
        itemBId: currentMatch.itemB.itemId,
        winnerId,
        tiebroken: currentMatch.tiebroken,
      })

      board.to(roomId).emit(EVENTS.MATCH_END, { matchId: currentMatch.matchId })
      player.to(roomId).emit(EVENTS.MATCH_END, { matchId: currentMatch.matchId })

      room.currentMatchIndex++

      if (room.currentMatchIndex < room.currentMatches.length) {
        // More matches in this round
        const nextMatch = room.currentMatches[room.currentMatchIndex]
        nextMatch.phase = 'debate'
        const pub = toMatchPublic(nextMatch, totalMatches)
        board.to(roomId).emit(EVENTS.MATCH_START, pub)
        player.to(roomId).emit(EVENTS.MATCH_START, pub)
        return
      }

      // Round complete — collect survivors
      const survivors = room.matchHistory
        .filter((r) => r.roundIndex === room.currentRound)
        .map((r) => room.lockedItems.find((i) => i.itemId === r.winnerId)!)
        .filter(Boolean)

      // Update survivingItems
      room.survivingItems = survivors

      if (survivors.length === 1) {
        // Game over
        room.status = 'ended'
        board.to(roomId).emit(EVENTS.GAME_OVER, { champion: survivors[0] })
        player.to(roomId).emit(EVENTS.GAME_OVER, { champion: survivors[0] })
        return
      }

      // Draw next round
      room.currentRound++
      room.currentMatches = drawRound(survivors, room.currentRound)
      room.currentMatchIndex = 0

      // Run assignments
      const records = runAssignment(room, room.currentRound)
      room.assignmentHistory.push(...records)
      for (const record of records) {
        const p = room.players.get(record.playerId)
        if (p) {
          p.lastAssignedItemId = record.itemId
          p.assignmentConfirmed = false
        }
      }

      const totalRounds = Math.log2(room.bracketSize)
      const newRoundMatches = room.currentMatches.map((m) =>
        toMatchPublic(m, room.currentMatches.length)
      )

      board.to(roomId).emit(EVENTS.ROUND_END, { roundIndex: room.currentRound - 1 })
      player.to(roomId).emit(EVENTS.ROUND_END, { roundIndex: room.currentRound - 1 })

      board.to(roomId).emit(EVENTS.ROUND_START, {
        roundIndex: room.currentRound,
        totalRounds,
        matches: newRoundMatches,
      })
      player.to(roomId).emit(EVENTS.ROUND_START, {
        roundIndex: room.currentRound,
        totalRounds,
      })

      // Send individual assignments
      for (const record of records) {
        const p = room.players.get(record.playerId)
        if (!p || p.status === 'removed' || !p.socketId) continue
        const item =
          room.survivingItems.find((i) => i.itemId === record.itemId) ??
          room.lockedItems.find((i) => i.itemId === record.itemId)
        if (!item) continue
        const assignPayload: AssignmentPayload = {
          itemId: item.itemId,
          itemTitle: item.title,
          imageUrl: item.imageUrl,
          contextLine: item.contextLine,
          roundIndex: room.currentRound,
          totalRounds,
        }
        player.to(p.socketId).emit(EVENTS.ASSIGNMENT, assignPayload)
      }
    })

    socket.on(EVENTS.HOST_CALL_VOTE, () => {
      if (playerState.playerId !== room.hostId) return
      const currentMatch = room.currentMatches[room.currentMatchIndex]
      if (!currentMatch || currentMatch.phase !== 'debate') return
      currentMatch.phase = 'voting'
      board.to(roomId).emit(EVENTS.VOTE_OPEN, { matchId: currentMatch.matchId })
      player.to(roomId).emit(EVENTS.VOTE_OPEN, { matchId: currentMatch.matchId })
    })

    socket.on(EVENTS.PLAYER_VOTE, ({ matchId, side }: { matchId: string; side: 'A' | 'B' }) => {
      const currentMatch = room.currentMatches[room.currentMatchIndex]
      if (!currentMatch || currentMatch.matchId !== matchId) return
      if (currentMatch.phase !== 'voting') return
      const playerId = playerState.playerId
      if (playerId in currentMatch.votes) return // already voted
      currentMatch.votes[playerId] = side
      const colour = playerState.colour
      board.to(roomId).emit(EVENTS.PLAYER_VOTE, { colour, side })
      player.to(roomId).emit(EVENTS.PLAYER_VOTE, { colour, side })

      // Check all-voted
      const connectedPlayerIds = [...room.players.values()]
        .filter((p) => p.status === 'connected' || p.status === 'grace')
        .map((p) => p.playerId)
      const allVoted = connectedPlayerIds.every((pid) => pid in currentMatch.votes)
      if (!allVoted) return

      const aCount = Object.values(currentMatch.votes).filter((v) => v === 'A').length
      const bCount = Object.values(currentMatch.votes).filter((v) => v === 'B').length

      if (aCount > bCount) {
        currentMatch.winner = 'A'
        currentMatch.phase = 'result'
        board.to(roomId).emit(EVENTS.VOTE_RESULT, { side: 'A', winnerItem: currentMatch.itemA })
        player.to(roomId).emit(EVENTS.VOTE_RESULT, { side: 'A', winnerItem: currentMatch.itemA })
      } else if (bCount > aCount) {
        currentMatch.winner = 'B'
        currentMatch.phase = 'result'
        board.to(roomId).emit(EVENTS.VOTE_RESULT, { side: 'B', winnerItem: currentMatch.itemB })
        player.to(roomId).emit(EVENTS.VOTE_RESULT, { side: 'B', winnerItem: currentMatch.itemB })
      } else {
        currentMatch.phase = 'tied'
        board.to(roomId).emit(EVENTS.VOTE_RESULT, { side: 'tie', winnerItem: null })
        player.to(roomId).emit(EVENTS.VOTE_RESULT, { side: 'tie', winnerItem: null })
      }
    })

    socket.on(EVENTS.HOST_COIN_FLIP, () => {
      if (playerState.playerId !== room.hostId) return
      const currentMatch = room.currentMatches[room.currentMatchIndex]
      if (!currentMatch || currentMatch.phase !== 'tied') return
      const result = Math.random() < 0.5 ? 'heads' : 'tails'
      const side: 'A' | 'B' = result === 'heads' ? 'A' : 'B'
      const winnerItem = side === 'A' ? currentMatch.itemA : currentMatch.itemB
      currentMatch.winner = side
      currentMatch.tiebroken = true
      currentMatch.phase = 'result'
      board.to(roomId).emit(EVENTS.COIN_FLIP, { result, side, winnerItem })
      player.to(roomId).emit(EVENTS.COIN_FLIP, { result, side, winnerItem })
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
