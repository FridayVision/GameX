'use client'
import { useEffect, useState } from 'react'
import type { MatchPublic } from '@/types/match.types'
import type { Item } from '@/types/item.types'
import { toRgba } from '@/lib/colours'

interface PlayerMatchViewProps {
  match: MatchPublic
  votes: Array<{ colour: string; side: 'A' | 'B' }>
  matchPhase: MatchPublic['phase'] | null
  myVote: 'A' | 'B' | null
  voteResult: { side: 'A' | 'B' | 'tie'; winnerItem: Item | null } | null
  coinFlipResult: { result: 'heads' | 'tails'; side: 'A' | 'B'; winnerItem: Item } | null
  playerColour: string
  playerName: string
  isHost?: boolean
  gamePaused?: boolean
  castVote: (side: 'A' | 'B') => void
}

function CompactCard({
  item,
  isWinner,
  isLoser,
  isTied,
  myVoted,
  playerColour,
}: {
  item: Item
  isWinner: boolean
  isLoser: boolean
  isTied: boolean
  myVoted: boolean
  playerColour: string
}) {
  const cardBorder = isWinner
    ? '2.5px solid #ec5838'
    : isTied
      ? '2.5px solid #f59e0b'
      : isLoser
        ? '1.5px solid rgba(250,255,254,0.05)'
        : myVoted
          ? `2px solid ${playerColour}`
          : '1.5px solid rgba(250,255,254,0.10)'

  const cardShadow = isWinner
    ? '0 0 24px rgba(236,88,56,0.35), 0 0 48px rgba(236,88,56,0.12)'
    : myVoted && !isLoser && !isTied
      ? `0 0 16px ${toRgba(playerColour, 0.25)}`
      : undefined

  return (
    <div
      style={{
        position: 'relative',
        width: 155,
        height: 232,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#111111',
        border: cardBorder,
        boxShadow: cardShadow,
        filter: isLoser ? 'grayscale(100%)' : 'none',
        transition: 'filter 0.6s ease, border-color 0.4s ease, box-shadow 0.4s ease',
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
                'linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.92) 72%, rgba(0,0,0,0.98) 100%)',
            }}
          />
        </>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(160deg, rgba(236,88,56,0.10) 0%, #111111 60%)`,
          }}
        />
      )}
      {/* Loser: solid dark dim overlay — no transparency so LED grid doesn't bleed through */}
      {isLoser && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(6,6,6,0.62)',
            zIndex: 5,
          }}
        />
      )}
      {/* Winner: solid green overlay */}
      {isWinner && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(10,38,20,0.72)',
            zIndex: 5,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 10px 12px',
          zIndex: 10,
        }}
      >
        <p
          style={{
            fontSize: '0.95rem',
            fontWeight: 900,
            color: '#fafffe',
            lineHeight: 1.2,
            letterSpacing: '-0.015em',
            textShadow: '0 2px 12px rgba(0,0,0,.90)',
          }}
        >
          {item.title}
        </p>
        {item.contextLine && (
          <p
            style={{
              fontSize: '0.56rem',
              fontWeight: 500,
              color: 'rgba(250,255,254,0.50)',
              marginTop: 3,
            }}
          >
            {item.contextLine}
          </p>
        )}
      </div>
    </div>
  )
}

export function PlayerMatchView({
  match,
  votes,
  matchPhase,
  myVote,
  voteResult,
  coinFlipResult,
  playerColour,
  playerName,
  isHost = false,
  gamePaused = false,
  castVote,
}: PlayerMatchViewProps) {
  const [revealedResult, setRevealedResult] = useState<typeof voteResult>(null)

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

  // During the delay window keep showing 'voting' so cards stay neutral
  const effectivePhase =
    (matchPhase === 'result' || matchPhase === 'tied') && !revealedResult ? 'voting' : matchPhase

  const winnerSide = revealedResult?.side
  const isWinnerA = winnerSide === 'A'
  const isWinnerB = winnerSide === 'B'
  const isTied = winnerSide === 'tie'
  const myVotedA = myVote === 'A' && !revealedResult
  const myVotedB = myVote === 'B' && !revealedResult

  const phasePillStyle: React.CSSProperties =
    effectivePhase === 'tied'
      ? {
          background: 'rgba(8,8,8,0.92)',
          border: '1.5px solid rgba(245,158,11,0.7)',
          color: '#f59e0b',
        }
      : effectivePhase === 'result'
        ? {
            background: 'rgba(8,8,8,0.92)',
            border: '1.5px solid rgba(34,197,94,0.7)',
            color: '#22c55e',
          }
        : {
            background: 'rgba(8,8,8,0.92)',
            border: '1.5px solid rgba(236,88,56,0.7)',
            color: '#ec5838',
          }

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

  const votesA = votes.filter((v) => v.side === 'A')
  const votesB = votes.filter((v) => v.side === 'B')

  return (
    <div
      style={{
        height: '100%',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div style={{ flexShrink: 0, padding: '12px 16px 6px' }}>
        {/* Row 1: identity chip (left) + phase pill (right) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          {/* Player identity chip */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '5px 10px 5px 7px',
              borderRadius: 20,
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(250,255,254,0.10)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: playerColour,
                boxShadow: `0 0 8px ${toRgba(playerColour, 0.5)}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'rgba(250,255,254,0.88)',
                letterSpacing: '-0.01em',
                maxWidth: 140,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {playerName}
            </span>
          </div>

          {/* Phase pill */}
          {phaseLabel && (
            <span
              style={{
                ...phasePillStyle,
                padding: '4px 10px',
                borderRadius: 5,
                fontSize: '0.58rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {phaseLabel}
            </span>
          )}
        </div>

        {/* Row 2: round / match info — card pill for readability */}
        <div
          style={{
            display: 'inline-flex',
            padding: '5px 12px',
            borderRadius: 8,
            background: 'rgba(8,8,8,0.82)',
            border: '1px solid rgba(250,255,254,0.10)',
            marginTop: 6,
          }}
        >
          <span
            style={{
              fontSize: '0.70rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'rgba(250,255,254,0.68)',
            }}
          >
            Round {match.roundIndex + 1} · Match {match.matchIndex + 1} of {match.totalMatches}
          </span>
        </div>
      </div>

      {/* Cards + all state content — centered as a group so cards + status sit together */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px',
          minHeight: 0,
          gap: 10,
        }}
      >
        {/* Card row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <CompactCard
            item={match.itemA}
            isWinner={isWinnerA}
            isLoser={!!winnerSide && !isWinnerA && !isTied}
            isTied={isTied}
            myVoted={myVotedA}
            playerColour={playerColour}
          />
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              color: 'rgba(250,255,254,0.28)',
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}
          >
            VS
          </span>
          <CompactCard
            item={match.itemB}
            isWinner={isWinnerB}
            isLoser={!!winnerSide && !isWinnerB && !isTied}
            isTied={isTied}
            myVoted={myVotedB}
            playerColour={playerColour}
          />
        </div>

        {/* Vote dots — right below cards, inside a dark container so they never merge with LED grid */}
        {effectivePhase !== 'debate' && (
          <div
            style={{
              display: 'flex',
              gap: 0,
              background: 'rgba(8,8,8,0.88)',
              border: '1px solid rgba(250,255,254,0.09)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Side A */}
            <div
              style={{
                width: 155,
                minHeight: 38,
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                alignItems: 'center',
                padding: '8px 10px',
              }}
            >
              {votesA.map((v, i) => (
                <div
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: v.colour,
                    flexShrink: 0,
                    boxShadow: `0 0 0 2px rgba(8,8,8,0.9), 0 0 8px ${v.colour}`,
                  }}
                />
              ))}
            </div>
            {/* Divider */}
            <div style={{ width: 1, background: 'rgba(250,255,254,0.07)', flexShrink: 0 }} />
            {/* Side B — right-aligned */}
            <div
              style={{
                width: 155,
                minHeight: 38,
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '8px 10px',
              }}
            >
              {votesB.map((v, i) => (
                <div
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: v.colour,
                    flexShrink: 0,
                    boxShadow: `0 0 0 2px rgba(8,8,8,0.9), 0 0 8px ${v.colour}`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Vote action — solid card, snapped below dots */}
        {effectivePhase === 'voting' && myVote === null && (
          <div
            style={{
              width: 334,
              background: 'rgba(10,10,10,0.92)',
              border: '1px solid rgba(250,255,254,0.12)',
              borderRadius: 14,
              padding: '12px 12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <p
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'rgba(250,255,254,0.55)',
                textAlign: 'center',
                letterSpacing: '0.05em',
              }}
            >
              {gamePaused
                ? 'Game paused'
                : votes.length > 0
                  ? `${votes.length} voted · cast yours`
                  : 'Cast your vote'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={gamePaused ? undefined : () => castVote('A')}
                disabled={gamePaused}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 10,
                  border: '2px solid rgba(250,255,254,0.22)',
                  background: 'rgba(250,255,254,0.07)',
                  color: '#fafffe',
                  fontWeight: 900,
                  fontSize: '0.86rem',
                  cursor: gamePaused ? 'not-allowed' : 'pointer',
                  lineHeight: 1.25,
                  padding: '0 8px',
                  transition: 'all .15s',
                  opacity: gamePaused ? 0.35 : 1,
                }}
              >
                {match.itemA.title}
              </button>
              <button
                onClick={gamePaused ? undefined : () => castVote('B')}
                disabled={gamePaused}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 10,
                  border: '2px solid rgba(250,255,254,0.22)',
                  background: 'rgba(250,255,254,0.07)',
                  color: '#fafffe',
                  fontWeight: 900,
                  fontSize: '0.86rem',
                  cursor: gamePaused ? 'not-allowed' : 'pointer',
                  lineHeight: 1.25,
                  padding: '0 8px',
                  transition: 'all .15s',
                  opacity: gamePaused ? 0.35 : 1,
                }}
              >
                {match.itemB.title}
              </button>
            </div>
          </div>
        )}

        {/* Voted status — solid card, snapped below dots */}
        {effectivePhase === 'voting' && myVote !== null && (
          <div
            style={{
              width: 334,
              background: 'rgba(10,10,10,0.92)',
              border: '1px solid rgba(250,255,254,0.10)',
              borderRadius: 14,
              padding: '12px 16px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.80rem', color: 'rgba(250,255,254,0.60)', marginBottom: 3 }}>
              Voted for{' '}
              <span style={{ color: playerColour, fontWeight: 700 }}>
                {myVote === 'A' ? match.itemA.title : match.itemB.title}
              </span>
            </p>
            <p style={{ fontSize: '0.62rem', color: 'rgba(250,255,254,0.28)' }}>
              Waiting for others…
            </p>
          </div>
        )}

        {/* Debate — waiting state, right below cards */}
        {effectivePhase === 'debate' && (
          <div
            style={{
              width: 334,
              background: 'rgba(10,10,10,0.92)',
              border: '1px solid rgba(250,255,254,0.09)',
              borderRadius: 14,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span
              className="anim-waiting-dot"
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#ec5838',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '0.75rem',
                color: 'rgba(250,255,254,0.45)',
                letterSpacing: '0.05em',
              }}
            >
              Voting hasn&apos;t opened yet
            </span>
          </div>
        )}

        {/* Tie — right below vote dots */}
        {effectivePhase === 'tied' && (
          <div
            style={{
              width: 334,
              textAlign: 'center',
              padding: '12px 20px',
              borderRadius: 12,
              background: 'rgba(245,158,11,0.10)',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          >
            <p style={{ fontSize: '0.74rem', color: '#f59e0b', letterSpacing: '0.06em' }}>
              It&apos;s a tie — host is calling a coin flip…
            </p>
          </div>
        )}

        {/* Result — right below vote dots */}
        {effectivePhase === 'result' && (
          <div
            style={{
              width: 334,
              textAlign: 'center',
              padding: '12px 20px',
              borderRadius: 12,
              background: 'rgba(10,28,16,0.96)',
              border: '1px solid rgba(34,197,94,0.35)',
            }}
          >
            <p
              style={{
                fontSize: '0.65rem',
                color: 'rgba(34,197,94,0.7)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Advances
            </p>
            <p style={{ fontSize: '1.1rem', fontWeight: 900, color: '#22c55e' }}>
              {revealedResult?.winnerItem?.title ?? coinFlipResult?.winnerItem?.title ?? ''}
            </p>
          </div>
        )}
      </div>

      {/* Footer — pure gradient spacer, dedicated to host controls overlay */}
      <div
        style={{
          flexShrink: 0,
          height: isHost ? 148 : 80,
          background: 'linear-gradient(to top, rgba(8,8,8,0.98) 60%, transparent)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
