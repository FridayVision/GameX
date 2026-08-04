'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { PlayerPublicState } from '@/types/player.types'
import type { Item } from '@/types/item.types'
import type { RoomStatus, BracketSize } from '@/types/room.types'
import { EVENTS } from '@/lib/socket-events'

export interface PoolSourceProgress {
  source: string
  status: 'fetching' | 'done' | 'error'
  count: number
  error?: string
}

export interface PlayerRoomState {
  players: PlayerPublicState[]
  status: RoomStatus
  bracketSize: BracketSize | null
  roomCode: string
  poolProgress: PoolSourceProgress[]
  pool: Item[]
  poolReady: boolean
  poolFailed: boolean
  poolError: string
}

export function usePlayerSocket(roomId: string | null, playerToken: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [roomState, setRoomState] = useState<PlayerRoomState>({
    players: [],
    status: 'lobby',
    bracketSize: null,
    roomCode: '',
    poolProgress: [],
    pool: [],
    poolReady: false,
    poolFailed: false,
    poolError: '',
  })

  useEffect(() => {
    if (!roomId || !playerToken) return
    const socket = io('/player', { auth: { roomId, playerToken } })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on(
      EVENTS.PLAYER_JOINED,
      (data: Omit<PlayerRoomState, 'poolProgress' | 'pool' | 'poolReady'>) => {
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
        if (data.status === 'failed') {
          setRoomState((prev) => ({
            ...prev,
            poolFailed: true,
            poolError: data.error ?? 'Pool generation failed. Try a different topic.',
          }))
          return
        }
        if (data.status === 'started') {
          // Reset progress state for a fresh generation (retry)
          setRoomState((prev) => ({
            ...prev,
            poolFailed: false,
            poolError: '',
            poolProgress: [],
            poolReady: false,
            pool: [],
          }))
          return
        }
        if (!data.source) return
        setRoomState((prev) => ({
          ...prev,
          poolProgress: [
            ...prev.poolProgress.filter((p) => p.source !== data.source),
            {
              source: data.source!,
              status: data.status as PoolSourceProgress['status'],
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
  }, [roomId, playerToken])

  return { connected, roomState }
}
