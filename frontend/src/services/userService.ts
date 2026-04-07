import api from './api';
import {
  FriendRequest,
  SendFriendRequestPayload,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UserProfile,
  UserSearchResult,
  UserSummary,
} from '../types';

export const userService = {
  async getMyProfile(): Promise<UserProfile> {
    const response = await api.get<UserProfile>('/users/profile/me');
    return response.data;
  },

  async getProfileByUsername(username: string): Promise<UserProfile> {
    const response = await api.get<UserProfile>(`/users/profile/${encodeURIComponent(username)}`);
    return response.data;
  },

  async updateMyProfile(data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    const response = await api.put<UpdateProfileResponse>('/users/profile/me', data);
    return response.data;
  },

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    const response = await api.get<UserSearchResult[]>(`/users/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },

  async sendFriendRequest(identifier: string): Promise<void> {
    const payload: SendFriendRequestPayload = { identifier };
    await api.post('/users/friends/requests', payload);
  },

  async getFriends(): Promise<UserSummary[]> {
    const response = await api.get<UserSummary[]>('/users/friends');
    return response.data;
  },

  async getIncomingRequests(): Promise<FriendRequest[]> {
    const response = await api.get<FriendRequest[]>('/users/friends/requests/incoming');
    return response.data;
  },

  async getOutgoingRequests(): Promise<FriendRequest[]> {
    const response = await api.get<FriendRequest[]>('/users/friends/requests/outgoing');
    return response.data;
  },

  async acceptFriendRequest(requestId: number): Promise<void> {
    await api.post(`/users/friends/requests/${requestId}/accept`);
  },

  async rejectOrCancelRequest(requestId: number): Promise<void> {
    await api.delete(`/users/friends/requests/${requestId}`);
  },

  async removeFriend(friendUserId: number): Promise<void> {
    await api.delete(`/users/friends/${friendUserId}`);
  },
};
