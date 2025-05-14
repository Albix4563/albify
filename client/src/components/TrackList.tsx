import { useState } from "react";
import { Play, Pause, Clock, Heart, MoreHorizontal, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer, Video } from "@/hooks/use-player";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface TrackListProps {
  tracks: Video[];
  isLoading?: boolean;
  playlistId?: number;
  showIndex?: boolean;
  showHeader?: boolean;
  onRemoveTrack?: (videoId: string) => void;
}

export default function TrackList({ 
  tracks = [], // Aggiunta un valore predefinito vuoto per tracks
  isLoading = false, 
  playlistId,
  showIndex = true,
  showHeader = true,
  onRemoveTrack
}: TrackListProps) {
  const { toast } = useToast();
  const { currentVideo, isPlaying, playVideo, pauseVideo, resumeVideo, addToQueue, clearQueue } = usePlayer();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // Get all user playlists
  const queryResult = queryClient.getQueryData([QUERY_KEYS.playlists]) as { data: any[] } | undefined;
  const playlists = queryResult?.data || [];

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const res = await apiRequest("POST", "/api/favorites", { video_id: videoId });
      return res.json();
    },
    onSuccess: (_data, videoId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.favorites] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.isFavorite(videoId) });
      toast({
        title: "Aggiunto ai preferiti",
        description: "Il brano è stato aggiunto ai tuoi preferiti",
      });
    },
  });

  // Remove from favorites mutation
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const res = await apiRequest("DELETE", `/api/favorites/${videoId}`, undefined);
      return res;
    },
    onSuccess: (_data, videoId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.favorites] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.isFavorite(videoId) });
      toast({
        title: "Rimosso dai preferiti",
        description: "Il brano è stato rimosso dai tuoi preferiti",
      });
    },
  });

  // Add to playlist mutation
  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ videoId, playlistId }: { videoId: string; playlistId: number }) => {
      const res = await apiRequest("POST", `/api/playlists/${playlistId}/videos`, { 
        video_id: videoId 
      });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.playlistVideos(variables.playlistId.toString()) 
      });
      toast({
        title: "Aggiunto alla playlist",
        description: "Il brano è stato aggiunto alla playlist",
      });
    },
  });

  // Check if track is currently playing
  const isTrackPlaying = (track: Video) => {
    return currentVideo?.id === track.id && isPlaying;
  };

  // Play or pause track
  const togglePlay = (track: Video) => {
    if (currentVideo?.id === track.id) {
      if (isPlaying) {
        pauseVideo();
      } else {
        resumeVideo();
      }
    } else {
      // Se siamo in una playlist, aggiungiamo tutti i brani successivi alla coda
      if (playlistId && tracks.length > 1) {
        // Ordina i brani se necessario (se hanno una posizione definita)
        let orderedTracks = [...tracks];
        if (orderedTracks.some(t => t.position !== undefined)) {
          orderedTracks = orderedTracks.sort((a, b) => {
            if (a.position !== undefined && b.position !== undefined) {
              return a.position - b.position;
            }
            return 0;
          });
        }
        
        // Trova l'indice della traccia selezionata nell'array ordinato
        const trackIndex = orderedTracks.findIndex(t => t.id === track.id);
        if (trackIndex !== -1) {
          // Pulisce la coda e aggiunge tutte le tracce successive
          clearQueue();
          
          // Riproduce la traccia selezionata
          playVideo(track);
          
          // Aggiungi il resto dei brani alla coda di riproduzione
          orderedTracks.slice(trackIndex + 1).forEach(video => {
            addToQueue(video);
          });
        } else {
          // Fallback nel caso in cui non troviamo la traccia nell'array ordinato
          playVideo(track);
        }
      } else {
        // Se non siamo in una playlist, riproduci semplicemente la traccia
        playVideo(track);
      }
    }
  };

  // Add track to queue
  const handleAddToQueue = (track: Video) => {
    addToQueue(track);
    toast({
      title: "Aggiunto alla coda",
      description: `"${track.title}" è stato aggiunto alla tua coda`,
    });
  };

  // Toggle favorite status
  const handleToggleFavorite = async (track: Video, isFavorite: boolean) => {
    if (isFavorite) {
      removeFromFavoritesMutation.mutate(track.id);
    } else {
      addToFavoritesMutation.mutate(track.id);
    }
  };

  // Add to playlist
  const handleAddToPlaylist = (track: Video, playlistId: number) => {
    addToPlaylistMutation.mutate({ videoId: track.id, playlistId });
  };

  // Remove from current playlist
  const handleRemoveFromPlaylist = (track: Video) => {
    if (onRemoveTrack) {
      onRemoveTrack(track.id);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[hsl(var(--albify-card))] rounded-lg overflow-hidden border border-[hsl(220,50%,15%)] shadow-md">
        <table className="w-full text-sm">
          {showHeader && (
            <thead>
              <tr className="border-b border-[hsl(var(--albify-divider))]">
                <th className="py-3 px-4 text-left font-medium text-blue-300">#</th>
                <th className="py-3 px-4 text-left font-medium text-blue-300">Title</th>
                <th className="py-3 px-4 text-left font-medium text-blue-300 hidden md:table-cell">Album</th>
                <th className="py-3 px-4 text-left font-medium text-blue-300 hidden md:table-cell">Date Added</th>
                <th className="py-3 px-4 text-right font-medium text-blue-300"><Clock size={16} /></th>
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[hsl(220,50%,15%)]">
                <td className="py-3 px-4"><Skeleton className="h-5 w-5 bg-[hsl(220,60%,12%)]" /></td>
                <td className="py-3 px-4">
                  <div className="flex items-center">
                    <Skeleton className="w-10 h-10 rounded mr-3 bg-[hsl(220,60%,12%)] shadow-sm" />
                    <div>
                      <Skeleton className="h-4 w-40 bg-[hsl(220,60%,12%)] mb-1" />
                      <Skeleton className="h-3 w-24 bg-[hsl(220,60%,12%)]" />
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <Skeleton className="h-4 w-32 bg-[hsl(220,60%,12%)]" />
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <Skeleton className="h-4 w-24 bg-[hsl(220,60%,12%)]" />
                </td>
                <td className="py-3 px-4 text-right">
                  <Skeleton className="h-4 w-12 bg-[hsl(220,60%,12%)] ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Verifica che tracks sia un array e sia vuoto
  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    return (
      <div className="bg-[hsl(var(--albify-card))] rounded-lg p-8 text-center border border-[hsl(220,50%,15%)] shadow-md">
        <div className="w-20 h-20 rounded-full bg-[hsl(220,60%,12%)] flex items-center justify-center mx-auto mb-4 shadow-inner shadow-blue-500/10">
          <Music className="h-10 w-10 text-blue-400 opacity-70" />
        </div>
        <h3 className="text-xl font-medium text-blue-100 mb-3">Nessun brano trovato</h3>
        <p className="text-blue-300/70 max-w-md mx-auto">
          {playlistId ? "Prova ad aggiungere brani a questa playlist!" : "Nessun brano disponibile al momento."}
        </p>
      </div>
    );
  }

  // Assicuriamoci che tracks sia sempre un array valido
  const validTracks = Array.isArray(tracks) ? tracks : [];
  
  return (
    <div className="bg-[hsl(var(--albify-card))] rounded-lg overflow-hidden border border-[hsl(220,50%,15%)] shadow-md">
      <table className="w-full text-sm">
        {showHeader && (
          <thead>
            <tr className="border-b border-[hsl(var(--albify-divider))]">
              <th className="py-3 px-4 text-left font-medium text-blue-300">#</th>
              <th className="py-3 px-4 text-left font-medium text-blue-300">Titolo</th>
              <th className="py-3 px-4 text-left font-medium text-blue-300 hidden md:table-cell">Album</th>
              <th className="py-3 px-4 text-left font-medium text-blue-300 hidden md:table-cell">Data aggiunta</th>
              <th className="py-3 px-4 text-right font-medium text-blue-300"><Clock size={16} /></th>
            </tr>
          </thead>
        )}
        <tbody>
          {validTracks.map((track, index) => {
            // Determine if this track is the current playing track
            const isCurrentTrack = currentVideo?.id === track?.id;
            const isPaused = isCurrentTrack && !isPlaying;
            
            return (
              <tr 
                key={track.id + index} 
                className={cn(
                  "hover:bg-[hsl(220,60%,12%)] cursor-pointer group border-l-4 border-l-transparent transition-all duration-200",
                  isCurrentTrack && "bg-[hsl(220,60%,15%)] border-l-[hsl(var(--albify-primary))]"
                )}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <td className="py-3 px-4 text-center w-12">
                  {hoveredIndex === index ? (
                    <button 
                      onClick={() => togglePlay(track)}
                      className="text-white bg-[hsl(var(--albify-primary))] rounded-full w-6 h-6 flex items-center justify-center shadow-sm shadow-blue-500/30"
                    >
                      {isTrackPlaying(track) ? (
                        <Pause size={12} />
                      ) : (
                        <Play size={12} className="ml-0.5" />
                      )}
                    </button>
                  ) : (
                    <span className={cn(
                      "font-medium",
                      isCurrentTrack ? "text-[hsl(var(--albify-primary))]" : "text-blue-400"
                    )}>
                      {showIndex ? index + 1 : (track.position !== undefined ? track.position + 1 : index + 1)}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center" onClick={() => togglePlay(track)}>
                    <div className="relative w-10 h-10 mr-3">
                      <img 
                        src={track.thumbnail} 
                        alt={track.title} 
                        className="w-10 h-10 rounded object-cover border border-[hsl(220,50%,15%)] shadow-sm shadow-blue-500/20" 
                      />
                      {isCurrentTrack && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[hsl(var(--albify-primary))] rounded-full flex items-center justify-center shadow-sm">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className={cn(
                        "font-medium",
                        isCurrentTrack ? "text-[hsl(var(--albify-primary))]" : "text-blue-50"
                      )}>
                        {track.title}
                      </p>
                      <p className="text-sm text-blue-300/70">
                        {track.channel_title}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-blue-300/70 hidden md:table-cell">
                  {track.channel_title}
                </td>
                <td className="py-3 px-4 text-blue-300/70 hidden md:table-cell">
                  Aggiunto di recente
                </td>
                <td className="py-3 px-4 text-blue-300/70 text-right">
                  <div className="flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="mr-3 text-blue-400 hover:text-blue-200 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[hsl(220,70%,8%)] border border-[hsl(220,50%,15%)] shadow-md shadow-blue-500/10 text-blue-50">
                        <DropdownMenuItem onClick={() => togglePlay(track)} className="cursor-pointer">
                          {isTrackPlaying(track) ? "Pausa" : "Riproduci"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddToQueue(track)} className="cursor-pointer">
                          Aggiungi alla coda
                        </DropdownMenuItem>
                        
                        {/* Playlists section */}
                        {playlists && playlists.length > 0 && (
                          <>
                            <DropdownMenuItem className="text-gray-400 cursor-default" disabled>
                              Aggiungi alla playlist
                            </DropdownMenuItem>
                            {playlists.map((playlist: { id: number; name: string }) => (
                              <DropdownMenuItem 
                                key={playlist.id}
                                onClick={() => handleAddToPlaylist(track, playlist.id)}
                                className="pl-6 cursor-pointer"
                              >
                                {playlist.name}
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                        
                        {/* Remove from playlist option - disabilitato per la playlist "Top Hits" (ID 14) */}
                        {playlistId && playlistId !== 14 && onRemoveTrack && (
                          <DropdownMenuItem 
                            onClick={() => handleRemoveFromPlaylist(track)}
                            className="cursor-pointer text-red-500 hover:text-red-400"
                          >
                            Rimuovi dalla playlist
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {track.duration}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
