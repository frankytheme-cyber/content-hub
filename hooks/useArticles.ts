'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ArticlesResponse, ArticoloDetailResponse } from '@/types/api'

export function useArticles(stato?: string, page = 1) {
  const params = new URLSearchParams()
  if (stato) params.set('stato', stato)
  params.set('page', String(page))

  return useQuery<ArticlesResponse>({
    queryKey: ['articles', stato, page],
    queryFn: () => fetch(`/api/articles?${params}`).then((r) => r.json()),
    refetchInterval: (query) => {
      // Ricarica ogni 5s se ci sono articoli in lavorazione
      const data = query.state.data
      if (!data) return false
      const haInCorso = data.articoli.some((a) => a.stato === 'BOZZA')
      return haInCorso ? 5000 : false
    },
  })
}

export function useArticolo(id: string) {
  return useQuery<ArticoloDetailResponse>({
    queryKey: ['article', id],
    queryFn: () => fetch(`/api/articles/${id}`).then((r) => r.json()),
    enabled: !!id,
  })
}

export function usePatchArticolo(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { versioneScelta?: string; stato?: string }) =>
      fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article', id] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}

export function useDeleteArticolo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/articles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}
