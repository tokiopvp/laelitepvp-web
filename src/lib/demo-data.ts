import { Member, Top, Tournament, Product, News } from './types'

// Datos demo usados como fallback hasta que Supabase tenga datos reales
export const demoMembers: Member[] = [
  { id: '1', user_id: null, nickname: 'TokioCEO', free_fire_id: '123456789', role_in_clan: 'leader', rank: 'Grandmaster', level: 80, kd_ratio: 12.5, headshots: 15420, wins: 3200, booyahs: 890, avatar_url: null, outfit_image_url: null, is_active: true, joined_at: '2024-01-15', last_sync: null, created_at: '', updated_at: '' },
  { id: '2', user_id: null, nickname: 'ShadowKiller', free_fire_id: '234567890', role_in_clan: 'interim_leader', rank: 'Grandmaster', level: 78, kd_ratio: 11.2, headshots: 13200, wins: 2980, booyahs: 810, avatar_url: null, outfit_image_url: null, is_active: true, joined_at: '2024-02-20', last_sync: null, created_at: '', updated_at: '' },
  { id: '3', user_id: null, nickname: 'NightmareOP', free_fire_id: '345678901', role_in_clan: 'elder', rank: 'Master', level: 75, kd_ratio: 10.8, headshots: 11800, wins: 2750, booyahs: 760, avatar_url: null, outfit_image_url: null, is_active: true, joined_at: '2024-03-10', last_sync: null, created_at: '', updated_at: '' },
  { id: '4', user_id: null, nickname: 'GhostAim', free_fire_id: '456789012', role_in_clan: 'member', rank: 'Master', level: 72, kd_ratio: 9.5, headshots: 9800, wins: 2400, booyahs: 680, avatar_url: null, outfit_image_url: null, is_active: true, joined_at: '2024-04-05', last_sync: null, created_at: '', updated_at: '' },
  { id: '5', user_id: null, nickname: 'VenomPro', free_fire_id: '567890123', role_in_clan: 'member', rank: 'Diamond', level: 68, kd_ratio: 8.7, headshots: 8200, wins: 2100, booyahs: 590, avatar_url: null, outfit_image_url: null, is_active: true, joined_at: '2024-05-12', last_sync: null, created_at: '', updated_at: '' },
  { id: '6', user_id: null, nickname: 'PhantomX', free_fire_id: '678901234', role_in_clan: 'member', rank: 'Diamond', level: 65, kd_ratio: 8.1, headshots: 7600, wins: 1950, booyahs: 540, avatar_url: null, outfit_image_url: null, is_active: true, joined_at: '2024-06-18', last_sync: null, created_at: '', updated_at: '' },
  { id: '7', user_id: null, nickname: 'CrimsonFang', free_fire_id: '789012345', role_in_clan: 'member', rank: 'Platinum', level: 60, kd_ratio: 7.3, headshots: 6400, wins: 1700, booyahs: 480, avatar_url: null, outfit_image_url: null, is_active: true, joined_at: '2024-07-22', last_sync: null, created_at: '', updated_at: '' },
  { id: '8', user_id: null, nickname: 'BlazeKing', free_fire_id: '890123456', role_in_clan: 'member', rank: 'Platinum', level: 58, kd_ratio: 6.9, headshots: 5800, wins: 1550, booyahs: 430, avatar_url: null, outfit_image_url: null, is_active: true, joined_at: '2024-08-30', last_sync: null, created_at: '', updated_at: '' },
]

export const demoTournaments: Tournament[] = [
  { id: '1', name: 'Elite Cup Season 12', game_mode: 'Squad', prize: '$500 USD', placement: 1, date_played: '2025-07-15', screenshot_url: null, replay_url: null, participants_count: 64, created_by: null, created_at: '', updated_at: '' },
  { id: '2', name: 'Free Fire Pro League', game_mode: 'Squad', prize: '$1000 USD', placement: 1, date_played: '2025-06-20', screenshot_url: null, replay_url: null, participants_count: 128, created_by: null, created_at: '', updated_at: '' },
  { id: '3', name: 'Solo Masters', game_mode: 'Solo', prize: '$200 USD', placement: 1, date_played: '2025-05-10', screenshot_url: null, replay_url: null, participants_count: 256, created_by: null, created_at: '', updated_at: '' },
  { id: '4', name: 'Duo Showdown', game_mode: 'Duo', prize: '$300 USD', placement: 2, date_played: '2025-04-22', screenshot_url: null, replay_url: null, participants_count: 64, created_by: null, created_at: '', updated_at: '' },
  { id: '5', name: 'Clash Squad Championship', game_mode: 'Clash Squad', prize: '$400 USD', placement: 1, date_played: '2025-03-18', screenshot_url: null, replay_url: null, participants_count: 32, created_by: null, created_at: '', updated_at: '' },
]

export const demoProducts: Product[] = [
  { id: '1', name: '100 Diamantes', category: 'diamonds', diamonds_amount: 100, price_usd: 1.99, discount_percent: 0, stock: -1, image_url: null, description: '100 diamantes instantáneos', is_featured: false, is_active: true, created_at: '', updated_at: '' },
  { id: '2', name: '310 Diamantes', category: 'diamonds', diamonds_amount: 310, price_usd: 4.99, discount_percent: 5, stock: -1, image_url: null, description: '310 diamantes instantáneos', is_featured: true, is_active: true, created_at: '', updated_at: '' },
  { id: '3', name: '520 Diamantes', category: 'diamonds', diamonds_amount: 520, price_usd: 7.99, discount_percent: 5, stock: -1, image_url: null, description: '520 diamantes instantáneos', is_featured: false, is_active: true, created_at: '', updated_at: '' },
  { id: '4', name: '1060 Diamantes', category: 'diamonds', diamonds_amount: 1060, price_usd: 14.99, discount_percent: 10, stock: -1, image_url: null, description: '1060 diamantes instantáneos', is_featured: true, is_active: true, created_at: '', updated_at: '' },
  { id: '5', name: '2180 Diamantes', category: 'diamonds', diamonds_amount: 2180, price_usd: 29.99, discount_percent: 10, stock: -1, image_url: null, description: '2180 diamantes instantáneos', is_featured: false, is_active: true, created_at: '', updated_at: '' },
  { id: '6', name: '5600 Diamantes', category: 'diamonds', diamonds_amount: 5600, price_usd: 74.99, discount_percent: 15, stock: -1, image_url: null, description: '5600 diamantes instantáneos', is_featured: true, is_active: true, created_at: '', updated_at: '' },
  { id: '7', name: 'Weekly Membership', category: 'membership', diamonds_amount: 0, price_usd: 3.99, discount_percent: 0, stock: -1, image_url: null, description: 'Membresía semanal Elite', is_featured: false, is_active: true, created_at: '', updated_at: '' },
  { id: '8', name: 'Monthly Membership', category: 'membership', diamonds_amount: 0, price_usd: 12.99, discount_percent: 0, stock: -1, image_url: null, description: 'Membresía mensual Elite', is_featured: true, is_active: true, created_at: '', updated_at: '' },
  { id: '9', name: 'Elite Bundle', category: 'bundle', diamonds_amount: 2200, price_usd: 24.99, discount_percent: 20, stock: -1, image_url: null, description: 'Bundle exclusivo Elite', is_featured: false, is_active: true, created_at: '', updated_at: '' },
  { id: '10', name: 'Booyah Pass', category: 'pass', diamonds_amount: 0, price_usd: 9.99, discount_percent: 0, stock: -1, image_url: null, description: 'Booyah Pass mensual', is_featured: false, is_active: true, created_at: '', updated_at: '' },
]

export const demoNews: News[] = [
  { id: '1', title: 'La Elite PvP conquista la Elite Cup S12', slug: 'elite-cup-s12', excerpt: 'Ganamos el torneo más grande de la temporada.', content: '# Victoria\n\nNuestro squad dominó la Elite Cup Season 12 con un performance perfecto.', cover_image_url: null, author_id: null, is_published: true, published_at: '2025-07-16', created_at: '', updated_at: '' },
  { id: '2', title: 'Nuevos ingresos abiertos', slug: 'nuevos-ingresos', excerpt: 'Buscamos talento competitivo.', content: 'Estamos reclutando jugadores Diamond+ para la próxima temporada.', cover_image_url: null, author_id: null, is_published: true, published_at: '2025-07-01', created_at: '', updated_at: '' },
]
