import { useState } from "react";
import { Play, Plus, MoreHorizontal, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer, Video } from "@/hooks/use-player";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import AddToPlaylistModal from "./AddToPlaylistModal";

interface MusicCardProps {
  video: Video;
  showArtist?: boolean;
  className?: string;
}

export default function MusicCard({ video, showArtist = true, className }: MusicCardProps) {
  const { playVideo, addToQueue } = usePlayer();
  const [isHovering, setIsHovering] = useState(false);
  const { toast } = useToast();
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  
  // Get all user playlists
  const { data: playlists } = useQuery({
    queryKey: [QUERY_KEYS.playlists],
    queryFn: async () => {
      const response = await fetch(QUERY_KEYS.playlists, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch playlists");
      }
      return response.json();
    },
  });

  // Check if video is favorited
  const { data: favoriteData } = useQuery({
    queryKey: QUERY_KEYS.isFavorite(video.id),
    queryFn: async ({ queryKey }) => {
      const url = queryKey[0] as string;
      const res = await fetch(url, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to check favorite status');
      }
      return res.json();
    },
  });

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/favorites", { video_id: video.id });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.favorites] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.isFavorite(video.id) });
      toast({
        title: "Aggiunto ai preferiti",
        description: `"${video.title}" è stato aggiunto ai tuoi preferiti`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Impossibile aggiungere ai preferiti",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    },
  });

  // Remove from favorites mutation
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/favorites/${video.id}`, undefined);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.favorites] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.isFavorite(video.id) });
      toast({
        title: "Rimosso dai preferiti",
        description: `"${video.title}" è stato rimosso dai tuoi preferiti`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Impossibile rimuovere dai preferiti",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    },
  });

  // Add to playlist mutation
  const addToPlaylistMutation = useMutation({
    mutationFn: async (playlistId: number) => {
      const res = await apiRequest("POST", `/api/playlists/${playlistId}/videos`, { 
        video_id: video.id 
      });
      return res.json();
    },
    onSuccess: (_data, playlistId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlistVideos(playlistId.toString()) });
      toast({
        title: "Aggiunto alla playlist",
        description: `"${video.title}" è stato aggiunto alla playlist`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Impossibile aggiungere alla playlist",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    },
  });

  const handlePlayVideo = () => {
    playVideo(video);
  };

  const handleAddToQueue = () => {
    addToQueue(video);
    toast({
      title: "Aggiunto alla coda",
      description: `"${video.title}" è stato aggiunto alla coda di riproduzione`,
    });
  };

  const handleToggleFavorite = () => {
    if (favoriteData?.isFavorite) {
      removeFromFavoritesMutation.mutate();
    } else {
      addToFavoritesMutation.mutate();
    }
  };

  const handleAddToPlaylist = (playlistId: number) => {
    addToPlaylistMutation.mutate(playlistId);
  };
  
  // Apre la modale per aggiungere il brano a una playlist
  const openAddToPlaylistModal = () => {
    setShowAddToPlaylistModal(true);
  };

  return (
    <>
      {/* Modale per aggiungere a playlist */}
      <AddToPlaylistModal 
        show={showAddToPlaylistModal}
        onClose={() => setShowAddToPlaylistModal(false)}
        video={video}
      />
      
      <div 
        className={cn(
          "music-card bg-[hsl(var(--albify-card))] p-4 rounded-lg cursor-pointer relative overflow-hidden border border-[hsl(220,50%,15%)] hover:border-[hsl(210,100%,50%/0.5)]", 
          className
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="relative group">
          <img 
            src={video.thumbnail} 
            alt={video.title} 
            className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg" 
          />
          
          {isHovering && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity group-hover:opacity-100 rounded-md">
              <button 
                onClick={handlePlayVideo}
                className="bg-[hsl(var(--albify-primary))] text-white rounded-full w-12 h-12 flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-blue-500/50"
              >
                <Play size={20} className="ml-1" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-2">
            <h3 className="font-semibold text-white text-sm line-clamp-1">
              {video.title}
            </h3>
            {showArtist && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                {video.channel_title}
              </p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-gray-400 hover:text-white p-1">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[hsl(var(--albify-card))] border-[hsl(var(--albify-divider))] text-white">
              <DropdownMenuItem onClick={handlePlayVideo} className="cursor-pointer">
                Riproduci
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddToQueue} className="cursor-pointer">
                Aggiungi alla coda
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleFavorite} className="cursor-pointer">
                {favoriteData?.isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={openAddToPlaylistModal} className="cursor-pointer">
                Aggiungi a playlist...
              </DropdownMenuItem>
              
              {/* Opzioni per aggiunta rapida alle playlist esistenti */}
              {playlists && playlists.length > 0 && (
                <>
                  <DropdownMenuItem className="text-gray-400 cursor-default" disabled>
                    Aggiungi velocemente a:
                  </DropdownMenuItem>
                  {playlists.slice(0, 3).map((playlist: { id: number; name: string }) => (
                    <DropdownMenuItem 
                      key={playlist.id}
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      className="pl-6 cursor-pointer"
                    >
                      {playlist.name}
                    </DropdownMenuItem>
                  ))}
                  {playlists.length > 3 && (
                    <DropdownMenuItem 
                      onClick={openAddToPlaylistModal}
                      className="pl-6 cursor-pointer text-blue-400"
                    >
                      Vedi tutte le playlist...
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
