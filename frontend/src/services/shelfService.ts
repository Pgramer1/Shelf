import api from './api';
import { UserMedia, UserMediaRequest, Status } from '../types';

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
  }
};
