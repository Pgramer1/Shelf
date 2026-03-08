import axios from 'axios';
import { MediaType } from '../types';

export interface SearchResult {
  externalId: string;
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
