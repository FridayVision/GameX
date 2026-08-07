'use client'
import { useEffect, useState } from 'react'
import type { Item } from '@/types/item.types'
import type { RevealRow } from '@/hooks/use-board-socket'
import { toRgba } from '@/lib/colours'

interface BoardRevealTableProps {
  rows: RevealRow[]
  champion: Item
  totalRounds: number
}

function roundColHeader(index: number, total: number): string {
  if (index === total - 1) return 'Final'
  if (index === total - 2 && total > 2) return 'Semi'
  return `R${index + 1}`
}

export function BoardRevealTable({ rows, champion, totalRounds }: BoardRevealTableProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setTimeout(() => setLoaded(true), 80))
  }, [])

  const gridTemplate = `260px repeat(${totalRounds}, 1fr)`

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
        style={{ padding: '48px 80px 40px' }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between flex-shrink-0"
          style={{ marginBottom: 32, gap: 24 }}
        >
          {/* Title */}
          <div
            className="reveal-fade-up d-100"
            style={{
              background: 'rgba(6,10,5,0.82)',
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
                color: 'rgba(250,255,254,0.30)',
                margin: '0 0 5px',
              }}
            >
              Post-Game Reveal
            </p>
            <h1
              style={{
                fontSize: '2.80rem',
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

          {/* Champion pill */}
          <div
            className="reveal-fade-up d-200"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(6,10,5,0.82)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(250,255,254,0.10)',
              borderRadius: 14,
              padding: '18px 24px',
              boxShadow: '0 0 0 1px rgba(0,0,0,.70), 0 8px 32px rgba(0,0,0,.55)',
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="#ec5838"
              style={{ flexShrink: 0 }}
            >
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17.3l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
            <div>
              <p
                style={{
                  fontSize: '0.60rem',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,255,254,0.30)',
                  margin: '0 0 2px',
                }}
              >
                Champion
              </p>
              <p style={{ fontSize: '1.10rem', fontWeight: 700, color: '#ec5838', margin: 0 }}>
                {champion.title}
              </p>
            </div>
          </div>
        </header>

        {/* Table — solid dark card so LED dots don't bleed through */}
        <div
          className="flex-1 flex flex-col min-h-0 reveal-fade-up d-200"
          style={{
            background: 'rgba(4,8,3,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(250,255,254,0.09)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
            <div
              style={{
                padding: '18px 24px 14px',
                fontSize: '0.72rem',
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
                  padding: '18px 28px 14px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,255,254,0.50)',
                }}
              >
                {roundColHeader(i, totalRounds)}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(250,255,254,0.10)', marginBottom: 4 }} />

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
              {/* Faint row tint */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: toRgba(row.colour, 0.04),
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />

              {/* Name cell */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: '24px 24px 24px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: row.colour,
                    boxShadow: `0 0 10px ${toRgba(row.colour, 0.5)}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{ fontSize: '1.10rem', fontWeight: 700, color: 'rgba(250,255,254,0.92)' }}
                >
                  {row.displayName}
                </span>
                {row.isHost && (
                  <span
                    style={{
                      fontSize: '0.52rem',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '2px 7px',
                      borderRadius: 3,
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
                      padding: '24px 28px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: isChamp ? '#fafffe' : 'rgba(250,255,254,0.60)',
                      borderLeft: '1px solid rgba(250,255,254,0.07)',
                      background: isChamp ? 'rgba(236,88,56,0.10)' : undefined,
                    }}
                  >
                    {isChamp && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 14,
                          bottom: 14,
                          width: 3,
                          background: '#ec5838',
                          borderRadius: 1,
                        }}
                      />
                    )}
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
