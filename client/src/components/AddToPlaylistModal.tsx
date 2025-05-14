import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Video } from "@/hooks/use-player";
import { ListMusic, Music, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddToPlaylistModalProps {
  show: boolean;
  onClose: () => void;
  video?: Video;
}

interface PlaylistItem {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
}

export default function AddToPlaylistModal({ show, onClose, video }: AddToPlaylistModalProps) {
  const { toast } = useToast();
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  
  // Recupera le playlist dell'utente
  const { data: playlists, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.playlists],
    queryFn: async () => {
      const response = await fetch(QUERY_KEYS.playlists, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch playlists");
      return response.json();
    },
    // Skip the query if there's no video or the modal is not shown
    enabled: !!video && show
  });
  
  // Mutation per aggiungere un video a una playlist
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
      
      // Reset lo stato di loading
      setLoading(null);
      
      // Show success toast
      toast({
        title: "Brano aggiunto",
        description: "Il brano è stato aggiunto alla playlist",
      });
    },
  });

  // Handle select playlist
  const handleSelectPlaylist = (playlistId: number) => {
    setSelectedPlaylist(playlistId);
  };
  
  // Handle add to playlist
  const handleAddToPlaylist = async () => {
    if (!video || !selectedPlaylist) return;
    
    // Set loading state
    setLoading(selectedPlaylist);
    
    try {
      await addToPlaylistMutation.mutateAsync({ 
        videoId: video.id, 
        playlistId: selectedPlaylist 
      });
      
      // Close the modal after successful addition
      onClose();
    } catch (error) {
      console.error("Error adding to playlist", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiungere il brano alla playlist",
        variant: "destructive",
      });
      
      // Reset loading state
      setLoading(null);
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[hsl(220,70%,8%)] border-[hsl(220,50%,15%)] text-blue-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-blue-50 flex items-center">
            <ListMusic className="mr-2 h-5 w-5 text-[hsl(var(--albify-primary))]" />
            Aggiungi a playlist
          </DialogTitle>
          <DialogDescription className="text-blue-400">
            Seleziona una playlist a cui aggiungere questo brano
          </DialogDescription>
        </DialogHeader>

        {video && (
          <div className="flex items-center mb-4 p-3 rounded-md bg-[hsl(220,60%,10%)]">
            <img 
              src={video.thumbnail} 
              alt={video.title} 
              className="w-12 h-12 rounded object-cover mr-3 shadow-sm" 
            />
            <div>
              <h3 className="font-medium text-blue-100 line-clamp-1">{video.title}</h3>
              <p className="text-sm text-blue-400 line-clamp-1">{video.channel_title}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[hsl(var(--albify-primary))] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-blue-400">Caricamento playlist...</p>
          </div>
        ) : playlists && playlists.length > 0 ? (
          <ScrollArea className="max-h-[340px] pr-4">
            <div className="space-y-2">
              {playlists.map((playlist: PlaylistItem) => (
                <button
                  key={playlist.id}
                  onClick={() => handleSelectPlaylist(playlist.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-md transition-colors ${
                    selectedPlaylist === playlist.id
                      ? "bg-[hsl(var(--albify-primary))] text-white"
                      : "bg-[hsl(220,60%,10%)] hover:bg-[hsl(220,60%,15%)] text-blue-100"
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-md bg-[hsl(220,60%,6%)] flex items-center justify-center mr-3 shadow-inner shadow-blue-500/10">
                      <Music className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium line-clamp-1">{playlist.name}</p>
                      {playlist.description && (
                        <p className="text-sm line-clamp-1 opacity-80">{playlist.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {selectedPlaylist === playlist.id && (
                    <Check className="h-5 w-5 text-white" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[hsl(220,60%,12%)] flex items-center justify-center mx-auto mb-4">
              <ListMusic className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-blue-100 mb-2">Nessuna playlist</h3>
            <p className="text-sm text-blue-400 mb-4">
              Crea una playlist per poter aggiungere brani
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-2">
          <Button
            variant="outline" 
            onClick={onClose}
            className="border-[hsl(220,50%,15%)] hover:bg-[hsl(220,60%,15%)]"
          >
            <X className="mr-2 h-4 w-4" />
            Annulla
          </Button>
          
          <Button
            onClick={handleAddToPlaylist}
            disabled={!selectedPlaylist || loading !== null}
            className={`bg-[hsl(var(--albify-primary))] hover:bg-[hsl(var(--albify-primary))] hover:opacity-90 ${!selectedPlaylist ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading !== null ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Aggiunta in corso...
              </>
            ) : (
              <>
                <ListMusic className="mr-2 h-4 w-4" />
                Aggiungi
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}