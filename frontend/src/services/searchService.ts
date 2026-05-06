import axios from 'axios';
import { Media, MediaType } from '../types';

export interface SearchResult {
  externalId: string;
  source: string;
  title: string;
  type: MediaType;
  totalUnits: number;
  imageUrl?: string;
  description?: string;
  releaseYear?: number;
}

export interface TVSeason {
  seasonNumber: number;
  episodeCount: number;
  name: string;
  airYear?: number;
  posterUrl?: string;
}

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY || '';

const normalizeText = (value: string) => value.trim().toLowerCase();

const buildIdentityKey = (item: Pick<SearchResult, 'source' | 'externalId' | 'title' | 'type' | 'releaseYear'>) => {
  const source = (item.source || '').trim().toUpperCase();
  const externalId = (item.externalId || '').trim();
  if (source && externalId) {
    return `src:${source}:${externalId}`;
  }

  const normalizedTitle = normalizeText(item.title || '');
  const year = item.releaseYear ?? '';
  return `title:${item.type}:${normalizedTitle}:${year}`;
};

export const searchMedia = async (query: string, type: MediaType): Promise<SearchResult[]> => {
  if (!query.trim()) return [];

  switch (type) {
    case MediaType.ANIME:
      return searchAnime(query);
    case MediaType.MOVIE:
      return searchMovies(query);
    case MediaType.TV_SERIES:
      return searchTVSeries(query);
    case MediaType.BOOK:
      return searchBooks(query);
    case MediaType.GAME:
      return searchGames(query);
    default:
      return [];
  }
};

// Jikan API (MyAnimeList) - no key required
const searchAnime = async (query: string): Promise<SearchResult[]> => {
  const res = await axios.get(`https://api.jikan.moe/v4/anime`, {
    params: { q: query, limit: 10, sfw: true },
  });
  return res.data.data.map((item: any) => ({
    externalId: String(item.mal_id),
    source: 'JIKAN',
    title: item.title_english || item.title,
    type: MediaType.ANIME,
    totalUnits: item.episodes || 1,
    imageUrl: item.images?.jpg?.large_image_url,
    description: item.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim(),
    releaseYear: item.aired?.prop?.from?.year,
  }));
};

// TMDB - requires VITE_TMDB_API_KEY
const searchMovies = async (query: string): Promise<SearchResult[]> => {
  if (!TMDB_API_KEY) return [];
  const res = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
    params: { api_key: TMDB_API_KEY, query, page: 1 },
  });
  return res.data.results.slice(0, 10).map((item: any) => ({
    externalId: String(item.id),
    source: 'TMDB_MOVIE',
    title: item.title,
    type: MediaType.MOVIE,
    totalUnits: 1,
    imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
    description: item.overview,
    releaseYear: item.release_date ? parseInt(item.release_date.split('-')[0]) : undefined,
  }));
};

const searchTVSeries = async (query: string): Promise<SearchResult[]> => {
  if (!TMDB_API_KEY) return [];
  const res = await axios.get(`https://api.themoviedb.org/3/search/tv`, {
    params: { api_key: TMDB_API_KEY, query, page: 1 },
  });
  return res.data.results.slice(0, 10).map((item: any) => ({
    externalId: String(item.id),
    source: 'TMDB_TV',
    title: item.name,
    type: MediaType.TV_SERIES,
    totalUnits: item.number_of_episodes || item.episode_run_time?.[0] || 1,
    imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
    description: item.overview,
    releaseYear: item.first_air_date ? parseInt(item.first_air_date.split('-')[0]) : undefined,
  }));
};

// Open Library - no key required
const searchBooks = async (query: string): Promise<SearchResult[]> => {
  const res = await axios.get(`https://openlibrary.org/search.json`, {
    params: { q: query, limit: 10, fields: 'key,title,author_name,cover_i,first_publish_year,number_of_pages_median,first_sentence' },
  });
  return res.data.docs.map((item: any) => ({
    externalId: item.key,
    source: 'OPEN_LIBRARY',
    title: item.title,
    type: MediaType.BOOK,
    totalUnits: item.number_of_pages_median || 1,
    imageUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : undefined,
    description: item.author_name ? `By ${item.author_name.slice(0, 2).join(', ')}` : undefined,
    releaseYear: item.first_publish_year,
  }));
};

// RAWG API - requires VITE_RAWG_API_KEY
const searchGames = async (query: string): Promise<SearchResult[]> => {
  if (!RAWG_API_KEY) return [];
  const res = await axios.get(`https://api.rawg.io/api/games`, {
    params: { key: RAWG_API_KEY, search: query, page_size: 10 },
  });
  return res.data.results.map((item: any) => ({
    externalId: String(item.id),
    source: 'RAWG',
    title: item.name,
    type: MediaType.GAME,
    totalUnits: item.playtime || 10, // hours of playtime
    imageUrl: item.background_image,
    description: item.genres?.map((g: any) => g.name).join(', '),
    releaseYear: item.released ? parseInt(item.released.split('-')[0]) : undefined,
  }));
};

export const getTVSeasons = async (tmdbId: string): Promise<TVSeason[]> => {
  if (!TMDB_API_KEY) return [];
  const res = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
    params: { api_key: TMDB_API_KEY },
  });
  return (res.data.seasons as any[])
    .filter((s) => s.season_number > 0 && s.episode_count > 0)
    .map((s) => ({
      seasonNumber: s.season_number,
      episodeCount: s.episode_count,
      name: s.name,
      airYear: s.air_date ? parseInt(s.air_date.split('-')[0]) : undefined,
      posterUrl: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : undefined,
    }));
};

const getSimilarMovies = async (tmdbId: string, limit: number): Promise<SearchResult[]> => {
  if (!TMDB_API_KEY) return [];
  const res = await axios.get('https://api.themoviedb.org/3/movie/' + tmdbId + '/recommendations', {
    params: { api_key: TMDB_API_KEY, page: 1 },
  });

  return (res.data.results || []).slice(0, limit).map((item: any) => ({
    externalId: String(item.id),
    source: 'TMDB_MOVIE',
    title: item.title,
    type: MediaType.MOVIE,
    totalUnits: 1,
    imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
    description: item.overview || undefined,
    releaseYear: item.release_date ? parseInt(String(item.release_date).split('-')[0]) : undefined,
  }));
};

const getSimilarTvSeries = async (tmdbId: string, limit: number): Promise<SearchResult[]> => {
  if (!TMDB_API_KEY) return [];
  const res = await axios.get('https://api.themoviedb.org/3/tv/' + tmdbId + '/recommendations', {
    params: { api_key: TMDB_API_KEY, page: 1 },
  });

  return (res.data.results || []).slice(0, limit).map((item: any) => ({
    externalId: String(item.id),
    source: 'TMDB_TV',
    title: item.name,
    type: MediaType.TV_SERIES,
    totalUnits: 1,
    imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
    description: item.overview || undefined,
    releaseYear: item.first_air_date ? parseInt(String(item.first_air_date).split('-')[0]) : undefined,
  }));
};

const getSimilarAnime = async (animeId: string, limit: number): Promise<SearchResult[]> => {
  const res = await axios.get('https://api.jikan.moe/v4/anime/' + animeId + '/recommendations');

  return (res.data.data || []).slice(0, limit).map((item: any) => {
    const entry = item.entry || {};
    return {
      externalId: String(entry.mal_id || ''),
      source: 'JIKAN',
      title: entry.title || 'Unknown title',
      type: MediaType.ANIME,
      totalUnits: 1,
      imageUrl: entry.images?.jpg?.large_image_url || entry.images?.jpg?.image_url || undefined,
      description: item.content || undefined,
      releaseYear: undefined,
    };
  });
};

const getSimilarGames = async (gameId: string, limit: number): Promise<SearchResult[]> => {
  if (!RAWG_API_KEY) return [];
  const res = await axios.get('https://api.rawg.io/api/games/' + gameId + '/suggested', {
    params: { key: RAWG_API_KEY, page_size: limit },
  });

  return (res.data.results || []).slice(0, limit).map((item: any) => ({
    externalId: String(item.id),
    source: 'RAWG',
    title: item.name,
    type: MediaType.GAME,
    totalUnits: item.playtime || 10,
    imageUrl: item.background_image || undefined,
    description: item.genres?.map((g: any) => g.name).join(', ') || undefined,
    releaseYear: item.released ? parseInt(String(item.released).split('-')[0]) : undefined,
  }));
};

const dedupeSearchResults = (items: SearchResult[]): SearchResult[] => {
  const unique = new Map<string, SearchResult>();
  for (const item of items) {
    const key = buildIdentityKey(item);
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }
  return Array.from(unique.values());
};

export const getSimilarContent = async (media: Media, limit = 8): Promise<SearchResult[]> => {
  const safeLimit = Math.max(1, Math.min(limit, 20));
  const source = (media.source || '').trim().toUpperCase();
  const sourceId = (media.sourceId || '').trim();

  let results: SearchResult[] = [];

  if (source && sourceId) {
    try {
      if (source === 'TMDB_MOVIE') {
        results = await getSimilarMovies(sourceId, safeLimit);
      } else if (source === 'TMDB_TV') {
        results = await getSimilarTvSeries(sourceId, safeLimit);
      } else if (source === 'JIKAN') {
        results = await getSimilarAnime(sourceId, safeLimit);
      } else if (source === 'RAWG') {
        results = await getSimilarGames(sourceId, safeLimit);
      }
    } catch {
      results = [];
    }
  }

  if (results.length === 0) {
    results = await searchMedia(media.title, media.type);
  }

  const currentIdentity = buildIdentityKey({
    source: media.source || '',
    externalId: media.sourceId || '',
    title: media.title,
    type: media.type,
    releaseYear: media.releaseYear,
  });

  return dedupeSearchResults(results)
    .filter((item) => buildIdentityKey(item) !== currentIdentity)
    .slice(0, safeLimit);
};
