import { NextRequest, NextResponse } from 'next/server'
import { getRoomByCode, updateRoom } from '@/lib/room-store'
import { validateHostToken } from '@/lib/auth'
import { getIO } from '@/lib/socket-server'
import { EVENTS } from '@/lib/socket-events'
import { drawRound, runAssignment } from '@/lib/bracket-engine'
import type { AssignmentPayload } from '@/types/assignment.types'

function tryGetIO() {
  try {
    return getIO()
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const hostToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  const body = await req.json().catch(() => ({}))
  const { roomCode } = body as { roomCode?: string }

  if (!roomCode) return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })
  if (!hostToken) return NextResponse.json({ error: 'Missing host token' }, { status: 401 })

  const room = getRoomByCode(roomCode)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (!validateHostToken(room.roomId, hostToken))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  if (room.status !== 'lobby')
    return NextResponse.json({ error: 'Game already started or pool not ready' }, { status: 409 })
  if (room.lockedItems.length === 0)
    return NextResponse.json({ error: 'Pool not locked yet' }, { status: 409 })

  const totalRounds = Math.log2(room.bracketSize)

  // Draw Round 1 — survivingItems was set to lockedItems at pool lock time
  const matches = drawRound(room.survivingItems, 0)

  // Run assignments — reads room.survivingItems and room.players
  const records = runAssignment(room, 0)

  // Update each player's lastAssignedItemId and reset confirmation (Map mutation, no updateRoom needed)
  const itemMap = new Map(room.survivingItems.map((item) => [item.itemId, item]))
  for (const [, player] of room.players) {
    player.assignmentConfirmed = false
  }
  for (const record of records) {
    const player = room.players.get(record.playerId)
    if (player) player.lastAssignedItemId = record.itemId
  }

  updateRoom(room.roomId, {
    status: 'active',
    currentRound: 0,
    currentMatchIndex: 0,
    currentMatches: matches,
    assignmentHistory: [...room.assignmentHistory, ...records],
  })

  const io = tryGetIO()
  if (io) {
    // ROUND_START → /board: full match pairs, no assignment data
    const roundStartPayload = {
      roundIndex: 0,
      totalRounds,
      matches: matches.map((m) => ({
        matchId: m.matchId,
        matchIndex: m.matchIndex,
        itemA: m.itemA,
        itemB: m.itemB,
      })),
    }
    io.of('/board').to(room.roomId).emit(EVENTS.ROUND_START, roundStartPayload)

    // ROUND_START → /player room channel: round info only (no match details, no assignments)
    io.of('/player').to(room.roomId).emit(EVENTS.ROUND_START, { roundIndex: 0, totalRounds })

    // ASSIGNMENT → each /player socket individually (secret — never to /board)
    for (const record of records) {
      const player = room.players.get(record.playerId)
      const item = itemMap.get(record.itemId)
      if (!player?.socketId || !item) continue

      const payload: AssignmentPayload = {
        itemId: item.itemId,
        itemTitle: item.title,
        imageUrl: item.imageUrl,
        contextLine: item.contextLine,
        roundIndex: 0,
        totalRounds,
      }
      io.of('/player').to(player.socketId).emit(EVENTS.ASSIGNMENT, payload)
    }
  }

  return NextResponse.json({ ok: true })
}
