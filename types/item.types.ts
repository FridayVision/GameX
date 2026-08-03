export type ItemSource = 'tmdb' | 'reddit' | 'wikipedia' | 'web' | 'manual'

export interface Item {
  itemId: string
  title: string
  contextLine: string
  blurb: string
  imageUrl: string | null
  source: ItemSource
  popularityScore: number
}
