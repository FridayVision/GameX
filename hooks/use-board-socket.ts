'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { PlayerPublicState } from '@/types/player.types'
import type { Item } from '@/types/item.types'
import type { RoomStatus, BracketSize } from '@/types/room.types'
import { EVENTS } from '@/lib/socket-events'

export interface BoardSourceProgress {
  source: string
  status: 'fetching' | 'done' | 'error'
  count: number
  error?: string
}

export interface BoardRoomState {
  players: PlayerPublicState[]
  status: RoomStatus
  bracketSize: BracketSize | null
  roomCode: string
  topic: string
  poolProgress: BoardSourceProgress[]
  pool: Item[]
  poolReady: boolean
}

export function useBoardSocket(roomCode: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [roomState, setRoomState] = useState<BoardRoomState>({
    players: [],
    status: 'lobby',
    bracketSize: null,
    roomCode: roomCode ?? '',
    topic: '',
    poolProgress: [],
    pool: [],
    poolReady: false,
  })

  useEffect(() => {
    if (!roomCode) return
    const socket = io('/board', { auth: { roomCode } })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on(
      EVENTS.PLAYER_JOINED,
      (data: Omit<BoardRoomState, 'poolProgress' | 'pool' | 'poolReady'>) => {
        setRoomState((prev) => ({ ...prev, ...data }))
      }
    )
    socket.on(EVENTS.PLAYER_LEFT, ({ playerId }: { playerId: string }) => {
      setRoomState((prev) => ({
        ...prev,
        players: prev.players.filter((p) => p.playerId !== playerId),
      }))
    })
    socket.on(
      EVENTS.POOL_PROGRESS,
      (data: { source?: string; status: string; count?: number; error?: string }) => {
        if (!data.source) return
        setRoomState((prev) => ({
          ...prev,
          poolProgress: [
            ...prev.poolProgress.filter((p) => p.source !== data.source),
            {
              source: data.source!,
              status: data.status as BoardSourceProgress['status'],
              count: data.count ?? 0,
              error: data.error,
            },
          ],
        }))
      }
    )
    socket.on(EVENTS.POOL_READY, (data: { items: Item[] }) => {
      setRoomState((prev) => ({ ...prev, pool: data.items, poolReady: true }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomCode])

  return { connected, roomState }
}
