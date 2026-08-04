import { NextResponse } from 'next/server'
import { getRoomByCode, updateRoom } from '@/lib/room-store'
import { generateToken } from '@/lib/auth'
import { EVENTS } from '@/lib/socket-events'
import { getIO } from '@/lib/socket-server'

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

  // Notify clients — full host reconnect logic handled in M6
  try {
    const io = getIO()
    io.of('/board').to(room.roomId).emit(EVENTS.HOST_DISCONNECTED, { reconnected: true })
    io.of('/player').to(room.roomId).emit(EVENTS.HOST_DISCONNECTED, { reconnected: true })
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
