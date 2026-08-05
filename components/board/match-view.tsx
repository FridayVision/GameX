'use client'
import { useEffect, useState } from 'react'
import type { MatchPublic } from '@/types/match.types'
import type { Item } from '@/types/item.types'
import type { PlayerPublicState } from '@/types/player.types'
import { toRgba } from '@/lib/colours'

interface BoardMatchViewProps {
  match: MatchPublic
  votes: Array<{ colour: string; side: 'A' | 'B' }>
  matchPhase: MatchPublic['phase'] | null
  voteResult: { side: 'A' | 'B' | 'tie'; winnerItem: Item | null } | null
  coinFlipResult: { result: 'heads' | 'tails'; side: 'A' | 'B'; winnerItem: Item } | null
  players: PlayerPublicState[]
}

function ItemCard({
  item,
  isWinner,
  isLoser,
  isTied,
}: {
  item: Item
  isWinner: boolean
  isLoser: boolean
  isTied: boolean
}) {
  const cardBorder = isWinner
    ? '2.5px solid #ec5838'
    : isTied
      ? '2.5px solid #f59e0b'
      : '1.5px solid rgba(250,255,254,0.10)'
  const cardShadow = isWinner
    ? '0 0 32px rgba(236,88,56,0.35), 0 0 64px rgba(236,88,56,0.15)'
    : undefined

  return (
    <div
      style={{
        position: 'relative',
        width: 280,
        height: 420,
        borderRadius: 16,
        overflow: 'hidden',
        background: '#111111',
        border: cardBorder,
        boxShadow: cardShadow,
        opacity: isLoser ? 0.3 : 1,
        filter: isLoser ? 'grayscale(100%)' : 'none',
        transition:
          'opacity 0.6s ease, filter 0.6s ease, border-color 0.4s ease, box-shadow 0.4s ease',
        flexShrink: 0,
      }}
    >
      {item.imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.96) 100%)',
            }}
          />
        </>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(160deg, rgba(236,88,56,0.12) 0%, #111111 60%)`,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 18px 20px',
          zIndex: 10,
        }}
      >
        <p
          style={{
            fontSize: '1.4rem',
            fontWeight: 900,
            color: '#fafffe',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            textShadow: '0 2px 16px rgba(0,0,0,.80)',
          }}
        >
          {item.title}
        </p>
        {item.contextLine && (
          <p
            style={{
              fontSize: '0.65rem',
              fontWeight: 500,
              color: 'rgba(250,255,254,0.55)',
              marginTop: 4,
            }}
          >
            {item.contextLine}
          </p>
        )}
      </div>
    </div>
  )
}

function VoteTray({ votes }: { votes: Array<{ colour: string; side: 'A' | 'B' }> }) {
  return (
    <div
      style={{
        width: 280,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        minHeight: 28,
        padding: '6px 2px',
      }}
    >
      {votes.map((v, i) => (
        <div
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: v.colour,
            boxShadow: `0 0 6px ${toRgba(v.colour, 0.5)}`,
            flexShrink: 0,
          }}
        />
      ))}
      {votes.length > 0 && (
        <span style={{ fontSize: '0.65rem', color: 'rgba(250,255,254,0.40)', marginLeft: 4 }}>
          {votes.length} {votes.length === 1 ? 'vote' : 'votes'}
        </span>
      )}
    </div>
  )
}

export function BoardMatchView({
  match,
  votes,
  matchPhase,
  voteResult,
  coinFlipResult,
  players,
}: BoardMatchViewProps) {
  const [coinDone, setCoinDone] = useState(false)
  const [revealedResult, setRevealedResult] = useState<typeof voteResult>(null)

  useEffect(() => {
    if (coinFlipResult && !coinDone) {
      const t = setTimeout(() => setCoinDone(true), 1400)
      return () => clearTimeout(t)
    }
  }, [coinFlipResult, coinDone])

  // Reset coin state when match changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoinDone(false)
  }, [match.matchId])

  // Delay winner reveal by 900ms after last vote lands
  useEffect(() => {
    if (!voteResult) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealedResult(null)
      return
    }
    const t = setTimeout(() => setRevealedResult(voteResult), 900)
    return () => clearTimeout(t)
  }, [voteResult])

  // During the delay window, keep showing 'voting' phase so cards stay neutral
  const effectivePhase =
    (matchPhase === 'result' || matchPhase === 'tied') && !revealedResult ? 'voting' : matchPhase

  const winnerSide = revealedResult?.side
  const isWinnerA = winnerSide === 'A'
  const isWinnerB = winnerSide === 'B'
  const isTied = winnerSide === 'tie'

  const votesA = votes.filter((v) => v.side === 'A')
  const votesB = votes.filter((v) => v.side === 'B')
  const votedColours = new Set(votes.map((v) => v.colour))
  const activePlayers = players.filter((p) => p.status !== 'removed' && p.status !== 'timedout')

  const phaseLabel =
    effectivePhase === 'debate'
      ? 'DEBATE'
      : effectivePhase === 'voting'
        ? 'VOTING'
        : effectivePhase === 'tied'
          ? 'TIE'
          : effectivePhase === 'result'
            ? 'RESULT'
            : ''

  const phasePillStyle: React.CSSProperties =
    effectivePhase === 'tied'
      ? {
          background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.4)',
          color: '#f59e0b',
        }
      : effectivePhase === 'result'
        ? {
            background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.4)',
            color: '#22c55e',
          }
        : {
            background: 'rgba(236,88,56,0.15)',
            border: '1px solid rgba(236,88,56,0.4)',
            color: '#ec5838',
          }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        background: '#060d05',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="led-dots-board" aria-hidden="true" />
      <div className="led-orange-glow" aria-hidden="true" />
      <div className="led-teal-glow" aria-hidden="true" />
      <div className="led-void" aria-hidden="true" />

      {/* Header */}
      <header
        className="relative z-10 flex-shrink-0"
        style={{
          height: 72,
          borderBottom: '1px solid rgba(250,255,254,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
        }}
      >
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(250,255,254,0.55)',
          }}
        >
          ROUND {match.roundIndex + 1} · MATCH {match.matchIndex + 1} OF {match.totalMatches}
        </span>
        {phaseLabel && (
          <span
            style={{
              ...phasePillStyle,
              padding: '5px 14px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {phaseLabel}
          </span>
        )}
      </header>

      {/* Main */}
      <main
        className="relative z-10 flex-1 flex items-center justify-center min-h-0"
        style={{ padding: '24px 0 16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32 }}>
          {/* Card A + vote tray */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <ItemCard
              item={match.itemA}
              isWinner={isWinnerA}
              isLoser={!!winnerSide && !isWinnerA && !isTied}
              isTied={isTied}
            />
            <VoteTray votes={votesA} />
          </div>

          {/* Center: VS badge or coin */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              paddingTop: 180,
              flexShrink: 0,
            }}
          >
            {coinFlipResult ? (
              coinDone ? (
                /* Result state — flat circle showing H or T */
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    fontWeight: 900,
                    ...(coinFlipResult.result === 'heads'
                      ? {
                          background: 'rgba(236,88,56,0.15)',
                          border: '2px solid rgba(236,88,56,0.5)',
                          color: '#ec5838',
                        }
                      : {
                          background: 'rgba(21,244,199,0.1)',
                          border: '2px solid rgba(21,244,199,0.4)',
                          color: '#15F4C7',
                        }),
                  }}
                >
                  {coinFlipResult.result === 'heads' ? 'H' : 'T'}
                </div>
              ) : (
                /* Spinning state — two-face 3D coin */
                <div style={{ perspective: '400px', width: 72, height: 72, position: 'relative' }}>
                  <div
                    key={coinFlipResult.result}
                    className="anim-coin-spin-3d"
                    style={{
                      width: 72,
                      height: 72,
                      position: 'relative',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Front face: H */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        background: 'rgba(245,158,11,0.15)',
                        border: '2px solid rgba(245,158,11,0.55)',
                        color: '#f59e0b',
                        fontSize: '1.5rem',
                        fontWeight: 900,
                      }}
                    >
                      H
                    </div>
                    {/* Back face: T */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'rgba(245,158,11,0.10)',
                        border: '2px solid rgba(245,158,11,0.35)',
                        color: '#f59e0b',
                        fontSize: '1.5rem',
                        fontWeight: 900,
                      }}
                    >
                      T
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(236,88,56,0.10)',
                  border: '2px solid rgba(236,88,56,0.35)',
                  boxShadow: '0 0 20px rgba(236,88,56,0.15)',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  color: 'rgba(250,255,254,0.7)',
                  letterSpacing: '0.06em',
                }}
              >
                VS
              </div>
            )}
          </div>

          {/* Card B + vote tray */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <ItemCard
              item={match.itemB}
              isWinner={isWinnerB}
              isLoser={!!winnerSide && !isWinnerB && !isTied}
              isTied={isTied}
            />
            <VoteTray votes={votesB} />
          </div>
        </div>
      </main>

      {/* Footer: player status dots */}
      <footer
        className="relative z-10 flex-shrink-0"
        style={{
          height: 60,
          borderTop: '1px solid rgba(250,255,254,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        {activePlayers.map((player) => {
          const hasVoted = votedColours.has(player.colour)
          return (
            <div
              key={player.playerId}
              className={hasVoted ? '' : 'anim-ring-pulse'}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.4s ease, border-color 0.4s ease, opacity 0.4s ease',
                ...(hasVoted
                  ? {
                      background: player.colour,
                      boxShadow: `0 0 10px ${toRgba(player.colour, 0.4)}`,
                      border: '2px solid transparent',
                    }
                  : {
                      background: 'transparent',
                      border: `2px solid ${player.colour}`,
                      opacity: 0.4,
                    }),
              }}
            >
              {hasVoted && (
                <span style={{ fontSize: 12, fontWeight: 900, color: 'rgba(0,0,0,0.5)' }}>✓</span>
              )}
            </div>
          )
        })}
      </footer>
    </div>
  )
}
