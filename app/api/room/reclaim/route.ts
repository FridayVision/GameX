import { NextResponse } from 'next/server'
import { getRoomByCode, updateRoom } from '@/lib/room-store'
import { generateToken } from '@/lib/auth'
import { EVENTS } from '@/lib/socket-events'
import { getIO, clearGraceTimer } from '@/lib/socket-server'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { roomCode, reclaimCode } = body as { roomCode?: unknown; reclaimCode?: unknown }

  if (typeof roomCode !== 'string' || typeof reclaimCode !== 'string') {
    return NextResponse.json({ error: 'roomCode and reclaimCode are required' }, { status: 400 })
  }

  const room = getRoomByCode(roomCode)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  if (reclaimCode.toLowerCase() !== room.reclaimCode) {
    return NextResponse.json({ error: 'Invalid reclaim code' }, { status: 401 })
  }

  const newHostToken = generateToken()
  updateRoom(room.roomId, { hostToken: newHostToken })

  const hostPlayer = [...room.players.values()].find((p) => p.isHost)
  if (!hostPlayer) {
    return NextResponse.json({ error: 'Host player record not found' }, { status: 500 })
  }

  // Clear host grace timer and notify clients of reconnect
  clearGraceTimer(`${room.roomId}:${hostPlayer.playerId}`)
  try {
    const io = getIO()
    io.of('/board')
      .to(room.roomId)
      .emit(EVENTS.HOST_RECONNECTED, { hostName: hostPlayer.displayName })
    io.of('/player')
      .to(room.roomId)
      .emit(EVENTS.HOST_RECONNECTED, { hostName: hostPlayer.displayName })
  } catch {
    // Non-fatal
  }

  return NextResponse.json({
    hostToken: newHostToken,
    playerToken: hostPlayer.playerToken,
    playerId: hostPlayer.playerId,
    roomId: room.roomId,
  })
}
