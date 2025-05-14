import { useQuery } from '@tanstack/react-query';
import { Video } from '@/hooks/use-player';
import { QUERY_KEYS } from '@/lib/constants';

import { useAuth } from '@/hooks/use-auth';

// YouTube search hook for generic search
export function useYoutubeSearch(query: string) {
  const { isAuthenticated } = useAuth();

  return useQuery<Video[]>({
    queryKey: QUERY_KEYS.search(query),
    queryFn: async ({ queryKey }) => {
      if (!query || query.trim().length === 0) {
        return [];
      }
      
      // The queryKey is an array where the first element is the URL
      const url = queryKey[0] as string;
      const response = await fetch(url);
      
      if (!response.ok) {
        // Check for specific quota limit error
        if (response.status === 429) {
          const errorData = await response.json();
          if (errorData.error === "QUOTA_EXCEEDED") {
            throw new Error("quota_exceeded");
          }
        }
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    // Non effettuare la query se l'utente non è autenticato
    enabled: isAuthenticated && query.trim().length > 0,
    retry: (failureCount, error) => {
      // Don't retry for quota errors
      if (error instanceof Error && error.message === "quota_exceeded") {
        return false;
      }
      // For other errors, retry up to 2 times
      return failureCount < 2;
    }
  });
}

// Hook to fetch trending music videos
export function useTrendingVideos() {
  return useQuery<Video[]>({
    queryKey: [QUERY_KEYS.trending],
    queryFn: async () => {
      const response = await fetch(QUERY_KEYS.trending);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trending videos: ${response.statusText}`);
      }
      
      return response.json();
    },
  });
}

// Hook to fetch a specific video's details
export function useVideoDetails(videoId: string) {
  return useQuery<Video>({
    queryKey: QUERY_KEYS.video(videoId),
    queryFn: async ({ queryKey }) => {
      // The queryKey is an array where the first element is the URL
      const url = queryKey[0] as string;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video details: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!videoId,
  });
}
