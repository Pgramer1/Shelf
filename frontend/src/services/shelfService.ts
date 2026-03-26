import api from './api';
import { DayConsumption, HeatmapDayActivity, UserMedia, UserMediaRequest, Status } from '../types';

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
  }
};
