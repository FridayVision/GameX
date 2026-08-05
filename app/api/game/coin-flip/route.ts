import { NextRequest, NextResponse } from 'next/server'
import { getRoomByCode } from '@/lib/room-store'
import { getIO } from '@/lib/socket-server'
import { EVENTS } from '@/lib/socket-events'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const hostToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  const body = await req.json().catch(() => ({}))
  const { roomCode, matchId } = body as { roomCode?: string; matchId?: string }

  if (!hostToken) return NextResponse.json({ error: 'Missing host token' }, { status: 401 })
  if (!roomCode) return NextResponse.json({ error: 'roomCode required' }, { status: 400 })

  const room = getRoomByCode(roomCode)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostToken !== hostToken)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const currentMatch = room.currentMatches[room.currentMatchIndex]
  if (!currentMatch) return NextResponse.json({ error: 'No active match' }, { status: 400 })
  if (matchId && currentMatch.matchId !== matchId)
    return NextResponse.json({ error: 'Match ID mismatch' }, { status: 400 })
  if (currentMatch.phase !== 'tied')
    return NextResponse.json({ error: 'Match is not tied' }, { status: 400 })

  const result = Math.random() < 0.5 ? 'heads' : 'tails'
  const side: 'A' | 'B' = result === 'heads' ? 'A' : 'B'
  const winnerItem = side === 'A' ? currentMatch.itemA : currentMatch.itemB
  currentMatch.winner = side
  currentMatch.tiebroken = true
  currentMatch.phase = 'result'

  let io
  try {
    io = getIO()
  } catch {
    return NextResponse.json({ error: 'Socket server not ready' }, { status: 500 })
  }

  io.of('/board').to(room.roomId).emit(EVENTS.COIN_FLIP, { result, side, winnerItem })
  io.of('/player').to(room.roomId).emit(EVENTS.COIN_FLIP, { result, side, winnerItem })

  return NextResponse.json({ result, side, winnerItemId: winnerItem.itemId })
}
