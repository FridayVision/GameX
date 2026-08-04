import { NextRequest, NextResponse } from 'next/server'
import { getRoomByCode, updateRoom } from '@/lib/room-store'
import { validateHostToken } from '@/lib/auth'
import { getIO } from '@/lib/socket-server'
import { EVENTS } from '@/lib/socket-events'

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
  const { roomCode, selectedItemIds } = body as {
    roomCode?: string
    selectedItemIds?: string[]
  }

  if (!roomCode || !Array.isArray(selectedItemIds)) {
    return NextResponse.json(
      { error: 'roomCode and selectedItemIds are required' },
      { status: 400 }
    )
  }
  if (!hostToken) {
    return NextResponse.json({ error: 'Missing host token' }, { status: 401 })
  }

  const room = getRoomByCode(roomCode)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }
  if (!validateHostToken(room.roomId, hostToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  if (selectedItemIds.length !== room.bracketSize) {
    return NextResponse.json(
      { error: `Must select exactly ${room.bracketSize} items (got ${selectedItemIds.length})` },
      { status: 400 }
    )
  }

  // Validate all selectedItemIds exist in room.pool
  const poolMap = new Map(room.pool.map((item) => [item.itemId, item]))
  const lockedItems = selectedItemIds.map((id) => poolMap.get(id)).filter(Boolean)

  if (lockedItems.length !== room.bracketSize) {
    return NextResponse.json(
      { error: 'One or more selected items not found in pool' },
      { status: 400 }
    )
  }

  updateRoom(room.roomId, {
    lockedItems: lockedItems as typeof room.lockedItems,
    survivingItems: lockedItems as typeof room.survivingItems,
    status: 'lobby',
  })

  // Notify clients — M4 will listen to this and run drawRound + assignment
  const io = tryGetIO()
  if (io) {
    io.of('/board').to(room.roomId).emit(EVENTS.HOST_LOCK_POOL, {
      bracketSize: room.bracketSize,
      itemCount: lockedItems.length,
    })
    io.of('/player').to(room.roomId).emit(EVENTS.HOST_LOCK_POOL, {
      bracketSize: room.bracketSize,
      itemCount: lockedItems.length,
    })
  }

  return NextResponse.json({ ok: true })
}
