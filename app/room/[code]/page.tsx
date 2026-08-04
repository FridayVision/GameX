'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LedBackground } from '@/components/shared/led-background'
import { HostLobbyScreen } from '@/components/host/lobby-screen'
import { PlayerLobbyScreen } from '@/components/player/lobby-screen'
import { usePlayerSocket } from '@/hooks/use-player-socket'
import type { BracketSize } from '@/types/room.types'

interface SessionState {
  playerToken: string
  playerId: string
  roomId: string
  isHost: boolean
  reclaimCode: string
}

export default function RoomPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  // null on server and initial client render (avoids hydration mismatch)
  const [session, setSession] = useState<SessionState | null>(null)

  useEffect(() => {
    const pt = sessionStorage.getItem(`playerToken_${code}`)
    const pid = sessionStorage.getItem(`playerId_${code}`)
    const rid = sessionStorage.getItem(`roomId_${code}`)

    if (!pt || !pid || !rid) {
      router.replace(`/room/${code}/join`)
      return
    }

    const ht = sessionStorage.getItem(`hostToken_${code}`)
    const rc = sessionStorage.getItem(`reclaimCode_${code}`)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({ playerToken: pt, playerId: pid, roomId: rid, isHost: !!ht, reclaimCode: rc ?? '' })
  }, [code, router])

  const { roomState } = usePlayerSocket(session?.roomId ?? null, session?.playerToken ?? null)

  if (!session) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <LedBackground />
      </div>
    )
  }

  const hostPlayer = roomState.players.find((p) => p.isHost)
  const bracketSize = (roomState.bracketSize ?? 16) as BracketSize

  return (
    <div className="h-[100dvh]">
      <LedBackground />
      {session.isHost ? (
        <HostLobbyScreen
          roomCode={code}
          reclaimCode={session.reclaimCode}
          bracketSize={bracketSize}
          players={roomState.players}
          currentPlayerId={session.playerId}
        />
      ) : (
        <PlayerLobbyScreen
          roomCode={code}
          bracketSize={bracketSize}
          players={roomState.players}
          currentPlayerId={session.playerId}
          hostName={hostPlayer?.displayName ?? ''}
        />
      )}
    </div>
  )
}
