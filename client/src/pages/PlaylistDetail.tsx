import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { QUERY_KEYS } from "@/lib/constants";
import { 
  PlayCircle, 
  Shuffle, 
  Pencil, 
  Trash2, 
  Music,
  ArrowLeft,
  Loader2,
  SortAsc,
  Clock,
  Plus,
  Youtube
} from "lucide-react";
import TrackList from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { usePlayer, Video } from "@/hooks/use-player";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import ImportYoutubeModal from "@/components/ImportYoutubeModal";

interface Playlist {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  created_at: string;
}

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { playVideo, addToQueue, clearQueue } = usePlayer();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importVideoMode, setImportVideoMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  
  // Tipo e stato per l'ordinamento dei brani
  type SortType = 'position' | 'title' | 'date_added';
  const [sortType, setSortType] = useState<SortType>('position');
  
  // Get playlist details
  const { data: playlist, isLoading: playlistLoading } = useQuery<Playlist>({
    queryKey: QUERY_KEYS.playlist(id),
    queryFn: async ({ queryKey }) => {
      const url = queryKey[0] as string;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch playlist");
      }
      return response.json();
    },
  });
  
  // Get playlist videos
  const { data: videos, isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: QUERY_KEYS.playlistVideos(id),
    queryFn: async ({ queryKey }) => {
      const url = queryKey[0] as string;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch playlist videos");
      }
      return response.json();
    },
  });

  // Update playlist mutation
  const updatePlaylistMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const res = await apiRequest("PUT", `/api/playlists/${id}`, { name, description });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlist(id) });
      setShowEditModal(false);
      
      toast({
        title: "Playlist aggiornata",
        description: "La tua playlist è stata aggiornata con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Impossibile aggiornare la playlist",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    },
  });

  // Delete playlist mutation
  const deletePlaylistMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/playlists/${id}`, undefined);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.playlists] });
      setShowDeleteModal(false);
      setLocation("/playlists");
      
      toast({
        title: "Playlist eliminata",
        description: "La tua playlist è stata eliminata",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Impossibile eliminare la playlist",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    },
  });

  // Remove video from playlist mutation
  const removeVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const res = await apiRequest("DELETE", `/api/playlists/${id}/videos/${videoId}`, undefined);
      return res;
    },
    onSuccess: () => {
      // Invalidare la cache per forzare l'aggiornamento dei dati
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlistVideos(id) });
      
      // Aggiorna anche la lista delle playlist per riflettere il nuovo conteggio dei brani
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.playlists] });
      
      toast({
        title: "Brano rimosso",
        description: "Il brano è stato rimosso dalla tua playlist",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Impossibile rimuovere il brano",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    },
  });

  // Play all tracks
  const playAll = () => {
    if (videos && videos.length > 0) {
      // Usa l'ordinamento corrente
      const orderedVideos = getSortedVideos();
      
      // Prima pulisci la coda esistente
      clearQueue();
      
      // Riproduci il primo brano
      playVideo(orderedVideos[0]);
      
      // Poi aggiungi tutti i brani successivi alla coda
      orderedVideos.slice(1).forEach(video => {
        addToQueue(video);
      });
      
      toast({
        title: "Riproduzione playlist",
        description: `Riproduzione playlist "${playlist?.name}" in ordine ${sortType === 'position' ? 'originale' : sortType === 'title' ? 'alfabetico' : 'cronologico'}`,
      });
    }
  };
  
  // Shuffle and play
  const shufflePlay = () => {
    if (videos && videos.length > 0) {
      // Crea una copia dell'array e mescolalo
      const shuffledVideos = [...videos].sort(() => Math.random() - 0.5);
      
      // Prima pulisci la coda esistente
      clearQueue();
      
      // Riproduci il primo brano
      playVideo(shuffledVideos[0]);
      
      // Aggiungi il resto dei brani in ordine casuale alla coda
      shuffledVideos.slice(1).forEach(video => {
        addToQueue(video);
      });
      
      toast({
        title: "Riproduzione casuale",
        description: `Riproduzione "${playlist?.name}" in modalità casuale`,
      });
    }
  };

  // Open edit modal
  const handleEdit = () => {
    if (playlist) {
      setEditName(playlist.name);
      setEditDescription(playlist.description || "");
      setShowEditModal(true);
    }
  };

  // Submit edit
  const handleEditSubmit = () => {
    if (editName.trim()) {
      updatePlaylistMutation.mutate({
        name: editName,
        description: editDescription,
      });
    }
  };

  // Delete playlist
  const handleDelete = () => {
    deletePlaylistMutation.mutate();
  };

  // Remove video from playlist
  const handleRemoveVideo = (videoId: string) => {
    removeVideoMutation.mutate(videoId);
  };
  
  // Funzione per ordinare i brani in base al tipo di ordinamento
  const getSortedVideos = () => {
    if (!videos) return [];
    
    // Crea una copia per non modificare l'array originale
    const sortedVideos = [...videos];
    
    switch(sortType) {
      case 'position':
        // Ordina per posizione (ordine definito nella playlist)
        return sortedVideos.sort((a, b) => {
          if (a.position !== undefined && b.position !== undefined) {
            return a.position - b.position;
          }
          return 0;
        });
      
      case 'title':
        // Ordina per titolo (ordine alfabetico)
        return sortedVideos.sort((a, b) => {
          return a.title.localeCompare(b.title);
        });
        
      case 'date_added':
        // Ordina per data di aggiunta (dalla più recente alla meno recente)
        // Nota: nel nostro caso utilizziamo la posizione come approssimazione dell'ordine di inserimento
        // assumendo che gli elementi aggiunti più recentemente siano in fondo alla lista (posizione maggiore)
        return sortedVideos.sort((a, b) => {
          if (a.position !== undefined && b.position !== undefined) {
            // Ordine inverso: numeri più alti (aggiunti più recentemente) vengono prima
            return b.position - a.position;
          }
          return 0;
        });
        
      default:
        return sortedVideos;
    }
  };

  // Loading state
  if (playlistLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-[hsl(var(--albify-primary))] animate-spin mb-4" />
        <p className="text-gray-400">Caricamento playlist...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <button 
        onClick={() => setLocation("/playlists")}
        className="mb-6 flex items-center text-gray-400 hover:text-white"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Torna alle playlist
      </button>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-8">
        <div className="w-40 h-40 bg-gradient-to-br from-[hsl(var(--albify-primary))] to-[hsl(var(--albify-secondary))] flex items-center justify-center rounded-lg shadow-lg">
          <Music className="text-white h-20 w-20" />
        </div>
        
        <div className="flex-1">
          <h6 className="text-sm uppercase font-bold text-white mb-2">Playlist</h6>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
            {playlist?.name}
          </h1>
          
          {playlist?.description && (
            <p className="text-gray-400 mb-3">
              {playlist.description}
            </p>
          )}
          
          <div className="flex items-center text-sm text-gray-400">
            <span>{videos?.length || 0} brani</span>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <Button 
          onClick={playAll}
          className="bg-[hsl(var(--albify-accent))] hover:bg-[hsl(var(--albify-accent))] hover:bg-opacity-80 rounded-full h-12 px-6"
          disabled={videosLoading || !videos || videos.length === 0}
        >
          <PlayCircle className="mr-2 h-5 w-5" />
          Riproduci
        </Button>
        
        <Button 
          onClick={shufflePlay}
          variant="outline"
          className="border-gray-600 text-white hover:text-white hover:bg-gray-800"
          disabled={videosLoading || !videos || videos.length === 0}
        >
          <Shuffle className="mr-2 h-4 w-4" />
          Casuale
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="border-gray-600 text-white hover:text-white hover:bg-gray-800"
              disabled={videosLoading || !videos || videos.length === 0}
            >
              <SortAsc className="mr-2 h-4 w-4" />
              {sortType === 'position' ? 'Ordine Predefinito' : 
               sortType === 'title' ? 'Ordine Alfabetico' : 
               'Aggiunti di Recente'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[hsl(var(--albify-card))] border-[hsl(var(--albify-divider))] text-white">
            <DropdownMenuItem 
              className={`cursor-pointer ${sortType === 'position' ? 'text-[hsl(var(--albify-primary))]' : 'text-white'}`} 
              onClick={() => setSortType('position')}
            >
              Ordine Predefinito
            </DropdownMenuItem>
            <DropdownMenuItem 
              className={`cursor-pointer ${sortType === 'title' ? 'text-[hsl(var(--albify-primary))]' : 'text-white'}`} 
              onClick={() => setSortType('title')}
            >
              Ordine Alfabetico
            </DropdownMenuItem>
            <DropdownMenuItem 
              className={`cursor-pointer ${sortType === 'date_added' ? 'text-[hsl(var(--albify-primary))]' : 'text-white'}`} 
              onClick={() => setSortType('date_added')}
            >
              Aggiunti di Recente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800">
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi contenuti
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-900 text-white border-gray-700">
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800" 
              onClick={() => {
                setImportVideoMode(true);
                setShowImportModal(true);
              }}
            >
              <Youtube className="mr-2 h-4 w-4 text-red-500" />
              Importa video singolo
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800" 
              onClick={() => {
                setImportVideoMode(false);
                setShowImportModal(true);
              }}
            >
              <Youtube className="mr-2 h-4 w-4 text-red-500" />
              Importa playlist YouTube
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Nascondi pulsanti modifica/elimina per la playlist "Top Hits" (ID 14) */}
        {playlist?.id !== 14 && (
          <>
            <Button 
              onClick={handleEdit}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Modifica
            </Button>
            
            <Button 
              onClick={() => setShowDeleteModal(true)}
              variant="ghost"
              className="text-gray-400 hover:text-red-500 hover:bg-gray-800"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Elimina
            </Button>
          </>
        )}
      </div>
      
      {/* Tracks List */}
      {videosLoading ? (
        <TrackList tracks={[]} isLoading={true} />
      ) : videos?.length === 0 ? (
        <div className="bg-[hsl(var(--albify-card))] rounded-lg p-8 text-center">
          <Music className="mx-auto h-12 w-12 text-gray-500 mb-3" />
          <h3 className="text-xl font-medium text-white mb-2">Nessun brano in questa playlist</h3>
          <p className="text-gray-400 mb-6">
            Cerca musica e aggiungi brani alla tua playlist.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button 
              onClick={() => setLocation("/search")}
              className="bg-white text-black hover:bg-gray-200 rounded-full"
            >
              Trova brani
            </Button>
            <Button 
              onClick={() => {
                setImportVideoMode(true);
                setShowImportModal(true);
              }}
              variant="outline"
              className="bg-transparent border-red-500 text-white hover:bg-gray-800 rounded-full"
            >
              <Youtube className="mr-2 h-4 w-4 text-red-500" />
              Importa da YouTube
            </Button>
          </div>
        </div>
      ) : (
        <TrackList 
          tracks={getSortedVideos()}
          playlistId={parseInt(id)}
          onRemoveTrack={handleRemoveVideo}
        />
      )}
      
      {/* Edit Playlist Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-[hsl(var(--albify-card))] border-[hsl(var(--albify-divider))] text-white">
          <DialogHeader>
            <DialogTitle>Modifica Playlist</DialogTitle>
            <DialogDescription className="text-gray-400">
              Apporta modifiche alle informazioni della tua playlist.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-200">
                Nome
              </label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-200">
                Descrizione (opzionale)
              </label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white resize-none h-24"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleEditSubmit}
              className="bg-[hsl(var(--albify-accent))]"
              disabled={!editName.trim() || updatePlaylistMutation.isPending}
            >
              {updatePlaylistMutation.isPending ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-[hsl(var(--albify-card))] border-[hsl(var(--albify-divider))] text-white">
          <DialogHeader>
            <DialogTitle>Elimina Playlist</DialogTitle>
            <DialogDescription className="text-gray-400">
              Sei sicuro di voler eliminare questa playlist? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Annulla
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePlaylistMutation.isPending}
            >
              {deletePlaylistMutation.isPending ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import YouTube Modal */}
      <ImportYoutubeModal 
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        existingPlaylistId={parseInt(id)}
        onlyVideo={importVideoMode}
      />
    </div>
  );
}
