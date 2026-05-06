import api from './api';
import axios from 'axios';
import { DayConsumption, HeatmapDayActivity, UserMedia, UserMediaRequest, Status } from '../types';

const CACHE_PREFIX = 'shelf:pwa:cache:';

interface CacheEnvelope<T> {
  data: T;
  cachedAt: string;
}

export interface CachedReadResult<T> {
  data: T;
  source: 'network' | 'cache';
  cachedAt?: string;
}

const getCacheKey = (key: string) => `${CACHE_PREFIX}${key}`;

const readCache = <T>(key: string): CacheEnvelope<T> | null => {
  try {
    const raw = localStorage.getItem(getCacheKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.cachedAt !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const writeCache = <T>(key: string, data: T): string => {
  const cachedAt = new Date().toISOString();
  const payload: CacheEnvelope<T> = { data, cachedAt };
  localStorage.setItem(getCacheKey(key), JSON.stringify(payload));
  return cachedAt;
};

const shouldFallbackToCache = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  // Use cached reads for offline, timeout, or server-side failures.
  if (!error.response) {
    return true;
  }

  return error.response.status >= 500;
};

const readWithFallback = async <T>(cacheKey: string, request: () => Promise<T>): Promise<CachedReadResult<T>> => {
  try {
    const data = await request();
    const cachedAt = writeCache(cacheKey, data);
    return { data, source: 'network', cachedAt };
  } catch (error) {
    if (shouldFallbackToCache(error)) {
      const cached = readCache<T>(cacheKey);
      if (cached) {
        return { data: cached.data, source: 'cache', cachedAt: cached.cachedAt };
      }
    }

    throw error;
  }
};

export const shelfService = {
  async addToShelf(data: UserMediaRequest): Promise<UserMedia> {
    const response = await api.post<UserMedia>('/shelf', data);
    return response.data;
  },

  async updateMedia(id: number, data: UserMediaRequest): Promise<UserMedia> {
    const response = await api.put<UserMedia>(`/shelf/${id}`, data);
    return response.data;
  },

  async getUserShelf(): Promise<UserMedia[]> {
    const response = await api.get<UserMedia[]>('/shelf');
    return response.data;
  },

  async getUserShelfByStatus(status: Status): Promise<UserMedia[]> {
    const response = await api.get<UserMedia[]>(`/shelf/status/${status}`);
    return response.data;
  },

  async deleteFromShelf(id: number): Promise<void> {
    await api.delete(`/shelf/${id}`);
  },

  async getConsumptionHeatmap(days = 371): Promise<HeatmapDayActivity[]> {
    const response = await api.get<HeatmapDayActivity[]>(`/shelf/activity/heatmap?days=${days}`);
    return response.data;
  },

  async getConsumptionByDate(date: string): Promise<DayConsumption> {
    const response = await api.get<DayConsumption>(`/shelf/activity/${date}`);
    return response.data;
  },

  async getUserShelfCached(): Promise<CachedReadResult<UserMedia[]>> {
    return readWithFallback('user-shelf', async () => {
      const response = await api.get<UserMedia[]>('/shelf');
      return response.data;
    });
  },

  async getConsumptionHeatmapCached(days = 371): Promise<CachedReadResult<HeatmapDayActivity[]>> {
    return readWithFallback(`heatmap-v2-${days}`, async () => {
      const response = await api.get<HeatmapDayActivity[]>(`/shelf/activity/heatmap?days=${days}`);
      return response.data;
    });
  },

  async getConsumptionByDateCached(date: string): Promise<CachedReadResult<DayConsumption>> {
    return readWithFallback(`day-v2-${date}`, async () => {
      const response = await api.get<DayConsumption>(`/shelf/activity/${date}`);
      return response.data;
    });
  }
};
