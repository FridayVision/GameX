'use client'
import type { PlayerPublicState } from '@/types/player.types'
import type { BracketSize } from '@/types/room.types'
import { toRgba } from '@/lib/colours'

interface HostLobbyScreenProps {
  roomCode: string
  reclaimCode: string
  bracketSize: BracketSize
  players: PlayerPublicState[]
  currentPlayerId: string
}

export function HostLobbyScreen({
  roomCode,
  reclaimCode,
  bracketSize,
  players,
  currentPlayerId,
}: HostLobbyScreenProps) {
  const totalRounds = Math.log2(bracketSize)
  const canStart = players.length >= 3
  const needMore = 3 - players.length

  return (
    <div className="relative z-10 h-[100dvh] flex flex-col px-4 pt-6 pb-4 overflow-hidden">
      {/* Header card */}
      <div className="w-full max-w-[390px] mx-auto shrink-0 mb-3">
        <div
          className="rounded-[16px] px-5 py-4"
          style={{
            background: '#0e0e0e',
            border: '1px solid rgba(250,255,254,.18)',
            boxShadow: '0 0 0 1px rgba(0,0,0,.8),0 8px 32px rgba(0,0,0,.60)',
          }}
        >
          <h1 className="text-[rgba(250,255,254,1)] text-[1.85rem] font-black leading-none tracking-[-0.03em] uppercase mb-1.5">
            Host Lobby
          </h1>
          <p className="text-[rgba(250,255,254,0.40)] text-[0.72rem] font-medium">
            Room is live · Share the code with your players
          </p>
        </div>
      </div>

      {/* Main card */}
      <div
        className="w-full max-w-[390px] mx-auto flex-1 flex flex-col rounded-[20px] overflow-hidden min-h-0"
        style={{
          background: '#0e0e0e',
          border: '1px solid rgba(250,255,254,.18)',
          boxShadow: '0 0 0 1px rgba(0,0,0,.8),0 16px 56px rgba(0,0,0,.70)',
        }}
      >
        {/* Room code section */}
        <div className="shrink-0 px-6 pt-6 pb-5 border-b border-[rgba(250,255,254,0.07)]">
          <p className="text-[rgba(250,255,254,0.45)] text-[0.56rem] uppercase tracking-[0.26em] font-bold mb-3">
            Room Code
          </p>
          <div className="flex gap-2.5 justify-center mb-4">
            {roomCode.split('').map((digit, i) => (
              <div
                key={i}
                style={{
                  width: 52,
                  height: 64,
                  border: '1.5px solid rgba(236,88,56,.45)',
                  borderRadius: 11,
                  background: 'rgba(236,88,56,.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.4rem',
                  fontWeight: 900,
                  fontVariantNumeric: 'tabular-nums',
                  color: '#ec5838',
                  boxShadow: '0 0 18px rgba(236,88,56,.30), 0 0 6px rgba(236,88,56,.18)',
                }}
              >
                {digit}
              </div>
            ))}
          </div>

          {/* Reclaim code */}
          <div className="mt-2 mb-3 text-center">
            <p className="text-[rgba(250,255,254,0.30)] text-[0.52rem] uppercase tracking-[0.22em] font-bold mb-1">
              Host Reclaim Code
            </p>
            <p
              className="font-mono font-bold text-[1.1rem] tracking-[0.20em]"
              style={{ color: 'rgba(236,88,56,0.55)' }}
            >
              {reclaimCode.toUpperCase()}
            </p>
            <p className="text-[rgba(250,255,254,0.22)] text-[0.56rem] mt-1">
              Note this down — use it if you lose your session
            </p>
          </div>

          <div className="flex items-center gap-1.5 justify-center flex-wrap">
            <span className="text-[rgba(250,255,254,0.32)] text-[0.68rem]">
              {bracketSize} items
            </span>
            <span className="text-[rgba(250,255,254,0.22)] text-[0.65rem]">·</span>
            <span className="text-[rgba(250,255,254,0.32)] text-[0.68rem]">
              {totalRounds} rounds
            </span>
          </div>
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 scroll-thin">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[rgba(250,255,254,0.45)] text-[0.56rem] uppercase tracking-[0.26em] font-bold">
              Players
            </span>
            <span className="text-[0.78rem] font-bold text-[#ec5838]">{players.length} / 8</span>
          </div>

          <div>
            {players.map((p) => {
              const isYou = p.playerId === currentPlayerId
              return (
                <div
                  key={p.playerId}
                  className="flex items-center gap-[11px] py-[10px] border-b border-[rgba(250,255,254,0.05)] last:border-b-0 anim-player-in"
                >
                  <div
                    className="w-[38px] h-[38px] rounded-full border-2 flex items-center justify-center text-[0.95rem] font-black flex-shrink-0"
                    style={{
                      borderColor: p.colour,
                      background: toRgba(p.colour, 0.13),
                      color: p.colour,
                    }}
                  >
                    {p.displayName[0]}
                  </div>
                  <div>
                    <div className="text-[0.88rem] font-semibold text-[rgba(250,255,254,0.85)]">
                      {p.displayName}
                    </div>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {isYou && (
                        <span className="text-[0.48rem] font-extrabold tracking-[0.08em] uppercase px-[5px] py-[2px] rounded-[3px] bg-[rgba(250,255,254,0.08)] border border-[rgba(250,255,254,0.14)] text-[rgba(250,255,254,0.48)]">
                          You
                        </span>
                      )}
                      {p.isHost && (
                        <span className="text-[0.48rem] font-extrabold tracking-[0.08em] uppercase px-[5px] py-[2px] rounded-[3px] bg-[rgba(236,88,56,0.13)] border border-[rgba(236,88,56,0.28)] text-[#ec5838]">
                          Host
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-[rgba(250,255,254,0.22)] text-[0.63rem] mt-4 text-center">
            {8 - players.length} more player{8 - players.length !== 1 ? 's' : ''} can join
          </p>
        </div>

        {/* Start button */}
        <div className="shrink-0 border-t border-[rgba(250,255,254,0.07)] px-6 pt-4 pb-5">
          {!canStart && (
            <p className="text-[rgba(250,255,254,0.35)] text-[0.63rem] text-center mb-2.5 flex items-center justify-center gap-1.5">
              <span className="inline-block w-[6px] h-[6px] rounded-full bg-current anim-pulse-dot" />
              Need {needMore} more player{needMore > 1 ? 's' : ''} to start
            </p>
          )}
          <button
            disabled={!canStart}
            className="w-full h-[50px] bg-[#ec5838] text-white font-bold text-[0.97rem] rounded-[12px] shadow-[0_0_20px_rgba(236,88,56,0.24)] flex items-center justify-center gap-2 disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
          >
            Start Game
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
          </button>
        </div>
      </div>
    </div>
  )
}
