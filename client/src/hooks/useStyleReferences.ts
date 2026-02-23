/**
 * useStyleReferences — Fetch and manage style references for the current user
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface StyleReference {
  id: string;
  userId: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  name: string;
  category: 'character' | 'style' | 'scene';
  tags: string[] | null;
  styleDescription: string | null;
  extractedElements: Record<string, unknown> | null;
  confidence: number;
  imageFingerprint: string;
  analyzedAt: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/csrf-token', { credentials: 'include' });
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}

export function useStyleReferences() {
  return useQuery<StyleReference[]>({
    queryKey: ['style-references'],
    queryFn: async () => {
      const res = await fetch('/api/style-references', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch style references');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useUploadStyleReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      name,
      category,
      tags,
    }: {
      file: File;
      name: string;
      category: string;
      tags?: string[];
    }) => {
      const csrfToken = await fetchCsrfToken();
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', name);
      formData.append('category', category);
      if (tags) formData.append('tags', JSON.stringify(tags));

      const res = await fetch('/api/style-references', {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken },
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to upload style reference');
      return res.json() as Promise<StyleReference>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-references'] });
    },
  });
}

export function useDeleteStyleReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const csrfToken = await fetchCsrfToken();
      const res = await fetch(`/api/style-references/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken },
      });
      if (!res.ok) throw new Error('Failed to delete style reference');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-references'] });
    },
  });
}
