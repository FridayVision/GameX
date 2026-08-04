'use client'
import { useState } from 'react'
import { PLAYER_COLOURS, toRgba } from '@/lib/colours'

interface JoinFormProps {
  takenColours: string[]
  onJoin: (displayName: string, colour: string) => void
  loading: boolean
  roomCode: string
  hostName?: string
}

export function JoinForm({ takenColours, onJoin, loading, roomCode, hostName }: JoinFormProps) {
  const [name, setName] = useState('')
  const [colour, setColour] = useState<string | null>(null)

  const trimmed = name.trim()
  const ready = trimmed.length > 0 && colour !== null && !loading

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        className="flex-1 overflow-y-auto px-6 pt-7 pb-4"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
      >
        {/* Room info */}
        <p className="text-[rgba(250,255,254,0.35)] text-[0.70rem] font-medium mb-6">
          Room <span style={{ color: '#ec5838', fontWeight: 700 }}>{roomCode}</span>
          {hostName && (
            <>
              <span className="text-[rgba(250,255,254,0.20)] mx-1.5">·</span>
              <span className="text-[rgba(250,255,254,0.30)]">Host: {hostName}</span>
            </>
          )}
        </p>

        {/* Name */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-[rgba(250,255,254,0.50)] text-[0.56rem] uppercase tracking-[0.26em] font-bold">
              Your Name
            </label>
            <span
              className="text-[0.58rem] font-bold"
              style={{
                color: name.length > 20 ? 'rgba(236,88,56,0.80)' : 'rgba(250,255,254,0.28)',
              }}
            >
              {name.length} / 25
            </span>
          </div>
          <input
            type="text"
            maxLength={25}
            placeholder="What do people call you?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-[52px] bg-[rgba(8,8,8,0.65)] border border-[rgba(250,255,254,0.14)] rounded-[10px] px-4 font-bold text-[1rem] text-[rgba(250,255,254,1)] placeholder:text-[rgba(250,255,254,0.24)] placeholder:font-medium focus:outline-none focus:border-[rgba(236,88,56,0.65)] transition-colors"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
          />
        </section>

        {/* Colour */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <label className="text-[rgba(250,255,254,0.50)] text-[0.56rem] uppercase tracking-[0.26em] font-bold">
              Your Colour
            </label>
            <span
              className="text-[0.60rem] font-medium"
              style={{ color: colour ? '#15F4C7' : 'rgba(250,255,254,0.28)' }}
            >
              {colour ? '✓ Selected' : 'Pick one'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            {PLAYER_COLOURS.map((hex) => {
              const taken = takenColours.includes(hex)
              const selected = colour === hex
              return (
                <button
                  key={hex}
                  disabled={taken}
                  onClick={() => setColour(selected ? null : hex)}
                  className="relative flex-shrink-0"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: hex,
                    opacity: taken ? 0.18 : 1,
                    filter: taken ? 'grayscale(0.80)' : undefined,
                    cursor: taken ? 'not-allowed' : 'pointer',
                    transform: selected ? 'scale(1.14)' : undefined,
                    outline: selected ? '3px solid rgba(250,255,254,0.90)' : undefined,
                    outlineOffset: selected ? 4 : undefined,
                    transition: 'transform 0.14s cubic-bezier(.16,1,.3,1)',
                  }}
                  aria-label={hex}
                >
                  {selected && (
                    <span
                      className="absolute inset-0 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.28)' }}
                    >
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                  {taken && (
                    <span
                      className="absolute inset-0 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(8,8,8,0.55)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <line
                          x1="5"
                          y1="5"
                          x2="19"
                          y2="19"
                          stroke="rgba(250,255,254,0.6)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <p className="text-[rgba(250,255,254,0.22)] text-[0.60rem] mt-3.5 text-center">
            Greyed out colours are taken by others in the room
          </p>
        </section>

        {/* Preview */}
        {trimmed.length > 0 && colour && (
          <div className="mb-2">
            <div className="h-px bg-[rgba(250,255,254,0.07)] mb-5" />
            <p className="text-[rgba(250,255,254,0.38)] text-[0.56rem] uppercase tracking-[0.26em] font-bold mb-3 text-center">
              Preview
            </p>
            <div className="flex items-center justify-center gap-3">
              <div
                className="w-11 h-11 rounded-full border-2 flex items-center justify-center font-black text-lg"
                style={{
                  background: toRgba(colour, 0.13),
                  borderColor: colour,
                  color: colour,
                }}
              >
                {trimmed[0].toUpperCase()}
              </div>
              <span className="font-bold text-[1.05rem] text-[rgba(250,255,254,0.85)]">
                {trimmed}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Join button */}
      <div className="shrink-0 border-t border-[rgba(250,255,254,0.07)] px-6 pt-4 pb-5">
        <button
          disabled={!ready}
          onClick={() => ready && onJoin(trimmed, colour!)}
          className="w-full h-[52px] bg-[#ec5838] text-white font-bold text-[1rem] rounded-[12px] shadow-[0_0_20px_rgba(236,88,56,0.24)] flex items-center justify-center gap-2 disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
        >
          {loading ? (
            'Joining…'
          ) : (
            <>
              Join Room
              <svg
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
        <p className="text-[rgba(250,255,254,0.22)] text-[0.62rem] text-center mt-2">
          No account needed
        </p>
      </div>
    </div>
  )
}
