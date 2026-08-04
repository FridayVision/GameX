import { NextResponse } from 'next/server'
import { createRoom, updateRoom } from '@/lib/room-store'
import { generateToken } from '@/lib/auth'
import type { BracketSize } from '@/types/room.types'

const VALID_BRACKET_SIZES: BracketSize[] = [8, 16, 32]

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { bracketSize, hostName } = body as { bracketSize?: unknown; hostName?: unknown }

  if (!VALID_BRACKET_SIZES.includes(bracketSize as BracketSize)) {
    return NextResponse.json({ error: 'bracketSize must be 8, 16, or 32' }, { status: 400 })
  }

  const name = typeof hostName === 'string' ? hostName.trim() : ''
  if (name.length === 0 || name.length > 25) {
    return NextResponse.json({ error: 'hostName must be 1–25 characters' }, { status: 400 })
  }

  const room = createRoom({ bracketSize: bracketSize as BracketSize })
  const hostToken = generateToken()
  updateRoom(room.roomId, { hostToken })

  return NextResponse.json({
    roomCode: room.roomCode,
    roomId: room.roomId,
    hostToken,
    reclaimCode: room.reclaimCode,
  })
}
