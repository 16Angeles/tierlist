export type Mode = 'shared' | 'split'

/** 'shared' — общая оценка, 'u1'/'u2' — два участника в раздельном режиме */
export type PersonId = 'shared' | 'u1' | 'u2'

export type Kind = 'movie' | 'series' | 'anime' | 'game' | 'book' | 'other'

export type FactorId = 'plot' | 'fun' | 'music' | 'atmosphere' | 'rewatch'

export type Factors = Record<FactorId, number>

export type Weights = Record<FactorId, number>

export interface FactorMeta {
  id: FactorId
  label: string
  /** короткая подпись для узких колонок */
  short: string
  hint: string
}

/** шкала из 5 факторов — из неё считается итоговая оценка */
export const FACTORS: FactorMeta[] = [
  { id: 'plot', label: 'Сюжет', short: 'Сюжет', hint: 'история и её развитие' },
  { id: 'fun', label: 'Развлекательность', short: 'Затягивает', hint: 'насколько затягивает' },
  { id: 'music', label: 'Музыкальное сопровождение', short: 'Музыка', hint: 'саундтрек и звук' },
  { id: 'atmosphere', label: 'Атмосфера', short: 'Атмосфера', hint: 'мир, настроение, картинка' },
  {
    id: 'rewatch',
    label: 'Пересмотрибельность',
    short: 'Пересмотр',
    hint: 'хочется ли пересмотреть',
  },
]

export interface Rating {
  score: number
  /** детализация по 5 факторам; если задана — оценка считается из неё */
  factors?: Factors
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
  /** веса факторов при расчёте итоговой оценки (общие для всех) */
  weights?: Weights
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
