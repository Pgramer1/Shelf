export enum MediaType {
  MOVIE = 'MOVIE',
  TV_SERIES = 'TV_SERIES',
  ANIME = 'ANIME',
  GAME = 'GAME',
  BOOK = 'BOOK'
}

export enum Status {
  ALL = 'ALL',
  WATCHING = 'WATCHING',
  READING = 'READING',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  DROPPED = 'DROPPED',
  PLAN_TO_WATCH = 'PLAN_TO_WATCH',
  PLAN_TO_READ = 'PLAN_TO_READ',
  PLAN_TO_PLAY = 'PLAN_TO_PLAY'
}

export interface Media {
  id: number;
  title: string;
  type: MediaType;
  totalUnits: number;
  imageUrl?: string;
  description?: string;
  releaseYear?: number;
}

export interface UserMedia {
  id: number;
  media: Media;
  status: Status;
  progress: number;
  rating?: number;
  notes?: string;
  isFavorite: boolean;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface User {
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface MediaRequest {
  title: string;
  type: MediaType;
  totalUnits: number;
  imageUrl?: string;
  description?: string;
  releaseYear?: number;
}

export interface UserMediaRequest {
  mediaId: number;
  status: Status;
  progress?: number;
  rating?: number;
  notes?: string;
  isFavorite?: boolean;
  startedAt?: string;
  completedAt?: string;
}
