'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CalendarEvent, ApiResponse } from '@/lib/types';

export function useCalendarEvents(start: Date, end: Date) {
  return useQuery({
    queryKey: ['calendar', start.toISOString(), end.toISOString()],
    queryFn: () =>
      api
        .get<ApiResponse<CalendarEvent[]>>('/calendar', {
          start: start.toISOString(),
          end: end.toISOString(),
        })
        .then((res) => res.data),
  });
}

