import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useYoutubeSearch } from "@/hooks/use-youtube";
import MusicCard from "@/components/MusicCard";
import TrackList from "@/components/TrackList";
import SearchBar from "@/components/SearchBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MUSIC_CATEGORIES } from "@/lib/constants";
import { Search as SearchIcon, Disc, User, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Search() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Parse query from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split("?")[1]);
    const q = urlParams.get("q");
    if (q) {
      setSearchQuery(q);
    }
  }, [location]);
  
  // Search for videos
  const { 
    data: searchResults, 
    isLoading, 
    isError 
  } = useYoutubeSearch(searchQuery);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <>
      {/* Top Search Bar */}
      <div className="mb-8">
        {isAuthenticated ? (
          <SearchBar 
            initialQuery={searchQuery} 
            onSearch={handleSearch} 
            placeholder="Cosa vuoi ascoltare?"
            className="w-full max-w-xl"
          />
        ) : (
          <div className="w-full max-w-xl bg-[hsl(var(--albify-card))] rounded-full overflow-hidden px-5 h-14 flex items-center opacity-50 cursor-not-allowed">
            <SearchIcon className="text-gray-400 mr-3 h-5 w-5" />
            <p className="text-gray-400 text-base font-medium">Accedi per cercare</p>
          </div>
        )}
      </div>

      {!isAuthenticated ? (
        // Not authenticated state
        <div className="flex flex-col items-center justify-center py-20">
          <Lock className="h-16 w-16 text-gray-500 mb-6" />
          <h3 className="text-2xl font-medium text-white mb-3">Accesso richiesto</h3>
          <p className="text-gray-400 text-center max-w-md">
            Devi accedere per cercare musica. Effettua il login per continuare.
          </p>
        </div>
      ) : searchQuery.trim() === "" ? (
        // Empty state when no search is active
        <div className="flex flex-col items-center justify-center py-20">
          <SearchIcon className="h-16 w-16 text-gray-500 mb-6" />
          <h3 className="text-2xl font-medium text-white mb-3">Cerca musica</h3>
          <p className="text-gray-400 text-center max-w-md">
            Scrivi nella barra di ricerca qui sopra per trovare le tue canzoni, artisti e album preferiti.
          </p>
        </div>
      ) : (
        // Search Results
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">
              Risultati per "{searchQuery}"
            </h1>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setView("grid")} 
                className={`p-2 rounded-md ${view === "grid" ? "bg-[hsl(var(--albify-hover))]" : ""}`}
              >
                <Disc size={20} className="text-white" />
              </button>
              <button 
                onClick={() => setView("list")} 
                className={`p-2 rounded-md ${view === "list" ? "bg-[hsl(var(--albify-hover))]" : ""}`}
              >
                <User size={20} className="text-white" />
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 text-[hsl(var(--albify-primary))] animate-spin mb-4" />
              <p className="text-gray-400">Ricerca in corso...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20">
              <SearchIcon className="h-10 w-10 text-gray-500 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Ricerca fallita</h3>
              <p className="text-gray-400">
                Si è verificato un errore durante la ricerca. Riprova più tardi.
              </p>
            </div>
          ) : searchResults?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <SearchIcon className="h-10 w-10 text-gray-500 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Nessun risultato trovato</h3>
              <p className="text-gray-400">
                Non abbiamo trovato risultati per "{searchQuery}".
                Prova con altre parole chiave o controlla eventuali errori di digitazione.
              </p>
            </div>
          ) : (
            <>
              {view === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                  {searchResults?.map((video) => (
                    <MusicCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <TrackList 
                  tracks={searchResults || []}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
