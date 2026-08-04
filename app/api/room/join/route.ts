import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getRoomByCode } from '@/lib/room-store'
import { generateToken, toPublicState } from '@/lib/auth'
import { HOST_COLOUR, PLAYER_COLOURS } from '@/lib/colours'
import { EVENTS } from '@/lib/socket-events'
import { getIO } from '@/lib/socket-server'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { roomCode, displayName, colour } = body as {
    roomCode?: unknown
    displayName?: unknown
    colour?: unknown
  }

  if (
    typeof roomCode !== 'string' ||
    typeof displayName !== 'string' ||
    typeof colour !== 'string'
  ) {
    return NextResponse.json(
      { error: 'roomCode, displayName, and colour are required' },
      { status: 400 }
    )
  }

  const room = getRoomByCode(roomCode)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  if (room.status === 'active' || room.status === 'ended') {
    return NextResponse.json({ error: 'Room is not accepting players' }, { status: 409 })
  }

  if (room.players.size >= 8) {
    return NextResponse.json({ error: 'Room is full' }, { status: 409 })
  }

  const name = displayName.trim()
  if (name.length === 0 || name.length > 25) {
    return NextResponse.json({ error: 'displayName must be 1–25 characters' }, { status: 400 })
  }

  const existingNames = [...room.players.values()].map((p) => p.displayName.toLowerCase())
  if (existingNames.includes(name.toLowerCase())) {
    return NextResponse.json({ error: 'Display name already taken' }, { status: 409 })
  }

  const isFirstPlayer = room.players.size === 0
  if (isFirstPlayer) {
    if (colour !== HOST_COLOUR) {
      return NextResponse.json({ error: 'Host must use the orange colour' }, { status: 400 })
    }
  } else {
    if (!PLAYER_COLOURS.includes(colour)) {
      return NextResponse.json({ error: 'Invalid colour' }, { status: 400 })
    }
    const takenColours = [...room.players.values()].map((p) => p.colour)
    if (takenColours.includes(colour)) {
      return NextResponse.json({ error: 'Colour already taken' }, { status: 409 })
    }
  }

  const playerId = randomUUID()
  const playerToken = generateToken()

  room.players.set(playerId, {
    playerId,
    displayName: name,
    colour,
    isHost: isFirstPlayer,
    status: 'connected',
    socketId: null,
    lastAssignedItemId: null,
    assignmentConfirmed: false,
    playerToken,
  })

  if (isFirstPlayer) {
    room.hostId = playerId
  }

  // Notify existing room members (the joining player connects their socket separately)
  try {
    const io = getIO()
    const publicPlayers = [...room.players.values()].map(toPublicState)
    const payload = {
      players: publicPlayers,
      status: room.status,
      bracketSize: room.bracketSize,
      roomCode: room.roomCode,
    }
    io.of('/board').to(room.roomId).emit(EVENTS.PLAYER_JOINED, payload)
    io.of('/player').to(room.roomId).emit(EVENTS.PLAYER_JOINED, payload)
  } catch {
    // Socket not initialized (e.g. during tests) — non-fatal
  }

  return NextResponse.json({ playerId, playerToken })
}
