import { spawn } from 'child_process'
import { createInterface } from 'readline'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { getRoomByCode, updateRoom } from '@/lib/room-store'
import { validateHostToken } from '@/lib/auth'
import { getIO } from '@/lib/socket-server'
import { EVENTS } from '@/lib/socket-events'
import { createJob, updateJob } from '@/lib/job-store'
import type { Item } from '@/types/item.types'

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
  const { roomCode, topic, boostType, boostKeyword, count, selectedItemIds } = body as {
    roomCode?: string
    topic?: string
    boostType?: string
    boostKeyword?: string
    count?: number
    selectedItemIds?: string[]
  }

  if (!roomCode || !topic?.trim() || !boostKeyword?.trim()) {
    return NextResponse.json(
      { error: 'roomCode, topic and boostKeyword are required' },
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

  const job = createJob(room.roomId)
  const { jobId, roomId } = job

  const boostCount = count ?? Math.ceil(room.bracketSize * 0.25)
  const excludeIds = (selectedItemIds ?? []).join(',')

  const scriptPath = path.join(process.cwd(), 'tools', 'pool_generator.py')
  const io = tryGetIO()

  if (io) {
    io.of('/board')
      .to(roomId)
      .emit(EVENTS.POOL_PROGRESS, { jobId, source: null, status: 'started' })
    io.of('/player')
      .to(roomId)
      .emit(EVENTS.POOL_PROGRESS, { jobId, source: null, status: 'started' })
  }

  const newItems: Item[] = []

  const child = spawn(
    'python3',
    [
      scriptPath,
      '--topic',
      topic.trim(),
      '--pool-size',
      String(boostCount),
      '--boost-type',
      (boostType ?? '').trim(),
      '--boost-keyword',
      boostKeyword.trim(),
      '--exclude-ids',
      excludeIds,
    ],
    { env: { ...process.env }, cwd: process.cwd() }
  )

  const rl = createInterface({ input: child.stdout })

  rl.on('line', (line) => {
    try {
      const event = JSON.parse(line) as {
        type: string
        source?: string
        status?: string
        count?: number
        error?: string
        items?: Item[]
      }

      if (event.type === 'progress') {
        const payload = {
          jobId,
          source: event.source,
          status: event.status,
          count: event.count ?? 0,
        }
        if (io) {
          io.of('/board').to(roomId).emit(EVENTS.POOL_PROGRESS, payload)
          io.of('/player').to(roomId).emit(EVENTS.POOL_PROGRESS, payload)
        }
      } else if (event.type === 'done' && event.items) {
        newItems.push(...event.items)
      }
    } catch {}
  })

  child.stderr.on('data', (data) => console.error('[pool_boost stderr]', data.toString()))

  child.on('close', (code) => {
    if (code !== 0 || newItems.length === 0) {
      updateJob(jobId, { status: 'error' })
      if (io) {
        io.of('/board').to(roomId).emit(EVENTS.POOL_PROGRESS, { jobId, status: 'failed' })
        io.of('/player').to(roomId).emit(EVENTS.POOL_PROGRESS, { jobId, status: 'failed' })
      }
      return
    }

    // Merge boost items into existing pool (keep selected items, replace non-selected ones)
    const protected_ids = new Set(selectedItemIds ?? [])
    const existing = room.pool.filter((item) => protected_ids.has(item.itemId))
    const merged = [...existing, ...newItems]

    updateRoom(roomId, { pool: merged })
    updateJob(jobId, { status: 'done' })

    if (io) {
      const readyPayload = { jobId, items: merged, count: merged.length }
      io.of('/board').to(roomId).emit(EVENTS.POOL_READY, readyPayload)
      io.of('/player').to(roomId).emit(EVENTS.POOL_READY, readyPayload)
    }
  })

  return NextResponse.json({ jobId }, { status: 202 })
}
