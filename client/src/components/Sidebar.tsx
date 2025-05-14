import React, { useState, useContext, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Search, 
  Library, 
  PlusSquare, 
  Heart, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  ClipboardList
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import CreatePlaylistModal from "./CreatePlaylistModal";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSidebarContext } from "./Layout";
import logoPath from "../assets/logo-with-bg.png";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const { expanded, setExpanded } = useSidebarContext();
  
  // Ottieni la dimensione della finestra per determinare se siamo su mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Controlla all'inizio
    checkMobile();
    
    // Aggiungi listener per il resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Toggle sidebar
  const toggleSidebar = () => {
    setExpanded(!expanded);
  };
  
  // Fetch user playlists
  const { data: playlists, isLoading: playlistsLoading } = useQuery({
    queryKey: [QUERY_KEYS.playlists],
    queryFn: async () => {
      const response = await fetch(QUERY_KEYS.playlists);
      if (!response.ok) {
        throw new Error("Failed to fetch playlists");
      }
      return response.json();
    },
    enabled: !!user,
  });

  // Renderizza la sidebar mobile (bottom navigation)
  if (isMobile) {
    return (
      <>
        <div className="h-16 bg-gradient-to-r from-blue-950 to-blue-900 border-t border-blue-800/30 flex items-center justify-around z-20">
          <Link 
            href="/"
            className={cn(
              "flex flex-col items-center justify-center px-3 py-2",
              location === "/" 
                ? "text-blue-300" 
                : "text-blue-500"
            )}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          
          <Link 
            href="/search"
            className={cn(
              "flex flex-col items-center justify-center px-3 py-2",
              location === "/search" 
                ? "text-blue-300" 
                : "text-blue-500"
            )}
          >
            <Search className="h-6 w-6" />
            <span className="text-xs mt-1">Cerca</span>
          </Link>
          
          <Link 
            href="/playlists"
            className={cn(
              "flex flex-col items-center justify-center px-3 py-2",
              location === "/playlists" 
                ? "text-blue-300" 
                : "text-blue-500"
            )}
          >
            <Library className="h-6 w-6" />
            <span className="text-xs mt-1">Libreria</span>
          </Link>
          
          <Link 
            href="/favorites"
            className={cn(
              "flex flex-col items-center justify-center px-3 py-2",
              location === "/favorites" 
                ? "text-blue-300" 
                : "text-blue-500"
            )}
          >
            <Heart className={cn("h-6 w-6", location === "/favorites" ? "fill-blue-300" : "")} />
            <span className="text-xs mt-1">Preferiti</span>
          </Link>
          
          <Link 
            href="/changelog"
            className={cn(
              "flex flex-col items-center justify-center px-3 py-2",
              location === "/changelog" 
                ? "text-blue-300" 
                : "text-blue-500"
            )}
          >
            <ClipboardList className="h-6 w-6" />
            <span className="text-xs mt-1">Log</span>
          </Link>
        </div>
        
        {/* Create Playlist Modal */}
        <CreatePlaylistModal 
          isOpen={showCreatePlaylistModal} 
          onClose={() => setShowCreatePlaylistModal(false)} 
        />
      </>
    );
  }

  // Renderizza la sidebar desktop normale
  return (
    <>
      <div 
        className={cn(
          "sidebar fixed h-screen bg-gradient-to-b from-[hsl(220,80%,3%)] to-[hsl(220,80%,7%)] z-20 flex-shrink-0 border-r border-[hsl(var(--albify-divider))] transition-all duration-300",
          expanded ? "w-64" : "w-20"
        )}
      >
        <div className="py-6 flex flex-col h-full relative">
          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 text-blue-400 hover:text-blue-200 hover:bg-blue-600/10 transition-colors"
            onClick={toggleSidebar}
          >
            {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
          
          {/* Logo */}
          <div className={cn("flex justify-center items-center mb-6", expanded ? "px-6" : "px-2")}>
            <div className="relative overflow-hidden rounded-xl shadow-lg">
              <img 
                src={logoPath} 
                alt="Albify Logo" 
                className={cn("w-auto max-w-full", expanded ? "h-28" : "h-20")} 
              />
            </div>
          </div>
          
          {/* Main Navigation */}
          <nav className={expanded ? "px-6" : "px-2"}>
            <ul className="space-y-4">
              <li>
                <Link 
                  href="/"
                  className={cn(
                    "sidebar-link flex items-center font-medium p-2 rounded-md transition-all duration-200",
                    expanded ? "space-x-4" : "justify-center", 
                    location === "/" 
                      ? "bg-[hsl(210,100%,50%/0.15)] text-blue-100 shadow-sm shadow-blue-500/10 border border-[hsl(210,100%,50%/0.2)]" 
                      : "text-blue-400 hover:text-blue-200 hover:bg-[hsl(210,100%,50%/0.1)]"
                  )}
                >
                  <Home className="h-5 w-5" />
                  {expanded && <span>Home</span>}
                </Link>
              </li>
              <li>
                <Link 
                  href="/search"
                  className={cn(
                    "sidebar-link flex items-center font-medium p-2 rounded-md transition-all duration-200",
                    expanded ? "space-x-4" : "justify-center", 
                    location === "/search" 
                      ? "bg-[hsl(210,100%,50%/0.15)] text-blue-100 shadow-sm shadow-blue-500/10 border border-[hsl(210,100%,50%/0.2)]" 
                      : "text-blue-400 hover:text-blue-200 hover:bg-[hsl(210,100%,50%/0.1)]"
                  )}
                >
                  <Search className="h-5 w-5" />
                  {expanded && <span>Cerca</span>}
                </Link>
              </li>
              <li>
                <Link 
                  href="/playlists"
                  className={cn(
                    "sidebar-link flex items-center font-medium p-2 rounded-md transition-all duration-200",
                    expanded ? "space-x-4" : "justify-center", 
                    location === "/playlists" 
                      ? "bg-[hsl(210,100%,50%/0.15)] text-blue-100 shadow-sm shadow-blue-500/10 border border-[hsl(210,100%,50%/0.2)]" 
                      : "text-blue-400 hover:text-blue-200 hover:bg-[hsl(210,100%,50%/0.1)]"
                  )}
                >
                  <Library className="h-5 w-5" />
                  {expanded && <span>La tua Libreria</span>}
                </Link>
              </li>
              <li className="mt-8">
                <button 
                  onClick={() => setShowCreatePlaylistModal(true)}
                  className={cn(
                    "sidebar-link w-full flex items-center font-medium p-2 rounded-md text-blue-400 hover:text-blue-200 hover:bg-[hsl(210,100%,50%/0.1)] transition-all duration-200",
                    expanded ? "space-x-4" : "justify-center"
                  )}
                >
                  <PlusSquare className="h-5 w-5" />
                  {expanded && <span>Crea Playlist</span>}
                </button>
              </li>
              <li>
                <Link 
                  href="/favorites"
                  className={cn(
                    "sidebar-link flex items-center font-medium p-2 rounded-md transition-all duration-200",
                    expanded ? "space-x-4" : "justify-center", 
                    location === "/favorites" 
                      ? "bg-[hsl(210,100%,50%/0.15)] text-blue-100 shadow-sm shadow-blue-500/10 border border-[hsl(210,100%,50%/0.2)]" 
                      : "text-blue-400 hover:text-blue-200 hover:bg-[hsl(210,100%,50%/0.1)]"
                  )}
                >
                  <Heart className={cn("h-5 w-5", location === "/favorites" ? "text-blue-500 fill-blue-500" : "")} />
                  {expanded && <span>Brani Preferiti</span>}
                </Link>
              </li>

            </ul>
          </nav>
          
          {/* Playlists */}
          <div className={cn(
            "mt-8 pt-8 border-t border-[hsl(var(--albify-divider))] flex-1 overflow-y-auto",
            expanded ? "block px-6" : "hidden"
          )}>
            <h3 className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-4 ml-1">
              Playlists
            </h3>
            
            {playlistsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4 bg-[hsl(220,60%,12%)]" />
                <Skeleton className="h-4 w-4/5 bg-[hsl(220,60%,12%)]" />
                <Skeleton className="h-4 w-2/3 bg-[hsl(220,60%,12%)]" />
              </div>
            ) : (
              <ul className="space-y-2">
                {playlists?.length > 0 ? (
                  playlists.map((playlist: { id: number, name: string }) => (
                    <li key={playlist.id}>
                      <Link 
                        href={`/playlists/${playlist.id}`}
                        className="text-blue-400 hover:text-blue-200 text-sm block transition-colors pl-1 py-1 rounded hover:bg-[hsl(210,100%,50%/0.1)]"
                      >
                        {playlist.name}
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="text-blue-400/50 text-sm italic pl-1">Nessuna playlist disponibile</li>
                )}
              </ul>
            )}
          </div>
          
          {/* Playlists Icon (quando la sidebar è minimizzata) */}
          {!expanded && (
            <div className="mt-8 pt-8 border-t border-[hsl(var(--albify-divider))] px-2">
              <div className="flex justify-center">
                <Link 
                  href="/playlists"
                  className="sidebar-link flex justify-center font-medium p-2 rounded-md text-gray-400 hover:text-white"
                >
                  <Library className="h-5 w-5" />
                </Link>
              </div>
            </div>
          )}
          
          {/* Changelog Link */}
          <div className={cn(
            "mt-auto pb-2",
            expanded ? "block px-6" : "flex justify-center px-2"
          )}>
            <Link
              href="/changelog"
              className={cn(
                "flex items-center p-2 rounded-md text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 transition-colors",
                expanded ? "space-x-2" : "justify-center"
              )}
            >
              <ClipboardList className="h-5 w-5" />
              {expanded && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium">Changelog</span>
                  <Badge 
                    variant="outline" 
                    className="bg-blue-900/30 border-blue-500/40 text-blue-300 px-2 py-0 text-[10px]"
                  >
                    v0.1
                  </Badge>
                </div>
              )}
            </Link>
          </div>
          
          {/* User Profile */}
          {user && (
            <div className={cn(
              "pb-4",
              expanded ? "block px-6" : "flex justify-center px-2"
            )}>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full">
                  <div className={cn(
                    "flex items-center p-2 rounded-md hover:bg-[hsl(var(--albify-hover))]",
                    expanded ? "space-x-2" : "justify-center"
                  )}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[hsl(var(--albify-primary))]">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {expanded && <span className="text-sm font-medium text-white">{user.username}</span>}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Disconnetti</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Playlist Modal */}
      <CreatePlaylistModal 
        isOpen={showCreatePlaylistModal} 
        onClose={() => setShowCreatePlaylistModal(false)} 
      />
    </>
  );
}
