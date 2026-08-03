export interface AssignmentRecord {
  playerId: string
  roundIndex: number
  itemId: string
}

export interface AssignmentPayload {
  itemId: string
  itemTitle: string
  roundIndex: number
  totalRounds: number // computed as Math.log2(bracketSize) at emit time
}
