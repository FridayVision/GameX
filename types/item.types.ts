export type ItemSource = 'tmdb' | 'reddit' | 'wikipedia' | 'web' | 'manual'

export interface Item {
  itemId: string
  title: string
  contextLine: string
  blurb: string
  imageUrl: string | null
  source: ItemSource
  popularityScore: number
  voteCount?: number // TMDB total ratings — primary popularity signal
  voteAverage?: number // TMDB average rating (0–10)
}
