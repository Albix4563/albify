import { useRef, useState, MouseEvent } from "react";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Shuffle,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  ListMusic
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/hooks/use-player";
import { PlayerProgress } from "./ui/player-progress";
import { VolumeSlider } from "./ui/volume-slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebarContext } from "./Layout";

export default function MusicPlayer() {
  const { 
    currentVideo,
    isPlaying,
    volume,
    progress,
    duration,
    shuffle,
    repeat,
    queue,
    togglePlay,
    setVolume,
    toggleMute,
    seek,
    nextVideo,
    previousVideo,
    toggleShuffle,
    toggleRepeat
  } = usePlayer();

  // Check if current track is a favorite
  const { data: favoriteData, isLoading: favoriteLoading } = useQuery({
    queryKey: currentVideo ? QUERY_KEYS.isFavorite(currentVideo.id) : ['favorite', null],
    queryFn: async ({ queryKey }) => {
      const url = queryKey[0] as string;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Impossibile verificare lo stato dei preferiti');
      }
      return res.json();
    },
    enabled: !!currentVideo,
  });

  // Add to favorites mutation
  const addFavoriteMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const res = await apiRequest('POST', '/api/favorites', { video_id: videoId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.favorites] });
      if (currentVideo) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.isFavorite(currentVideo.id) });
      }
    },
  });

  // Remove from favorites mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const res = await apiRequest('DELETE', `/api/favorites/${videoId}`, undefined);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.favorites] });
      if (currentVideo) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.isFavorite(currentVideo.id) });
      }
    },
  });

  // Handle favorite toggle
  const toggleFavorite = () => {
    if (!currentVideo) return;
    
    if (favoriteData?.isFavorite) {
      removeFavoriteMutation.mutate(currentVideo.id);
    } else {
      addFavoriteMutation.mutate(currentVideo.id);
    }
  };

  // Format time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Accedo al contesto della sidebar
  const { expanded } = useSidebarContext();

  // Se non c'è un video in riproduzione, non mostriamo il player
  if (!currentVideo) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bg-gradient-to-r from-blue-950 to-blue-900 border-t border-blue-800/30 py-3 px-4 z-30 transition-all duration-300",
      // Su desktop si adatta alla larghezza della sidebar
      // Su mobile va nella posizione sopra alla barra di navigazione
      "bottom-16 md:bottom-0", // Su mobile sopra la barra di navigazione
      expanded ? "left-0 right-0 md:left-64" : "left-0 right-0 md:left-20",
      // Animazione di entrata/uscita
      "transform transition-transform duration-300 ease-in-out"
    )}>
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        {/* Currently Playing */}
        <div className="flex items-center w-1/4 min-w-[200px]">
          {currentVideo ? (
            <>
              <img 
                src={currentVideo.thumbnail} 
                alt={currentVideo.title} 
                className="w-14 h-14 rounded-md shadow-lg mr-3 hidden sm:block object-cover" 
              />
              <div className="overflow-hidden">
                <h4 className="font-medium text-blue-50 text-sm truncate">
                  {currentVideo.title}
                </h4>
                <p className="text-xs text-blue-300/70 truncate">
                  {currentVideo.channel_title}
                </p>
              </div>
              <button 
                className={cn(
                  "ml-4 transition-colors", 
                  favoriteData?.isFavorite ? "text-blue-500" : "text-blue-400 hover:text-blue-200"
                )}
                onClick={toggleFavorite}
                disabled={favoriteLoading}
              >
                <Heart className={cn("h-5 w-5", favoriteData?.isFavorite && "fill-blue-500")} />
              </button>
            </>
          ) : (
            <div className="flex items-center">
              <Skeleton className="w-14 h-14 rounded-md mr-3 hidden sm:block bg-blue-950" />
              <div>
                <Skeleton className="h-4 w-32 bg-blue-950 mb-1" />
                <Skeleton className="h-3 w-24 bg-blue-950" />
              </div>
            </div>
          )}
        </div>
        
        {/* Player Controls */}
        <div className="w-2/4 max-w-md">
          <div className="player-controls flex items-center justify-center space-x-4 mb-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className={cn(
                    "text-blue-400 hover:text-blue-200 transition-colors",
                    shuffle && "text-blue-500"
                  )}
                  onClick={toggleShuffle}
                >
                  <Shuffle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Casuale</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className={cn(
                    "text-blue-400 hover:text-blue-200 transition-colors",
                    !currentVideo && "opacity-50"
                  )}
                  onClick={previousVideo}
                  disabled={!currentVideo}
                >
                  <SkipBack className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-blue-900 border-blue-700">
                <p>Precedente</p>
              </TooltipContent>
            </Tooltip>
            
            <button 
              className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-400 transition-colors shadow-sm shadow-blue-500/30"
              onClick={togglePlay}
              disabled={!currentVideo}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </button>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className={cn(
                    "text-blue-400 hover:text-blue-200 transition-colors",
                    (!currentVideo || queue.length === 0) && "opacity-50"
                  )}
                  onClick={nextVideo}
                  disabled={!currentVideo || queue.length === 0}
                >
                  <SkipForward className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-blue-900 border-blue-700">
                <p>Successivo</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className={cn(
                    "text-blue-400 hover:text-blue-200 transition-colors",
                    repeat && "text-blue-500"
                  )}
                  onClick={toggleRepeat}
                >
                  <Repeat className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ripeti</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex items-center text-xs">
            <span className="text-blue-300/80 mr-2 w-8 text-right">
              {currentVideo ? formatTime(progress) : "--:--"}
            </span>
            
            <PlayerProgress 
              value={duration ? (progress / duration) * 100 : 0} 
              onChange={(value) => seek(duration * (value / 100))}
              disabled={!currentVideo || duration === 0}
            />
            
            <span className="text-blue-300/80 ml-2 w-8">
              {currentVideo ? formatTime(duration) : "--:--"}
            </span>
          </div>
        </div>
        
        {/* Volume Controls */}
        <div className="hidden md:flex items-center justify-end w-1/4 space-x-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="text-blue-400 hover:text-blue-200 transition-colors"
                disabled={queue.length === 0}
              >
                <ListMusic className="h-5 w-5" />
                {queue.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center shadow-sm shadow-blue-500/30">
                    {queue.length}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-blue-900 border-blue-700">
              <p>Coda ({queue.length})</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="text-blue-400 hover:text-blue-200 transition-colors"
                onClick={toggleMute}
              >
                {volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : volume < 50 ? (
                  <Volume1 className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-blue-900 border-blue-700">
              <p>{volume === 0 ? "Riattiva audio" : "Disattiva audio"}</p>
            </TooltipContent>
          </Tooltip>
          
          <VolumeSlider 
            value={volume} 
            onChange={setVolume} 
          />
        </div>
      </div>
    </div>
  );
}
