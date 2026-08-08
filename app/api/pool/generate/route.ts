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
    console.warn('[pool/generate] Socket.IO not available — progress events will not be emitted')
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const hostToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    const body = await req.json().catch(() => ({}))
    const { roomCode, topic } = body as { roomCode?: string; topic?: string }

    if (!roomCode || !topic?.trim()) {
      return NextResponse.json({ error: 'roomCode and topic are required' }, { status: 400 })
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

    updateRoom(roomId, { status: 'poolgen', topic: topic.trim() })

    const poolSize = Math.ceil(room.bracketSize * 1.5)
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

    const allItems: Item[] = []

    const child = spawn(
      'python3',
      [
        scriptPath,
        '--topic',
        topic.trim(),
        '--pool-size',
        String(poolSize),
        '--bracket-size',
        String(room.bracketSize),
      ],
      {
        env: { ...process.env },
        cwd: process.cwd(),
      }
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
          const progressPayload = {
            jobId,
            source: event.source,
            status: event.status,
            count: event.count ?? 0,
            error: event.error,
          }
          if (io) {
            io.of('/board').to(roomId).emit(EVENTS.POOL_PROGRESS, progressPayload)
            io.of('/player').to(roomId).emit(EVENTS.POOL_PROGRESS, progressPayload)
          }

          updateJob(jobId, {
            progress: [
              ...job.progress.filter((p) => p.source !== event.source),
              {
                source: event.source ?? '',
                status: (event.status ?? 'fetching') as 'fetching' | 'done' | 'error',
                count: event.count ?? 0,
                error: event.error,
              },
            ],
          })
        } else if (event.type === 'done' && event.items) {
          allItems.push(...event.items)
        }
      } catch {
        // Ignore non-JSON lines (debug output etc.)
      }
    })

    child.stderr.on('data', (data) => {
      console.error('[pool_generator stderr]', data.toString())
    })

    // Handle spawn failure (e.g. python3 not on PATH) — prevents uncaughtException crash
    child.on('error', (err) => {
      console.error('[pool_generator] spawn error:', err.message)
      updateJob(jobId, { status: 'error', error: err.message })
      if (io) {
        const errPayload = {
          jobId,
          error: 'Pool generation unavailable — python3 not found on server.',
        }
        io.of('/board')
          .to(roomId)
          .emit(EVENTS.POOL_PROGRESS, { ...errPayload, status: 'failed' })
        io.of('/player')
          .to(roomId)
          .emit(EVENTS.POOL_PROGRESS, { ...errPayload, status: 'failed' })
      }
      updateRoom(roomId, { status: 'lobby' })
    })

    child.on('close', (code) => {
      if (code !== 0 || allItems.length === 0) {
        updateJob(jobId, { status: 'error', error: `Process exited with code ${code}` })
        if (io) {
          const errPayload = { jobId, error: 'Pool generation failed. Try a different topic.' }
          io.of('/board')
            .to(roomId)
            .emit(EVENTS.POOL_PROGRESS, { ...errPayload, status: 'failed' })
          io.of('/player')
            .to(roomId)
            .emit(EVENTS.POOL_PROGRESS, { ...errPayload, status: 'failed' })
        }
        updateRoom(roomId, { status: 'lobby' })
        return
      }

      updateRoom(roomId, { pool: allItems, status: 'poolreview' })
      updateJob(jobId, { status: 'done' })

      if (io) {
        const readyPayload = { jobId, items: allItems, count: allItems.length }
        io.of('/board').to(roomId).emit(EVENTS.POOL_READY, readyPayload)
        io.of('/player').to(roomId).emit(EVENTS.POOL_READY, readyPayload)
      }

      console.log(`[pool] job ${jobId} done — ${allItems.length} items for room ${roomId}`)
    })

    return NextResponse.json({ jobId }, { status: 202 })
  } catch (err) {
    console.error('[pool/generate] Unhandled error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
