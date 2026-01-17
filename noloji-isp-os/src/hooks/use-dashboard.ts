"use client";

import { useQuery } from '@tanstack/react-query';
import { nolojiApi } from '@/lib/api';

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: nolojiApi.dashboard.getKPIs,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // 1 minute
  });
}

export function useRecentAlerts(limit: number = 5) {
  return useQuery({
    queryKey: ['alerts', 'recent', limit],
    queryFn: () => nolojiApi.alerts.getAlerts(1, limit),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // 30 seconds
  });
}