'use client'
import { useParams } from 'next/navigation'
import { LedBackground } from '@/components/shared/led-background'
import { BoardLobbyScreen } from '@/components/board/lobby-screen'
import { BoardPoolProgress } from '@/components/board/pool-progress'
import { RoundStartScreen } from '@/components/board/round-start-screen'
import { BoardMatchView } from '@/components/board/match-view'
import { useBoardSocket } from '@/hooks/use-board-socket'
import type { BracketSize } from '@/types/room.types'

export default function BoardPage() {
  const params = useParams()
  const code = params.code as string

  const { roomState } = useBoardSocket(code)
  const bracketSize = (roomState.bracketSize ?? 16) as BracketSize

  const showPool =
    (roomState.status === 'poolgen' || roomState.status === 'poolreview') && !roomState.poolReady
      ? false
      : roomState.poolReady && roomState.status !== 'active'

  // Game over — hold at champion state until M7
  if (roomState.gameOver) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <LedBackground />
        <div className="relative z-10 text-center px-8">
          <p
            style={{
              fontSize: '0.72rem',
              color: 'rgba(250,255,254,0.40)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Champion
          </p>
          <h1
            style={{
              fontSize: '4rem',
              fontWeight: 900,
              color: '#fafffe',
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {roomState.champion?.title ?? 'Game Over'}
          </h1>
          {roomState.champion?.contextLine && (
            <p style={{ fontSize: '1rem', color: 'rgba(250,255,254,0.45)', marginTop: 12 }}>
              {roomState.champion.contextLine}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Match in progress — show full-screen match view
  if (roomState.status === 'active' && roomState.currentMatch) {
    return (
      <BoardMatchView
        match={roomState.currentMatch}
        votes={roomState.votes}
        matchPhase={roomState.matchPhase}
        voteResult={roomState.voteResult}
        coinFlipResult={roomState.coinFlipResult}
        players={roomState.players}
      />
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <LedBackground />

      {/* GameX wordmark */}
      <div className="absolute top-7 left-8 z-10 text-[rgba(255,255,255,0.25)] text-[0.70rem] font-black uppercase tracking-[0.26em]">
        GameX
      </div>

      {roomState.status === 'active' && roomState.roundIndex !== null ? (
        <RoundStartScreen
          roundIndex={roomState.roundIndex}
          totalRounds={roomState.totalRounds ?? Math.log2(bracketSize)}
          matches={roomState.roundMatches}
          bracketSize={bracketSize}
          topic={roomState.topic}
          players={roomState.players}
          confirmedPlayerIds={roomState.confirmedPlayerIds}
        />
      ) : showPool || roomState.status === 'poolgen' || roomState.status === 'poolreview' ? (
        <BoardPoolProgress
          topic={roomState.topic}
          bracketSize={bracketSize}
          poolProgress={roomState.poolProgress}
          pool={roomState.pool}
          poolReady={roomState.poolReady}
        />
      ) : (
        <BoardLobbyScreen
          roomCode={code}
          bracketSize={bracketSize}
          players={roomState.players}
          topic={roomState.topic}
        />
      )}
    </div>
  )
}
