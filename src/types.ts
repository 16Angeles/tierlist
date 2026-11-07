export type Mode = 'shared' | 'split'

/** 'shared' — общая оценка, 'u1'/'u2' — два участника в раздельном режиме */
export type PersonId = 'shared' | 'u1' | 'u2'

export type Kind = 'movie' | 'series' | 'anime' | 'game' | 'book' | 'other'

export interface Rating {
  score: number
  updatedAt: number
}

export interface Item {
  id: string
  title: string
  year?: number
  kind: Kind
  poster?: string
  url?: string
  note?: string
  ratings: Partial<Record<PersonId, Rating>>
  /** порядок внутри своей строки тирлиста */
  order: number
  orderAt: number
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export interface Meta {
  name: string
  mode: Mode
  people: { u1: string; u2: string }
  updatedAt: number
}

export interface Doc {
  v: number
  updatedAt: number
  meta: Meta
  items: Item[]
}

export const KIND_LABEL: Record<Kind, string> = {
  movie: 'Фильм',
  series: 'Сериал',
  anime: 'Аниме',
  game: 'Игра',
  book: 'Книга',
  other: 'Прочее',
}
