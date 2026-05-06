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

export type RatingScope = 'GLOBAL' | 'FRIENDS';

export interface CommunityRatingBucket {
  rating: number;
  count: number;
}

export interface CommunityRecentRating {
  username: string;
  rating: number;
  updatedAt: string;
}

export interface MediaDetails {
  media: Media;
  requestedScope: RatingScope;
  appliedScope: RatingScope;
  scopeNotice?: string | null;
  averageRating: number | null;
  totalRatings: number;
  ratingDistribution: CommunityRatingBucket[];
  recentRatings: CommunityRecentRating[];
  myRating: number | null;
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
  id?: number;
  username: string;
  email: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdateProfileResponse {
  token: string;
  profile: UserProfile;
}

export interface UserProfile {
  id: number;
  username: string;
  email?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  totalItems: number;
  completedItems: number;
  favoriteItems: number;
  friendsCount: number;
  me: boolean;
}

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

export interface UserSearchResult {
  user: UserSummary;
  relationship: 'SELF' | 'NONE' | 'FRIEND' | 'PENDING_OUTGOING' | 'PENDING_INCOMING' | 'BLOCKED';
}

export interface FriendRequest {
  requestId: number;
  user: UserSummary;
  createdAt: string;
}

export interface SendFriendRequestPayload {
  identifier: string;
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

export interface ForgotPasswordRequest {
  email: string;
}

export interface MediaRequest {
  title: string;
  type: MediaType;
  totalUnits: number;
  imageUrl?: string;
  description?: string;
  releaseYear?: number;
  source?: string;
  sourceId?: string;
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
  activityAt?: string;
}

export interface HeatmapDayActivity {
  date: string;
  titleCount: number;
  unitsConsumed: number;
  titles: string[];
  firstWatchTitleCount: number;
  firstWatchUnitsConsumed: number;
  rewatchTitleCount: number;
  rewatchUnitsConsumed: number;
}

export interface DayConsumptionItem {
  userMediaId: number;
  mediaId: number;
  title: string;
  mediaType: MediaType;
  addOnlyActivity: boolean;
  unitsConsumed: number;
  firstWatchUnitsConsumed: number;
  rewatchUnitsConsumed: number;
  hasRewatchActivity: boolean;
  fromUnit: number;
  toUnit: number;
}

export interface DayConsumption {
  date: string;
  totalTitles: number;
  totalUnits: number;
  items: DayConsumptionItem[];
}
