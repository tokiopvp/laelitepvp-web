export type Role = 'owner' | 'admin' | 'moderator' | 'editor' | 'member'
export type Rank = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster' | 'Heroic'
export type TopCategory = 'kd' | 'headshots' | 'wins' | 'booyahs' | 'level' | 'rank'
export type GameMode = 'Solo' | 'Duo' | 'Squad' | 'Clash Squad'
export type ProductCategory = 'diamonds' | 'membership' | 'bundle' | 'pass'
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'delivered' | 'cancelled'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface Member {
  id: string
  user_id: string | null
  nickname: string
  free_fire_id: string | null
  role_in_clan: 'leader' | 'co-leader' | 'elder' | 'member' | null
  rank: Rank | null
  level: number
  kd_ratio: number
  headshots: number
  wins: number
  booyahs: number
  kills?: number | null
  winrate?: number | null
  kpp?: number | null
  partidas?: number | null
  dano_partida?: number | null
  headshot_tasa?: number | null
  top10_tasa?: number | null
  max_kills?: number | null
  revividas?: number | null
  stats_json?: Record<string, number> | null
  avatar_url: string | null
  outfit_image_url: string | null
  is_active: boolean
  joined_at: string
  last_sync: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  role: Role
  bio: string | null
  discord_id: string | null
  free_fire_id: string | null
  member_id: string | null
  points: number
  last_checkin: string | null
  is_member: boolean
  created_at: string
  updated_at: string
}

export interface PointEvent {
  id: string
  profile_id: string
  type: 'checkin' | 'link'
  amount: number
  created_at: string
}

export interface PaymentMethod {
  id: string
  name: string
  icon: string | null
  country: string
  enabled: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface Setting {
  key: string
  value: string | null
  updated_at: string
}

export interface Top {
  id: string
  category: TopCategory
  member_id: string
  value: number
  rank_position: number | null
  updated_at: string
}

export interface Tournament {
  id: string
  name: string
  game_mode: GameMode | null
  prize: string | null
  placement: number | null
  date_played: string | null
  screenshot_url: string | null
  replay_url: string | null
  participants_count: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  category: ProductCategory
  diamonds_amount: number | null
  price_usd: number
  discount_percent: number
  stock: number
  image_url: string | null
  description: string | null
  is_featured: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface News {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  cover_image_url: string | null
  author_id: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}
