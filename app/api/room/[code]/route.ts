import { NextResponse } from 'next/server'
import { getRoomByCode } from '@/lib/room-store'

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const room = getRoomByCode(code)

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const hostPlayer = [...room.players.values()].find((p) => p.isHost)
  const takenColours = [...room.players.values()].map((p) => p.colour)

  return NextResponse.json({
    roomId: room.roomId,
    roomCode: room.roomCode,
    bracketSize: room.bracketSize,
    status: room.status,
    hostName: hostPlayer?.displayName ?? '',
    takenColours,
  })
}
