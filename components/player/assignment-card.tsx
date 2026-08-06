'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import type { AssignmentPayload } from '@/types/assignment.types'
import { toRgba } from '@/lib/colours'

interface AssignmentCardProps {
  assignment: AssignmentPayload
  playerName: string
  playerColour: string
  onReady?: () => void
}

const HOLD_MS = 650
const RING_CIRCUMF = 2 * Math.PI * 36 // ≈ 226.2

export function AssignmentCard({
  assignment,
  playerName,
  playerColour,
  onReady,
}: AssignmentCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [backVisible, setBackVisible] = useState(true)
  const [isReady, setIsReady] = useState(false)

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
  }, [])

  const startHold = useCallback(
    (e: React.PointerEvent) => {
      if (isFlipped || isReady) return
      e.preventDefault()
      holdStartRef.current = Date.now()

      // Define tick locally so it can self-reference without circular useCallback issues
      const tick = () => {
        if (!holdStartRef.current || !ringRef.current) return
        const pct = Math.min((Date.now() - holdStartRef.current) / HOLD_MS, 1)
        ringRef.current.style.strokeDashoffset = String(RING_CIRCUMF * (1 - pct))
        if (pct < 1) rafIdRef.current = requestAnimationFrame(tick)
      }

      holdTimerRef.current = setTimeout(() => {
        if (ringRef.current) ringRef.current.style.strokeDashoffset = '0'
        setIsFlipped(true)
      }, HOLD_MS)
      rafIdRef.current = requestAnimationFrame(tick)
    },
    [isFlipped, isReady]
  )

  const endHold = useCallback(() => {
    if (isFlipped) return
    stopHold()
  }, [isFlipped, stopHold])

  useEffect(() => () => stopHold(), [stopHold])

  // Hide back face at flip midpoint — Safari ignores backface-visibility so we do it via JS
  useEffect(() => {
    if (!isFlipped) return
    const t = setTimeout(() => setBackVisible(false), 300)
    return () => clearTimeout(t)
  }, [isFlipped])

  const goReady = useCallback(() => {
    if (!isFlipped) return
    setIsReady(true)
    onReady?.()
  }, [isFlipped, onReady])

  const col = playerColour
  const playerInitial = (playerName[0] ?? '?').toUpperCase()

  return (
    <div
      className="relative z-10 h-[100dvh] flex flex-col items-center px-5 pt-7 pb-4 gap-4"
      style={
        {
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        } as React.CSSProperties
      }
    >
      {/* Top row: player chip + round badge */}
      <div
        className="anim-fade-up w-full flex items-center justify-between"
        style={{ animationDelay: '.05s' }}
      >
        {/* Player chip */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-full"
          style={{ background: '#0e0e0e', border: '1px solid rgba(250,255,254,.16)' }}
        >
          <div
            className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[.78rem] font-black flex-shrink-0"
            style={{ borderColor: col, background: toRgba(col, 0.13), color: col }}
          >
            {playerInitial}
          </div>
          <span className="font-bold text-[.85rem] text-[rgba(250,255,254,0.85)]">
            {playerName}
          </span>
        </div>

        {/* Round badge */}
        <div
          className="px-3.5 py-2 rounded-full"
          style={{ background: '#0e0e0e', border: '1px solid rgba(250,255,254,.16)' }}
        >
          <span className="text-[rgba(250,255,254,0.50)] text-[.62rem] uppercase tracking-[.22em] font-bold">
            Round <span className="text-[rgba(250,255,254,0.75)]">{assignment.roundIndex + 1}</span>{' '}
            of {assignment.totalRounds}
          </span>
        </div>
      </div>

      {/* Center: hero label + card + actions */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Hero label */}
        <div
          className="anim-fade-up px-5 py-3 rounded-[14px] w-[240px]"
          style={{
            animationDelay: '.10s',
            background: '#0e0e0e',
            border: '1px solid rgba(250,255,254,.14)',
            boxShadow: '0 0 0 1px rgba(0,0,0,.8)',
          }}
        >
          <h2
            className="font-black text-[1.55rem] tracking-[-0.03em] uppercase leading-none text-center"
            style={{ color: '#ec5838' }}
          >
            Your Secret
            <br />
            Assignment
          </h2>
        </div>

        {/* 3D flip card */}
        <div
          className="anim-card-in"
          style={
            {
              width: 240,
              height: 360,
              perspective: '900px',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            } as React.CSSProperties
          }
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Inner — rotates on flip */}
          <div
            style={
              {
                width: '100%',
                height: '100%',
                position: 'relative',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.60s cubic-bezier(0.16,1,0.3,1)',
                transform: isFlipped ? 'rotateY(180deg)' : 'none',
              } as React.CSSProperties
            }
          >
            {/* ── Back face ── */}
            <div
              style={
                {
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 16,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  overflow: 'hidden',
                  background: '#111111',
                  border: '1.5px solid rgba(250,255,254,.10)',
                  boxShadow: '0 0 0 1px rgba(0,0,0,.90), 0 28px 64px rgba(0,0,0,.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Safari ignores backface-visibility — hide explicitly at flip midpoint
                  opacity: backVisible ? 1 : 0,
                  pointerEvents: backVisible ? 'auto' : 'none',
                } as React.CSSProperties
              }
            >
              {/* GAMEX watermark */}
              <span
                style={{
                  position: 'absolute',
                  fontSize: '5.5rem',
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  color: 'rgba(250,255,254,.04)',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                GAMEX
              </span>

              <div className="relative z-10 flex flex-col items-center gap-5">
                {/* Hold ring */}
                <div
                  style={{
                    position: 'relative',
                    width: 80,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 80 80"
                    style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
                  >
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="rgba(250,255,254,.08)"
                      strokeWidth="3"
                    />
                    <circle
                      ref={ringRef}
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke={col}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRCUMF}
                      strokeDashoffset={RING_CIRCUMF}
                      style={{ transition: 'stroke-dashoffset 0.04s linear' }}
                    />
                  </svg>

                  {/* Hand icon */}
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(250,255,254,0.36)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="anim-waiting-dot"
                  >
                    <path d="M18 11V6a2 2 0 0 0-4 0v5" />
                    <path d="M14 10V4a2 2 0 0 0-4 0v6" />
                    <path d="M10 10.5V6a2 2 0 0 0-4 0v8l-1.5-1.5a1.5 1.5 0 0 0-2.1 2.1l3.6 3.6A5 5 0 0 0 10 21h4a4 4 0 0 0 4-4v-5.5a1.5 1.5 0 0 0-3 0" />
                  </svg>
                </div>

                <p
                  className="anim-waiting-dot text-[.58rem] font-bold uppercase tracking-[.18em]"
                  style={{ color: 'rgba(250,255,254,.32)' }}
                >
                  Hold to reveal
                </p>
              </div>
            </div>

            {/* ── Front face ── */}
            <div
              style={
                {
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 16,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  overflow: 'hidden',
                  transform: 'rotateY(180deg)',
                  border: `1.5px solid ${toRgba(col, 0.38)}`,
                  boxShadow: `0 0 0 1px rgba(0,0,0,.90), 0 0 28px ${toRgba(col, 0.2)}, 0 0 64px ${toRgba(col, 0.08)}, 0 28px 64px rgba(0,0,0,.85)`,
                  background: '#111111',
                } as React.CSSProperties
              }
            >
              {/* Image fills the card, or color gradient if none */}
              {assignment.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assignment.imageUrl}
                    alt={assignment.itemTitle}
                    draggable={false}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  {/* Gradient: dark top-left tint + strong dark at bottom for text */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(to bottom, ${toRgba(col, 0.25)} 0%, transparent 35%, rgba(0,0,0,0.70) 65%, rgba(0,0,0,0.96) 100%)`,
                    }}
                  />
                </>
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(160deg, ${toRgba(col, 0.15)} 0%, #111111 60%)`,
                  }}
                />
              )}

              {/* "Assigned" label — top left */}
              <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                <span
                  style={{
                    fontSize: '.52rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '.18em',
                    color: toRgba(col, 0.7),
                  }}
                >
                  Assigned
                </span>
              </div>

              {/* Item title + context — pinned to bottom */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  padding: '0 16px 20px',
                }}
              >
                <p
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 900,
                    color: '#fafffe',
                    lineHeight: 1.15,
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 16px rgba(0,0,0,.80)',
                  }}
                >
                  {assignment.itemTitle}
                </p>
                {assignment.contextLine && (
                  <p
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 500,
                      color: toRgba(col, 0.7),
                      marginTop: 4,
                    }}
                  >
                    {assignment.contextLine}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Keep secret pill */}
        <div
          className="anim-fade-up flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            animationDelay: '.35s',
            background: '#0e0e0e',
            border: '1px solid rgba(250,255,254,.12)',
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(250,255,254,0.38)"
            strokeWidth="2.2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[rgba(250,255,254,0.38)] text-[.60rem] font-medium">
            Keep this secret from others
          </span>
        </div>

        {/* I'm Ready / Waiting box */}
        <div
          className="w-[240px] rounded-[16px] px-5 pt-4 pb-3"
          style={{
            background: '#0e0e0e',
            border: '1px solid rgba(250,255,254,.12)',
            boxShadow: '0 0 0 1px rgba(0,0,0,.8)',
          }}
        >
          {!isReady ? (
            <>
              <button
                onClick={goReady}
                disabled={!isFlipped}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 12,
                  border: `2px solid ${toRgba(col, 0.4)}`,
                  background: toRgba(col, 0.1),
                  color: col,
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: isFlipped ? 1 : 0.3,
                  cursor: isFlipped ? 'pointer' : 'not-allowed',
                  transition: 'all .18s',
                }}
              >
                I&apos;m Ready
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </button>
              <p className="text-[rgba(250,255,254,0.28)] text-[.60rem] text-center mt-2">
                {isFlipped
                  ? "Tap when you've memorised your card"
                  : 'Hold the card above to reveal your assignment'}
              </p>
            </>
          ) : (
            <div className="py-2 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {[0, 280, 560].map((delay) => (
                  <span
                    key={delay}
                    className="w-[5px] h-[5px] rounded-full inline-block anim-waiting-dot"
                    style={{ background: col, animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
              <p className="text-[rgba(250,255,254,0.70)] text-[.72rem] font-medium">
                Waiting for others to confirm…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
