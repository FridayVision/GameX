'use client'
import type { PlayerPublicState } from '@/types/player.types'
import type { BracketSize } from '@/types/room.types'
import { toRgba } from '@/lib/colours'

interface BoardLobbyScreenProps {
  roomCode: string
  bracketSize: BracketSize
  players: PlayerPublicState[]
}

const MAX_PLAYERS = 8
const MIN_TO_START = 3

export function BoardLobbyScreen({ roomCode, bracketSize, players }: BoardLobbyScreenProps) {
  const canStart = players.length >= MIN_TO_START
  const hostPlayer = players.find((p) => p.isHost)
  const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => players[i] ?? null)

  return (
    <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
      <div
        className="w-full flex flex-col items-center rounded-[28px] px-10 py-10"
        style={{
          maxWidth: 'min(960px, 92vw)',
          background: '#0e0e0e',
          border: '1px solid rgba(250,255,254,.18)',
          boxShadow: '0 0 0 1px rgba(0,0,0,.9), 0 24px 80px rgba(0,0,0,.75)',
        }}
      >
        {/* Room code */}
        <div className="text-center mb-8">
          <p className="text-[rgba(255,255,255,0.40)] text-[0.54rem] uppercase tracking-[0.40em] font-bold mb-5">
            Enter this code on your phone
          </p>
          <div className="flex gap-4 justify-center">
            {roomCode.split('').map((digit, i) => (
              <div
                key={i}
                style={{
                  width: 'clamp(88px, 9.5vw, 128px)',
                  height: 'clamp(108px, 11.5vw, 158px)',
                  border: '2px solid rgba(236,88,56,.45)',
                  borderRadius: 18,
                  background: 'rgba(236,88,56,.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'clamp(3.2rem, 5.8vw, 6rem)',
                  fontWeight: 900,
                  fontVariantNumeric: 'tabular-nums',
                  color: '#ec5838',
                  boxShadow: '0 0 32px rgba(236,88,56,.45), 0 0 10px rgba(236,88,56,.25)',
                }}
              >
                {digit}
              </div>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div className="text-center mb-9">
          <p className="text-[rgba(255,255,255,0.32)] text-[0.50rem] uppercase tracking-[0.32em] font-bold mb-2">
            Topic
          </p>
          <p
            className="text-[rgba(255,255,255,0.75)] font-bold"
            style={{ fontSize: 'clamp(.9rem, 1.6vw, 1.3rem)' }}
          >
            {bracketSize} items · {Math.log2(bracketSize)} rounds
          </p>
        </div>

        <div className="w-full h-px mb-9" style={{ background: 'rgba(250,255,254,.07)' }} />

        {/* Player slots */}
        <div className="flex items-start gap-6 justify-center mb-8 w-full flex-wrap">
          {slots.map((player, i) => (
            <div key={i} className="text-center">
              <div
                style={{
                  width: 'clamp(60px, 6.2vw, 84px)',
                  height: 'clamp(60px, 6.2vw, 84px)',
                  borderRadius: '50%',
                  border: player
                    ? `2px solid ${player.colour}`
                    : '2px dashed rgba(250,255,254,.12)',
                  background: player ? toRgba(player.colour, 0.16) : 'rgba(250,255,254,.02)',
                  color: player?.colour ?? 'transparent',
                  boxShadow: player
                    ? `0 0 16px ${toRgba(player.colour, 0.55)}, 0 0 36px ${toRgba(player.colour, 0.25)}`
                    : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'clamp(1.2rem, 1.7vw, 1.9rem)',
                  fontWeight: 900,
                  margin: '0 auto',
                  animation: player ? 'pop .45s cubic-bezier(.16,1,.3,1)' : undefined,
                }}
              >
                {player ? player.displayName[0] : ''}
              </div>
              <div
                className="mt-[7px] text-center overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                  fontSize: 'clamp(.56rem,.8vw,.76rem)',
                  fontWeight: 600,
                  color: player ? 'rgba(250,255,254,.78)' : 'rgba(250,255,254,.32)',
                  maxWidth: 76,
                  margin: '7px auto 0',
                }}
              >
                {player ? player.displayName : '—'}
              </div>
              {player?.isHost && (
                <div
                  className="text-center text-[0.42rem] font-extrabold tracking-[0.09em] uppercase px-[5px] py-[2px] rounded-[3px] mt-[3px] mx-auto w-fit"
                  style={{
                    background: 'rgba(236,88,56,.14)',
                    border: '1px solid rgba(236,88,56,.28)',
                    color: '#ec5838',
                  }}
                >
                  Host
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-4">
          <span
            className="inline-flex items-center gap-2 px-5 py-[7px] rounded-full font-bold"
            style={{
              fontSize: 'clamp(.66rem,.86vw,.80rem)',
              background: canStart ? 'rgba(34,197,94,.09)' : 'rgba(250,255,254,.05)',
              border: canStart
                ? '1px solid rgba(34,197,94,.28)'
                : '1px solid rgba(250,255,254,.12)',
              color: canStart ? '#22c55e' : 'rgba(250,255,254,.48)',
            }}
          >
            {players.length} of {MAX_PLAYERS} players
          </span>
          <span
            className="flex items-center gap-2 text-[rgba(255,255,255,0.40)]"
            style={{ fontSize: 'clamp(.63rem,.83vw,.78rem)' }}
          >
            {canStart ? (
              <>
                <span style={{ color: hostPlayer?.colour ?? '#ec5838', fontWeight: 700 }}>
                  {hostPlayer?.displayName ?? 'Host'}
                </span>{' '}
                can start the game
              </>
            ) : (
              <>
                <span
                  className="inline-block w-[7px] h-[7px] rounded-full anim-pulse-dot"
                  style={{ background: 'currentColor' }}
                />
                Need {MIN_TO_START - players.length} more player
                {MIN_TO_START - players.length > 1 ? 's' : ''} to start
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
