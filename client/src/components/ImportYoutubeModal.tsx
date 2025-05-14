import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, Loader2, Youtube, Music, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportYoutubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPlaylistId?: number; // ID di una playlist esistente per aggiunta diretta
  onlyVideo?: boolean; // Per mostrare solo la tab del video singolo
}

// Interfaccia per la playlist
interface Playlist {
  id: number;
  name: string;
  description?: string;
  userId: number;
  createdAt: string;
}

// YouTube Playlist import schema
const playlistImportSchema = z.object({
  playlistId: z.string().min(1, { message: "L'ID della playlist non può essere vuoto" }),
  playlistName: z.string().min(1, { message: "Il nome della playlist non può essere vuoto" }).max(100),
  description: z.string().max(500).optional(),
  existingPlaylistId: z.number().optional(),
});

// YouTube Video import schema
const videoImportSchema = z.object({
  videoId: z.string().min(1, { message: "L'ID del video non può essere vuoto" }),
  playlistId: z.number({ required_error: "Seleziona una playlist" }),
});

type PlaylistImportFormValues = z.infer<typeof playlistImportSchema>;
type VideoImportFormValues = z.infer<typeof videoImportSchema>;

export default function ImportYoutubeModal({ isOpen, onClose, existingPlaylistId, onlyVideo = false }: ImportYoutubeModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(onlyVideo ? "video" : "playlist");
  
  // Fetch playlists for selection
  const { data: playlists = [] } = useQuery({
    queryKey: [QUERY_KEYS.playlists],
    queryFn: async () => {
      const response = await fetch("/api/playlists");
      if (!response.ok) {
        throw new Error("Errore nel recupero delle playlist");
      }
      return response.json();
    },
    enabled: isOpen && activeTab === "video"
  });
  
  // Extract playlist ID from YouTube URL if full URL is provided
  const extractPlaylistId = (url: string): string => {
    try {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        
        // Try to extract playlist ID from URL
        const listParam = params.get('list');
        if (listParam) return listParam;
      }
      
      // If no ID found in URL, return the original input (might be a direct ID)
      return url;
    } catch (e) {
      // If URL parsing fails, return the original string
      return url;
    }
  };
  
  // Extract video ID from YouTube URL if full URL is provided
  const extractVideoId = (url: string): string => {
    try {
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        
        // Try to extract video ID from URL
        const vParam = params.get('v');
        if (vParam) return vParam;
      } else if (url.includes('youtu.be/')) {
        // Handle youtu.be short links
        const parts = url.split('youtu.be/');
        if (parts.length > 1) {
          const id = parts[1].split('?')[0];
          return id;
        }
      }
      
      // If no ID found in URL, return the original input (might be a direct ID)
      return url;
    } catch (e) {
      // If URL parsing fails, return the original string
      return url;
    }
  };
  
  // Playlist form
  const playlistForm = useForm<PlaylistImportFormValues>({
    resolver: zodResolver(playlistImportSchema),
    defaultValues: {
      playlistId: "",
      playlistName: "",
      description: "",
      existingPlaylistId: existingPlaylistId || undefined,
    },
  });
  
  // Video form with playlist selection
  const videoForm = useForm<VideoImportFormValues>({
    resolver: zodResolver(videoImportSchema),
    defaultValues: {
      videoId: "",
      playlistId: existingPlaylistId || undefined,
    },
  });

  // Import video mutation
  const importVideoMutation = useMutation({
    mutationFn: async (data: VideoImportFormValues) => {
      // Extract video ID if a full URL was provided
      const videoId = extractVideoId(data.videoId);
      
      const res = await apiRequest("POST", "/api/playlists/add-youtube-video", {
        videoId,
        playlistId: data.playlistId
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore durante l'importazione del video");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Invalida le query delle playlist
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.playlists] });
      
      // Aggiorna la vista della playlist specifica con i nuovi dati
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlist(data.playlistId.toString()) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlistVideos(data.playlistId.toString()) });
      
      videoForm.reset();
      onClose();
      
      // Se questo video è stato aggiunto alla playlist che stiamo visualizzando, aggiorna il messaggio
      const playlistName = playlists.find((playlist: Playlist) => playlist.id === data.playlistId)?.name || `Playlist #${data.playlistId}`;
      
      toast({
        title: "Video importato",
        description: `Il video è stato aggiunto alla playlist "${playlistName}"`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Impossibile importare il video",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import playlist mutation
  const importPlaylistMutation = useMutation({
    mutationFn: async (data: PlaylistImportFormValues) => {
      // Extract playlist ID if a full URL was provided
      const playlistId = extractPlaylistId(data.playlistId);
      
      // Prepara i dati da inviare, assicurandosi di includere existingPlaylistId se presente
      const payload = {
        ...data,
        playlistId,
        existingPlaylistId: existingPlaylistId || data.existingPlaylistId
      };
      
      console.log("Importing playlist with data:", payload);
      
      const res = await apiRequest("POST", "/api/playlists/import-youtube", payload);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore durante l'importazione della playlist");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Invalida la query per la lista delle playlist
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.playlists] });
      
      // Se abbiamo aggiunto contenuti a una playlist esistente, invalida anche quella playlist
      if (existingPlaylistId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlist(existingPlaylistId.toString()) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlistVideos(existingPlaylistId.toString()) });
      }
      
      playlistForm.reset();
      onClose();
      
      // Il formato della risposta varia a seconda se è una nuova playlist o una esistente
      // Per le playlist esistenti, la proprietà "playlist" potrebbe non essere presente
      let playlistName = "";
      if (data.playlist) {
        // Nuova playlist creata durante l'importazione
        playlistName = data.playlist.name;
      } else if (data.playlist_id) {
        // Playlist esistente 
        playlistName = playlists.find((playlist: Playlist) => playlist.id === data.playlist_id)?.name || `Playlist #${data.playlist_id}`;
      }
      
      toast({
        title: "Contenuti importati",
        description: `${data.videos.length} video importati nella playlist "${playlistName}"`,
      });
    },
    onError: (error: Error) => {
      let errorMessage = error.message;
      
      // Messaggi di errore personalizzati per casi comuni
      if (errorMessage.includes("non contiene un ID di playlist") || 
          errorMessage.includes("non corrisponde a una playlist YouTube valida")) {
        errorMessage = "L'URL fornito non è una playlist YouTube valida. Assicurati che l'URL contenga 'list=' e che sia l'URL di una playlist, non di un video singolo.";
      }
      
      toast({
        title: "Impossibile importare la playlist",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Submit handlers
  const onSubmitPlaylist = (values: PlaylistImportFormValues) => {
    importPlaylistMutation.mutate(values);
  };
  
  const onSubmitVideo = (values: VideoImportFormValues) => {
    importVideoMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[hsl(var(--albify-card))] border-[hsl(var(--albify-divider))] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center">
            <Youtube className="mr-2 text-red-600" /> 
            Importa da YouTube
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={onlyVideo ? "video" : "playlist"} value={activeTab} onValueChange={setActiveTab} className="w-full">
          {!onlyVideo && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="playlist">Playlist YouTube</TabsTrigger>
              <TabsTrigger value="video">Video singolo</TabsTrigger>
            </TabsList>
          )}
          
          <TabsContent value="playlist">
            <Alert className="mb-4 bg-gray-800 border-blue-500">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-sm">
                Incolla l'URL della playlist YouTube (deve contenere "list=" nell'URL).<br/>
                <span className="font-medium">Esempio:</span> https://www.youtube.com/playlist?list=XXX...
              </AlertDescription>
            </Alert>
            
            <Form {...playlistForm}>
              <form onSubmit={playlistForm.handleSubmit(onSubmitPlaylist)} className="space-y-4">
                <FormField
                  control={playlistForm.control}
                  name="playlistId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Playlist o ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://www.youtube.com/playlist?list=PLxxxxxx..."
                          className="bg-gray-800 border-gray-700 text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Mostra i campi nome e descrizione solo se non si sta aggiungendo a una playlist esistente */}
                {!existingPlaylistId && (
                  <>
                    <FormField
                      control={playlistForm.control}
                      name="playlistName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome della Playlist</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="La Mia Playlist Importata"
                              className="bg-gray-800 border-gray-700 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={playlistForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrizione (opzionale)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Playlist importata da YouTube..."
                              className="bg-gray-800 border-gray-700 text-white resize-none h-20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <div className="flex space-x-4 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    className="w-1/2 border-gray-700 text-white"
                  >
                    Annulla
                  </Button>
                  <Button 
                    type="submit" 
                    className="w-1/2 bg-[hsl(var(--albify-accent))] hover:bg-opacity-80"
                    disabled={importPlaylistMutation.isPending}
                  >
                    {importPlaylistMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importazione...
                      </>
                    ) : "Importa"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="video">
            <Alert className="mb-4 bg-gray-800 border-blue-500">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-sm">
                Incolla l'URL del video YouTube (es. https://www.youtube.com/watch?v=XXX...)
                o utilizza direttamente l'ID del video e seleziona una playlist di destinazione.
              </AlertDescription>
            </Alert>
            
            <Form {...videoForm}>
              <form onSubmit={videoForm.handleSubmit(onSubmitVideo)} className="space-y-4">
                <FormField
                  control={videoForm.control}
                  name="videoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Video o ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://www.youtube.com/watch?v=XXX..."
                          className="bg-gray-800 border-gray-700 text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={videoForm.control}
                  name="playlistId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Playlist di destinazione</FormLabel>
                      {existingPlaylistId ? (
                        // Se c'è una playlist esistente specifica, mostra solo il nome 
                        <div className="p-2 bg-gray-800 border border-gray-700 text-white rounded-md">
                          {playlists.find((playlist: Playlist) => playlist.id === existingPlaylistId)?.name || `Playlist #${existingPlaylistId}`}
                        </div>
                      ) : (
                        // Altrimenti mostra il selettore di playlist
                        <Select 
                          onValueChange={value => field.onChange(parseInt(value, 10))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                              <SelectValue placeholder="Seleziona una playlist" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-700 text-white">
                            <ScrollArea className="h-60">
                              {playlists.length > 0 ? (
                                playlists.map((playlist: Playlist) => (
                                  <SelectItem 
                                    key={playlist.id} 
                                    value={playlist.id.toString()}
                                    className="text-white hover:bg-gray-700"
                                  >
                                    {playlist.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-center text-gray-400">
                                  Nessuna playlist disponibile
                                </div>
                              )}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-4 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    className="w-1/2 border-gray-700 text-white"
                  >
                    Annulla
                  </Button>
                  <Button 
                    type="submit" 
                    className="w-1/2 bg-[hsl(var(--albify-accent))] hover:bg-opacity-80"
                    disabled={importVideoMutation.isPending}
                  >
                    {importVideoMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importazione...
                      </>
                    ) : "Importa"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}