import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS, MUSIC_CATEGORIES, CATEGORY_IMAGES } from "@/lib/constants";
import MusicCard from "@/components/MusicCard";
import TrackList from "@/components/TrackList";
import SearchBar from "@/components/SearchBar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("trending");
  
  // Get trending videos
  const { data: trendingVideos, isLoading: trendingLoading } = useQuery({
    queryKey: [QUERY_KEYS.trending],
    queryFn: async () => {
      const response = await fetch(QUERY_KEYS.trending);
      if (!response.ok) {
        throw new Error("Failed to fetch trending videos");
      }
      return response.json();
    },
  });

  // Get recent plays
  const { data: recentPlays, isLoading: recentLoading } = useQuery({
    queryKey: [QUERY_KEYS.recentPlays],
    queryFn: async () => {
      const response = await fetch(QUERY_KEYS.recentPlays);
      if (!response.ok) {
        throw new Error("Failed to fetch recent plays");
      }
      return response.json();
    },
    enabled: !!user,
  });

  return (
    <>
      {/* Top Bar with navigation and search */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex space-x-4">
          <button className="bg-black rounded-full w-8 h-8 flex items-center justify-center">
            <ChevronLeft className="text-white h-4 w-4" />
          </button>
          <button className="bg-black rounded-full w-8 h-8 flex items-center justify-center">
            <ChevronRight className="text-white h-4 w-4" />
          </button>
        </div>
        
        <div className="hidden md:block md:w-2/5">
          <SearchBar />
        </div>
        
        <div className="flex items-center space-x-2 invisible md:visible">
          {/* User profile is handled in Sidebar component */}
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden mb-8">
        <SearchBar placeholder="Cerca musica" />
      </div>

      {/* Featured Playlists Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Playlist in evidenza</h2>
          <a href="#" className="text-sm text-gray-400 hover:text-white font-medium">Vedi tutto</a>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {trendingLoading ? (
            // Skeleton loading state
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-[hsl(var(--albify-card))] p-4 rounded-lg">
                <Skeleton className="w-full h-48 rounded-md mb-4 bg-gray-800" />
                <Skeleton className="h-5 w-3/4 bg-gray-800 mb-2" />
                <Skeleton className="h-4 w-1/2 bg-gray-800" />
              </div>
            ))
          ) : (
            // Trending Videos as Featured Playlists
            trendingVideos?.slice(0, 5).map((video: any, index: number) => (
              <MusicCard 
                key={video.id + index} 
                video={video} 
              />
            ))
          )}
        </div>
      </section>
      
      {/* Recently Played Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Ascoltati di recente</h2>
          <a href="#" className="text-sm text-gray-400 hover:text-white font-medium">Vedi tutto</a>
        </div>
        
        <TrackList 
          tracks={recentPlays || []}
          isLoading={recentLoading}
        />
      </section>
    </>
  );
}
