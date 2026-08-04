export interface AssignmentRecord {
  playerId: string
  roundIndex: number
  itemId: string
}

// Sent to individual player socket only — never emitted to /board
export interface AssignmentPayload {
  itemId: string
  itemTitle: string
  imageUrl: string | null
  contextLine: string
  roundIndex: number
  totalRounds: number // Math.log2(bracketSize)
}
