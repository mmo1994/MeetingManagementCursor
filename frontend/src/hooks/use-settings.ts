'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UserWithSettings, ApiResponse, SettingsFormData } from '@/lib/types';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () =>
      api.get<ApiResponse<UserWithSettings>>('/settings').then((res) => res.data),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SettingsFormData) =>
      api.put<ApiResponse<UserWithSettings>>('/settings', data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useGoogleStatus() {
  return useQuery({
    queryKey: ['google-status'],
    queryFn: () =>
      api
        .get<ApiResponse<{ isConnected: boolean }>>('/google/status')
        .then((res) => res.data),
  });
}

export function useGoogleConnect() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get<ApiResponse<{ url: string }>>('/google/connect-url');
      window.location.href = response.data.url;
    },
  });
}

export function useGoogleDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/google/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-status'] });
    },
  });
}

