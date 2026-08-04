'use client'
import type { PlayerPublicState } from '@/types/player.types'
import type { BracketSize } from '@/types/room.types'
import { toRgba } from '@/lib/colours'

interface PlayerLobbyScreenProps {
  roomCode: string
  bracketSize: BracketSize
  players: PlayerPublicState[]
  currentPlayerId: string
  hostName: string
  topic: string
}

export function PlayerLobbyScreen({
  roomCode,
  bracketSize,
  players,
  currentPlayerId,
  hostName,
  topic,
}: PlayerLobbyScreenProps) {
  const totalRounds = Math.log2(bracketSize)
  const me = players.find((p) => p.playerId === currentPlayerId)

  return (
    <div className="relative z-10 h-[100dvh] flex flex-col px-4 pt-6 pb-4 overflow-hidden">
      {/* Identity card */}
      <div className="w-full max-w-[390px] mx-auto shrink-0 mb-3">
        <div
          className="rounded-[16px] px-5 py-4 flex items-center gap-4"
          style={{
            background: '#0e0e0e',
            border: '1px solid rgba(250,255,254,.18)',
            boxShadow: '0 0 0 1px rgba(0,0,0,.8),0 8px 32px rgba(0,0,0,.60)',
          }}
        >
          {me && (
            <div
              className="w-[68px] h-[68px] rounded-full border-[3px] flex items-center justify-center text-[2rem] font-black flex-shrink-0 anim-glow-pulse"
              style={{
                borderColor: me.colour,
                background: toRgba(me.colour, 0.13),
                color: me.colour,
                ['--glow-col' as string]: toRgba(me.colour, 0.32),
              }}
            >
              {me.displayName[0]}
            </div>
          )}
          <div>
            <p className="text-[rgba(250,255,254,0.38)] text-[0.55rem] uppercase tracking-[0.26em] font-bold mb-0.5">
              You&apos;re in
            </p>
            <h1 className="text-[rgba(250,255,254,1)] text-[1.75rem] font-black leading-none tracking-[-0.03em]">
              {me?.displayName ?? ''}
            </h1>
            <p className="text-[rgba(250,255,254,0.35)] text-[0.70rem] font-medium mt-1">
              Room <span style={{ color: '#ec5838', fontWeight: 700 }}>{roomCode}</span>
            </p>
          </div>
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
        {/* Topic info */}
        <div className="shrink-0 px-6 pt-6 pb-5 border-b border-[rgba(250,255,254,0.07)]">
          <p className="text-[rgba(250,255,254,0.40)] text-[0.56rem] uppercase tracking-[0.26em] font-bold mb-1.5">
            Topic
          </p>
          <p className="text-[rgba(250,255,254,0.80)] font-bold text-[1rem] mb-2">
            {topic || 'TBD'}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[rgba(250,255,254,0.30)] text-[0.65rem]">
              {bracketSize} items
            </span>
            <span className="text-[rgba(250,255,254,0.18)] text-[0.60rem]">·</span>
            <span className="text-[rgba(250,255,254,0.30)] text-[0.65rem]">
              {totalRounds} rounds
            </span>
            <span className="text-[rgba(250,255,254,0.18)] text-[0.60rem]">·</span>
            <span className="text-[rgba(250,255,254,0.30)] text-[0.65rem]">Host: {hostName}</span>
          </div>
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 scroll-thin">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[rgba(250,255,254,0.45)] text-[0.56rem] uppercase tracking-[0.26em] font-bold">
              In The Room
            </span>
            <span className="text-[0.78rem] font-bold" style={{ color: '#15F4C7' }}>
              {players.length} / 8
            </span>
          </div>

          <div>
            {players.map((p) => {
              const isYou = p.playerId === currentPlayerId
              return (
                <div
                  key={p.playerId}
                  className="flex items-center gap-[11px] py-[10px] border-b border-[rgba(250,255,254,0.05)] last:border-b-0"
                >
                  <div
                    className="w-[36px] h-[36px] rounded-full border-2 flex items-center justify-center text-[0.88rem] font-black flex-shrink-0"
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
                    <div className="flex gap-1 mt-0.5">
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
        </div>

        {/* Waiting footer */}
        <div className="shrink-0 border-t border-[rgba(250,255,254,0.07)] px-6 pt-4 pb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            {[0, 280, 560].map((delay) => (
              <span
                key={delay}
                className="w-[5px] h-[5px] rounded-full inline-block anim-waiting-dot"
                style={{ background: '#15F4C7', animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <p className="text-[rgba(250,255,254,0.38)] text-[0.72rem] text-center font-medium">
            Waiting for <span style={{ color: '#ec5838', fontWeight: 700 }}>{hostName}</span> to
            start the game…
          </p>
        </div>
      </div>
    </div>
  )
}
