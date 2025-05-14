import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, PlayCircle, Shuffle, Music } from "lucide-react";
import { QUERY_KEYS } from "@/lib/constants";
import TrackList from "@/components/TrackList";
import { usePlayer, Video } from "@/hooks/use-player";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Favorites() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { playVideo } = usePlayer();
  const [view, setView] = useState<"grid" | "list">("list");
  
  // Get favorites
  const { data: favorites = [], isLoading, isError } = useQuery<Video[]>({
    queryKey: [QUERY_KEYS.favorites],
    queryFn: async () => {
      const response = await fetch(QUERY_KEYS.favorites);
      if (!response.ok) {
        throw new Error("Failed to fetch favorites");
      }
      return response.json();
    },
    enabled: !!user,
  });

  // Play all favorites
  const playAll = () => {
    if (favorites && favorites.length > 0) {
      playVideo(favorites[0]);
      
      toast({
        title: "Riproduzione preferiti",
        description: "I tuoi brani preferiti sono ora in riproduzione",
      });
    }
  };
  
  // Shuffle and play
  const shufflePlay = () => {
    if (favorites && favorites.length > 0) {
      // Get a random track
      const randomIndex = Math.floor(Math.random() * favorites.length);
      playVideo(favorites[randomIndex]);
      
      toast({
        title: "Riproduzione casuale",
        description: "Riproduzione casuale dei tuoi brani preferiti",
      });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-8">
        <div className="w-40 h-40 bg-gradient-to-br from-[hsl(var(--albify-primary))] to-[hsl(var(--albify-accent))] flex items-center justify-center rounded-lg shadow-lg">
          <Heart className="text-white h-20 w-20" />
        </div>
        
        <div className="flex-1">
          <h6 className="text-sm uppercase font-bold text-white mb-2">Playlist</h6>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">Brani Preferiti</h1>
          
          <div className="flex items-center text-sm text-gray-400">
            <span className="font-medium">{user?.username}</span>
            <span className="mx-1">•</span>
            <span>{favorites?.length || 0} brani</span>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          onClick={playAll}
          className="bg-[hsl(var(--albify-accent))] hover:bg-[hsl(var(--albify-accent))] hover:bg-opacity-80 rounded-full h-12 px-6"
          disabled={isLoading || !favorites || favorites.length === 0}
        >
          <PlayCircle className="mr-2 h-5 w-5" />
          Riproduci
        </Button>
        
        <Button 
          onClick={shufflePlay}
          variant="outline"
          className="border-gray-600 text-white hover:text-white hover:bg-gray-800"
          disabled={isLoading || !favorites || favorites.length === 0}
        >
          <Shuffle className="mr-2 h-4 w-4" />
          Casuale
        </Button>
      </div>
      
      {/* Favorites List */}
      {isLoading ? (
        <TrackList tracks={[]} isLoading={true} />
      ) : !favorites || favorites.length === 0 ? (
        <div className="bg-[hsl(var(--albify-card))] rounded-lg p-8 text-center">
          <Music className="mx-auto h-12 w-12 text-gray-500 mb-3" />
          <h3 className="text-xl font-medium text-white mb-2">I brani che ti piacciono appariranno qui</h3>
          <p className="text-gray-400 mb-6">Salva i brani toccando l'icona del cuore.</p>
          <Button 
            onClick={() => window.location.href = "/search"}
            className="bg-white text-black hover:bg-gray-200 rounded-full"
          >
            Trova brani
          </Button>
        </div>
      ) : (
        <TrackList 
          tracks={Array.isArray(favorites) ? favorites : []} 
          showHeader={true}
        />
      )}
    </div>
  );
}
