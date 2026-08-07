'use client'
import { useEffect, useState } from 'react'
import type { Item } from '@/types/item.types'
import type { RevealRow } from '@/hooks/use-board-socket'
import { toRgba } from '@/lib/colours'

interface BoardRevealTableProps {
  rows: RevealRow[]
  champion: Item
  totalRounds: number
  onReturn: () => void
}

function roundColHeader(index: number, total: number): string {
  if (index === total - 1) return 'Final'
  if (index === total - 2 && total > 2) return 'Semi'
  return `R${index + 1}`
}

export function BoardRevealTable({ rows, champion, totalRounds, onReturn }: BoardRevealTableProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setTimeout(() => setLoaded(true), 80))
  }, [])

  // Name col wider for TV; equal round cols for the rest
  const gridTemplate = `280px repeat(${totalRounds}, 1fr)`

  return (
    <div
      className={loaded ? 'is-loaded' : ''}
      style={{ position: 'fixed', inset: 0, zIndex: 25, background: '#060d05', overflow: 'hidden' }}
    >
      {/* LED background */}
      <div className="led-dots-board" aria-hidden="true" />
      <div className="led-orange-glow" aria-hidden="true" />
      <div className="led-teal-glow" aria-hidden="true" />
      <div className="led-void" aria-hidden="true" />

      {/* Content */}
      <div
        className="relative z-10 w-full h-full flex flex-col"
        style={{ padding: '44px 72px 36px' }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between flex-shrink-0"
          style={{ marginBottom: 28, gap: 24 }}
        >
          {/* Title */}
          <div
            className="reveal-fade-up d-100"
            style={{
              background: 'rgba(6,10,5,0.88)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(250,255,254,0.10)',
              borderRadius: 14,
              padding: '18px 30px',
              boxShadow: '0 0 0 1px rgba(0,0,0,.70), 0 8px 32px rgba(0,0,0,.55)',
            }}
          >
            <p
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'rgba(250,255,254,0.35)',
                margin: '0 0 5px',
              }}
            >
              Post-Game Reveal
            </p>
            <h1
              style={{
                fontSize: '2.60rem',
                fontWeight: 900,
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
                color: '#fafffe',
                margin: 0,
                lineHeight: 1,
              }}
            >
              Who Defended What
            </h1>
          </div>

          {/* Return to Home — subtle pill, board-operator control */}
          <button
            onClick={onReturn}
            style={{
              marginLeft: 'auto',
              height: 44,
              padding: '0 20px',
              borderRadius: 10,
              border: '1px solid rgba(250,255,254,0.12)',
              background: 'rgba(6,10,5,0.88)',
              color: 'rgba(250,255,254,0.45)',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ← Home
          </button>

          {/* Champion pill */}
          <div
            className="reveal-fade-up d-200"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: 'rgba(6,10,5,0.88)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(236,88,56,0.25)',
              borderRadius: 14,
              padding: '18px 26px',
              boxShadow: '0 0 0 1px rgba(0,0,0,.70), 0 8px 32px rgba(0,0,0,.55)',
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="#ec5838"
              style={{ flexShrink: 0 }}
            >
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17.3l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
            <div>
              <p
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,255,254,0.35)',
                  margin: '0 0 3px',
                }}
              >
                Champion
              </p>
              <p style={{ fontSize: '1.20rem', fontWeight: 800, color: '#ec5838', margin: 0 }}>
                {champion.title}
              </p>
            </div>
          </div>
        </header>

        {/* Table — solid dark card */}
        <div
          className="flex-1 flex flex-col min-h-0 reveal-fade-up d-200"
          style={{
            background: 'rgba(4,8,3,0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(250,255,254,0.09)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
            <div
              style={{
                padding: '20px 28px 16px',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                color: 'transparent',
                userSelect: 'none',
              }}
            >
              Players
            </div>
            {Array.from({ length: totalRounds }, (_, i) => (
              <div
                key={i}
                style={{
                  padding: '20px 32px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,255,254,0.45)',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span style={{ width: 22, flexShrink: 0 }} />
                {roundColHeader(i, totalRounds)}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(250,255,254,0.10)' }} />

          {/* Player rows */}
          {rows.map((row, rowIdx) => (
            <div
              key={row.playerId}
              className="reveal-fade-up"
              style={{
                transitionDelay: `${160 + rowIdx * 140}ms`,
                display: 'grid',
                gridTemplateColumns: gridTemplate,
                alignItems: 'stretch',
                position: 'relative',
                borderLeft: `4px solid ${row.colour}`,
                borderBottom: '1px solid rgba(250,255,254,0.07)',
              }}
            >
              {/* Row colour tint — slightly more solid for TV readability */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: toRgba(row.colour, 0.07),
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />

              {/* Name cell */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: '28px 28px 28px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: row.colour,
                    boxShadow: `0 0 12px ${toRgba(row.colour, 0.55)}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{ fontSize: '1.30rem', fontWeight: 700, color: 'rgba(250,255,254,0.94)' }}
                >
                  {row.displayName}
                </span>
                {row.isHost && (
                  <span
                    style={{
                      fontSize: '0.56rem',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '3px 9px',
                      borderRadius: 4,
                      background: 'rgba(236,88,56,0.13)',
                      border: '1px solid rgba(236,88,56,0.30)',
                      color: '#ec5838',
                    }}
                  >
                    Host
                  </span>
                )}
              </div>

              {/* Round cells */}
              {Array.from({ length: totalRounds }, (_, i) => {
                const cell = row.rounds[i]
                const isChamp = cell?.itemId === champion.itemId
                return (
                  <div
                    key={i}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      padding: '28px 32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontSize: '1.10rem',
                      fontWeight: isChamp ? 700 : 500,
                      color: isChamp ? '#fafffe' : 'rgba(250,255,254,0.55)',
                      borderLeft: '1px solid rgba(250,255,254,0.07)',
                      textAlign: 'center',
                    }}
                  >
                    {/* Fixed-width star slot — always reserved so text stays aligned */}
                    <span
                      style={{
                        width: 22,
                        flexShrink: 0,
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      {isChamp && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#ec5838">
                          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17.3l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                        </svg>
                      )}
                    </span>
                    {cell ? cell.title : '—'}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
