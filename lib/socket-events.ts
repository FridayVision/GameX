export const EVENTS = {
  // Connection lifecycle
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  PLAYER_RECONNECT: 'player-reconnect',
  HOST_DISCONNECTED: 'host-disconnected',
  // Pool generation
  POOL_PROGRESS: 'pool-progress',
  POOL_READY: 'pool-ready',
  // Game flow
  ROUND_START: 'round-start',
  ASSIGNMENT: 'assignment', // /player namespace only
  MATCH_START: 'match-start',
  VOTE_OPEN: 'vote-open',
  PLAYER_VOTE: 'player-vote',
  VOTE_RESULT: 'vote-result',
  COIN_FLIP: 'coin-flip',
  MATCH_END: 'match-end',
  ROUND_END: 'round-end',
  GAME_OVER: 'game-over',
  REVEAL_START: 'reveal-start',
  // Host controls (client → server)
  HOST_CALL_VOTE: 'host-call-vote',
  HOST_NEXT_MATCH: 'host-next-match',
  HOST_COIN_FLIP: 'host-coin-flip',
  HOST_LOCK_POOL: 'host-lock-pool',
  // Room management
  ROOM_RESET: 'room-reset',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]
