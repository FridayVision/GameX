'use client'
import { useParams } from 'next/navigation'
import { LedBackground } from '@/components/shared/led-background'
import { BoardLobbyScreen } from '@/components/board/lobby-screen'
import { BoardPoolProgress } from '@/components/board/pool-progress'
import { useBoardSocket } from '@/hooks/use-board-socket'
import type { BracketSize } from '@/types/room.types'

export default function BoardPage() {
  const params = useParams()
  const code = params.code as string

  const { roomState } = useBoardSocket(code)
  const bracketSize = (roomState.bracketSize ?? 16) as BracketSize

  const showPool =
    roomState.status === 'poolgen' || roomState.status === 'poolreview' || roomState.poolReady

  return (
    <div className="h-screen flex flex-col">
      <LedBackground />

      {/* GameX wordmark */}
      <div className="absolute top-7 left-8 z-10 text-[rgba(255,255,255,0.25)] text-[0.70rem] font-black uppercase tracking-[0.26em]">
        GameX
      </div>

      {showPool ? (
        <BoardPoolProgress
          topic={roomState.topic}
          bracketSize={bracketSize}
          poolProgress={roomState.poolProgress}
          pool={roomState.pool}
          poolReady={roomState.poolReady}
        />
      ) : (
        <BoardLobbyScreen roomCode={code} bracketSize={bracketSize} players={roomState.players} />
      )}
    </div>
  )
}
