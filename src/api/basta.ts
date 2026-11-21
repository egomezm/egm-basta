import { rpc } from './client'
import { getToken } from '../lib/identity'

export interface Settings {
  basta_seconds: number
  pts_unique: number
  pts_shared: number
}
export interface Player {
  id: string
  name: string
  join_seq: number
  first_round: number
  is_creator: boolean
  connected: boolean
}
export type RoundStatus = 'picking' | 'writing' | 'countdown' | 'locked'
export interface Round {
  id: string
  number: number
  letter: string | null
  pool: string
  spinner_id: string | null
  stopper_id: string | null
  status: RoundStatus
  spin_started_at: number | null
  stopped_at: number | null
  basta_by: string | null
  basta_at: number | null
}
export interface Answer {
  round_id: string
  player_id: string
  category_idx: number
  text: string
  normalized: string
}
export interface Vote {
  round_id: string
  target_player_id: string
  category_idx: number
  voter_id: string
  valid: boolean
}
export interface SessionInfo {
  id: string
  code: string
  name: string
  status: 'lobby' | 'playing' | 'closed'
  categories: string[]
  settings: Settings
  used_letters: string[]
  creator_player_id: string
  expires_at: number
}
export interface GameState {
  now: number
  me: string
  session: SessionInfo
  players: Player[]
  rounds: Round[]
  answers: Answer[]
  votes: Vote[]
}
export interface DraftAnswer {
  idx: number
  text: string
}

const tok = () => ({ p_token: getToken() })

export const createSession = (
  playerName: string,
  name: string,
  categories: string[],
  settings: Settings,
) =>
  rpc<string>('basta_create_session', {
    ...tok(),
    p_player_name: playerName,
    p_name: name,
    p_categories: categories,
    p_settings: settings,
  })

export const joinSession = (code: string, name: string) =>
  rpc<string>('basta_join_session', { p_code: code, ...tok(), p_name: name })

export const getState = (code: string) =>
  rpc<GameState>('basta_get_state', { p_code: code, ...tok() })

export const startSpin = (code: string) => rpc('basta_start_spin', { p_code: code, ...tok() })
export const stopSpin = (code: string) => rpc('basta_stop_spin', { p_code: code, ...tok() })
export const pressBasta = (code: string, answers: DraftAnswer[]) =>
  rpc('basta_press_basta', { p_code: code, ...tok(), p_answers: answers })
export const submitAnswers = (code: string, answers: DraftAnswer[]) =>
  rpc('basta_submit_answers', { p_code: code, ...tok(), p_answers: answers })
export const vote = (
  code: string,
  round: string,
  target: string,
  idx: number,
  valid: boolean | null,
) =>
  rpc('basta_vote', {
    p_code: code,
    ...tok(),
    p_round: round,
    p_target: target,
    p_idx: idx,
    p_valid: valid,
  })
export const nextRound = (code: string) => rpc('basta_next_round', { p_code: code, ...tok() })
export const closeSession = (code: string) => rpc('basta_close_session', { p_code: code, ...tok() })
