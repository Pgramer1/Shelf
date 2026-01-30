import api from './api';
import { Media, MediaRequest, MediaType } from '../types';

export const mediaService = {
  async createMedia(data: MediaRequest): Promise<Media> {
    const response = await api.post<Media>('/media', data);
    return response.data;
  },

  async getAllMedia(): Promise<Media[]> {
    const response = await api.get<Media[]>('/media');
    return response.data;
  },

  async getMediaById(id: number): Promise<Media> {
    const response = await api.get<Media>(`/media/${id}`);
    return response.data;
  },

  async getMediaByType(type: MediaType): Promise<Media[]> {
    const response = await api.get<Media[]>(`/media/type/${type}`);
    return response.data;
  },

  async searchMedia(query: string): Promise<Media[]> {
    const response = await api.get<Media[]>(`/media/search?query=${query}`);
    return response.data;
  }
};
