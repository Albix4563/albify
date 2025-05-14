import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { PlusCircle, Music, Loader2, Youtube, Import } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import ImportYoutubeModal from "@/components/ImportYoutubeModal";
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Playlist {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  created_at: string;
}

export default function Playlists() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Get playlists
  const { data: playlists, isLoading, isError, refetch } = useQuery({
    queryKey: [QUERY_KEYS.playlists],
    queryFn: async () => {
      const response = await fetch(QUERY_KEYS.playlists, {
        credentials: 'include'
      });
      if (!response.ok) {
        console.error("Errore nel recupero playlist:", response.status, response.statusText);
        throw new Error("Failed to fetch playlists");
      }
      const data = await response.json();
      console.log("Playlist recuperate:", data);
      return data;
    },
  });
  
  // Ricarica i dati quando le modali vengono chiuse
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    refetch();
  };
  
  const handleCloseImportModal = () => {
    setShowImportModal(false);
    refetch();
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Le tue Playlist</h1>
        <div className="flex space-x-3">
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-[hsl(var(--albify-accent))] hover:bg-opacity-80"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Crea Playlist
          </Button>
          
          <Button 
            onClick={() => setShowImportModal(true)}
            variant="outline"
            className="border-[hsl(var(--albify-divider))] hover:bg-[hsl(var(--albify-hover))]"
          >
            <Youtube className="mr-2 h-4 w-4 text-red-500" />
            Importa da YouTube
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="bg-[hsl(var(--albify-card))] border-[hsl(var(--albify-divider))]">
              <CardContent className="p-6">
                <Skeleton className="h-40 w-full bg-gray-800 mb-4" />
                <Skeleton className="h-6 w-3/4 bg-gray-800 mb-2" />
                <Skeleton className="h-4 w-1/2 bg-gray-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-[hsl(var(--albify-card))] rounded-lg p-8 text-center">
          <h3 className="text-xl font-medium text-white mb-2">Errore nel caricamento delle playlist</h3>
          <p className="text-gray-400">
            Si è verificato un problema nel recupero delle tue playlist. Riprova più tardi.
          </p>
        </div>
      ) : playlists?.length === 0 ? (
        <div className="bg-[hsl(var(--albify-card))] rounded-lg p-8 text-center">
          <Music className="mx-auto h-12 w-12 text-gray-500 mb-3" />
          <h3 className="text-xl font-medium text-white mb-2">Crea la tua prima playlist</h3>
          <p className="text-gray-400 mb-6">
            È facile - basta cliccare sul pulsante Crea Playlist qui sopra.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist: Playlist) => (
            <Link key={playlist.id} href={`/playlists/${playlist.id}`}>
              <a className="block transition-transform hover:-translate-y-1">
                <Card className="bg-[hsl(var(--albify-card))] border-[hsl(var(--albify-divider))] hover:bg-[hsl(var(--albify-hover))] transition-colors cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="h-40 w-full bg-gradient-to-br from-[hsl(var(--albify-primary))] to-[hsl(var(--albify-secondary))] mb-4 rounded-md flex items-center justify-center">
                      <Music className="h-20 w-20 text-white opacity-70" />
                    </div>
                    <CardTitle className="text-white mb-2">{playlist.name}</CardTitle>
                    <CardDescription className="text-gray-400 line-clamp-2">
                      {playlist.description || "Nessuna descrizione"}
                    </CardDescription>
                  </CardContent>
                  <CardFooter className="text-xs text-gray-500 pb-6 px-6">
                    Creata il: {new Date(playlist.created_at).toLocaleDateString()}
                  </CardFooter>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      )}
      
      {/* Create Playlist Modal */}
      <CreatePlaylistModal 
        isOpen={showCreateModal} 
        onClose={handleCloseCreateModal} 
      />
      
      {/* Import YouTube Modal */}
      <ImportYoutubeModal
        isOpen={showImportModal}
        onClose={handleCloseImportModal}
      />
    </>
  );
}
