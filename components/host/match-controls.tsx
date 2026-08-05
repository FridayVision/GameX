'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MatchPublic } from '@/types/match.types'
import { toRgba } from '@/lib/colours'

interface HostMatchControlsProps {
  matchPhase: MatchPublic['phase'] | null
  isInterRound: boolean
  votedCount: number
  totalCount: number
  confirmedCount: number
  playerCount: number
  onCallVote: () => void
  onCoinFlip: () => void
  onNextMatch: () => void
}

const HOLD_MS = 900
const RING_CIRCUMF = 2 * Math.PI * 28 // ≈ 175.9

export function HostMatchControls({
  matchPhase,
  isInterRound,
  votedCount,
  totalCount,
  confirmedCount,
  playerCount,
  onCallVote,
  onCoinFlip,
  onNextMatch,
}: HostMatchControlsProps) {
  const allConfirmed = playerCount > 0 && confirmedCount >= playerCount
  const [holdProgress, setHoldProgress] = useState(0)
  const [holdComplete, setHoldComplete] = useState(false)
  const holdStartRef = useRef<number | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const ringRef = useRef<SVGCircleElement | null>(null)

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    holdStartRef.current = null
    if (ringRef.current) ringRef.current.style.strokeDashoffset = String(RING_CIRCUMF)
    setHoldProgress(0)
  }, [])

  const startHold = useCallback(
    (e: React.PointerEvent) => {
      if (holdComplete) return
      e.preventDefault()
      holdStartRef.current = Date.now()

      const tick = () => {
        if (!holdStartRef.current || !ringRef.current) return
        const pct = Math.min((Date.now() - holdStartRef.current) / HOLD_MS, 1)
        ringRef.current.style.strokeDashoffset = String(RING_CIRCUMF * (1 - pct))
        setHoldProgress(pct)
        if (pct < 1) rafIdRef.current = requestAnimationFrame(tick)
      }

      holdTimerRef.current = setTimeout(() => {
        if (ringRef.current) ringRef.current.style.strokeDashoffset = '0'
        setHoldComplete(true)
        onCoinFlip()
      }, HOLD_MS)
      rafIdRef.current = requestAnimationFrame(tick)
    },
    [holdComplete, onCoinFlip]
  )

  const endHold = useCallback(() => {
    if (holdComplete) return
    stopHold()
  }, [holdComplete, stopHold])

  // Reset hold state when phase changes away from tied
  useEffect(() => {
    if (matchPhase !== 'tied') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHoldComplete(false)
      stopHold()
    }
  }, [matchPhase, stopHold])

  useEffect(() => () => stopHold(), [stopHold])

  const showStartMatch = isInterRound || matchPhase === null
  const showCallVote = matchPhase === 'debate'
  const showVoteCount = matchPhase === 'voting'
  const showNextMatch = matchPhase === 'result'
  const showCoinFlip = matchPhase === 'tied'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '12px 20px 20px',
        background: 'linear-gradient(to top, rgba(8,8,8,0.98) 60%, transparent)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* HOST badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 20,
          background: 'rgba(236,88,56,0.15)',
          border: '1px solid rgba(236,88,56,0.35)',
          marginBottom: 2,
        }}
      >
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ec5838' }} />
        <span
          style={{
            fontSize: '0.55rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#ec5838',
          }}
        >
          HOST
        </span>
      </div>

      {/* Start Match button — gated until all players confirm their assignment */}
      {showStartMatch && (
        <div
          style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {/* Confirmation status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {allConfirmed ? (
              <>
                <span style={{ fontSize: 11, color: '#15F4C7' }}>✓</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#15F4C7' }}>
                  All {playerCount} players ready
                </span>
              </>
            ) : (
              <>
                <span
                  className="anim-waiting-dot"
                  style={{
                    display: 'inline-block',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'rgba(250,255,254,0.4)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '0.68rem', color: 'rgba(250,255,254,0.45)' }}>
                  {confirmedCount} of {playerCount} confirmed assignment
                </span>
              </>
            )}
          </div>
          <button
            onClick={allConfirmed ? onNextMatch : undefined}
            disabled={!allConfirmed}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 12,
              border: allConfirmed
                ? '2px solid rgba(21,244,199,0.55)'
                : '2px solid rgba(250,255,254,0.10)',
              background: allConfirmed ? 'rgba(21,244,199,0.10)' : 'rgba(250,255,254,0.03)',
              color: allConfirmed ? '#15F4C7' : 'rgba(250,255,254,0.22)',
              fontWeight: 900,
              fontSize: '1rem',
              cursor: allConfirmed ? 'pointer' : 'not-allowed',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.35s ease',
              boxShadow: allConfirmed ? '0 0 20px rgba(21,244,199,0.12)' : 'none',
            }}
          >
            Start Match
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M5 3l14 9-14 9V3z" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      )}

      {/* Call Vote button */}
      {showCallVote && (
        <button
          onClick={onCallVote}
          style={{
            width: '100%',
            maxWidth: 320,
            height: 52,
            borderRadius: 12,
            border: '2px solid rgba(236,88,56,0.6)',
            background: 'rgba(236,88,56,0.15)',
            color: '#ec5838',
            fontWeight: 900,
            fontSize: '1rem',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            boxShadow: '0 0 20px rgba(236,88,56,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <svg
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
          >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 6v6l4 2" />
          </svg>
          Call Vote
        </button>
      )}

      {/* Vote count */}
      {showVoteCount && (
        <div
          style={{
            width: '100%',
            maxWidth: 320,
            height: 52,
            borderRadius: 12,
            border: '1px solid rgba(250,255,254,0.12)',
            background: 'rgba(250,255,254,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
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
            }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(250,255,254,0.65)' }}>
            {votedCount} of {totalCount} voted
          </span>
        </div>
      )}

      {/* Next Match button */}
      {showNextMatch && (
        <button
          onClick={onNextMatch}
          style={{
            width: '100%',
            maxWidth: 320,
            height: 52,
            borderRadius: 12,
            border: '2px solid rgba(21,244,199,0.45)',
            background: 'rgba(21,244,199,0.10)',
            color: '#15F4C7',
            fontWeight: 900,
            fontSize: '1rem',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          Next Match
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Hold to Flip Coin */}
      {showCoinFlip && (
        <div
          style={{
            width: '100%',
            maxWidth: 320,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <button
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            onContextMenu={(e) => e.preventDefault()}
            disabled={holdComplete}
            style={{
              width: '100%',
              height: 60,
              borderRadius: 12,
              border: holdComplete
                ? '2px solid rgba(245,158,11,0.6)'
                : '2px solid rgba(245,158,11,0.4)',
              background: holdComplete ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.08)',
              color: '#f59e0b',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: holdComplete ? 'default' : 'pointer',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Progress ring */}
            <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
              <svg
                width="40"
                height="40"
                viewBox="0 0 60 60"
                style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
              >
                <circle
                  cx="30"
                  cy="30"
                  r="28"
                  fill="none"
                  stroke="rgba(245,158,11,0.15)"
                  strokeWidth="3"
                />
                <circle
                  ref={ringRef}
                  cx="30"
                  cy="30"
                  r="28"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMF}
                  strokeDashoffset={RING_CIRCUMF}
                  style={{ transition: 'stroke-dashoffset 0.04s linear' }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                }}
              >
                🪙
              </div>
            </div>
            <span>{holdComplete ? 'Flipping…' : 'Hold to Flip Coin'}</span>
          </button>
          {!holdComplete && (
            <p
              style={{
                fontSize: '0.60rem',
                color: 'rgba(250,255,254,0.28)',
                letterSpacing: '0.08em',
              }}
            >
              Hold for {HOLD_MS / 1000}s to trigger coin flip
            </p>
          )}
        </div>
      )}
    </div>
  )
}
