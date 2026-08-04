'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { PlayerPublicState } from '@/types/player.types'
import type { Item } from '@/types/item.types'
import type { RoomStatus, BracketSize } from '@/types/room.types'
import { EVENTS } from '@/lib/socket-events'

export interface MatchPublic {
  matchId: string
  matchIndex: number
  itemA: Item
  itemB: Item
}

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
  roundIndex: number | null
  totalRounds: number | null
  roundMatches: MatchPublic[]
  confirmedPlayerIds: string[]
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
    roundIndex: null,
    totalRounds: null,
    roundMatches: [],
    confirmedPlayerIds: [],
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
    socket.on(
      EVENTS.ROUND_START,
      (data: { roundIndex: number; totalRounds: number; matches: MatchPublic[] }) => {
        setRoomState((prev) => ({
          ...prev,
          status: 'active',
          roundIndex: data.roundIndex,
          totalRounds: data.totalRounds,
          roundMatches: data.matches,
          confirmedPlayerIds: [],
        }))
      }
    )
    socket.on(EVENTS.ASSIGNMENT_CONFIRMED, (data: { confirmedPlayerIds: string[] }) => {
      setRoomState((prev) => ({ ...prev, confirmedPlayerIds: data.confirmedPlayerIds }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomCode])

  return { connected, roomState }
}
