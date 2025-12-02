'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Meeting, ApiResponse, MeetingFormData } from '@/lib/types';

export function useMeetings(options?: { upcoming?: boolean; past?: boolean }) {
  const params: Record<string, string> = {};
  if (options?.upcoming) params.upcoming = 'true';
  if (options?.past) params.past = 'true';

  return useQuery({
    queryKey: ['meetings', options],
    queryFn: () =>
      api.get<ApiResponse<Meeting[]>>('/meetings', params).then((res) => res.data),
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: ['meeting', id],
    queryFn: () =>
      api.get<ApiResponse<Meeting>>(`/meetings/${id}`).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MeetingFormData) =>
      api.post<ApiResponse<Meeting>>('/meetings', data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MeetingFormData> }) =>
      api.put<ApiResponse<Meeting>>(`/meetings/${id}`, data).then((res) => res.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
    },
  });
}

export function useUpdateMeetingTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      startTime,
      endTime,
    }: {
      id: string;
      startTime: string;
      endTime: string;
    }) =>
      api
        .put<ApiResponse<Meeting>>(`/meetings/${id}/time`, { startTime, endTime })
        .then((res) => res.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useCancelMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiResponse<Meeting>>(`/meetings/${id}/cancel`).then((res) => res.data),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useRespondToMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.post(`/meetings/${id}/respond`, { status }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
    },
  });
}

