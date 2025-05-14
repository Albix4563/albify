import { useEffect, useState, createContext, useContext } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import MusicPlayer from "./MusicPlayer";
import AuthModal from "./AuthModal";
import { useAuth } from "@/hooks/use-auth";

// Creiamo un context per gestire lo stato della sidebar
type SidebarContextType = {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
};

export const SidebarContext = createContext<SidebarContextType>({
  expanded: true,
  setExpanded: () => {},
});

export const useSidebarContext = () => useContext(SidebarContext);

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [expanded, setExpanded] = useState(true);
  
  // Carica lo stato della sidebar dal localStorage all'avvio
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar_expanded');
    if (savedState !== null) {
      setExpanded(savedState === 'true');
    }
    
    // Per adattarsi alla dimensione dello schermo
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setExpanded(false);
      }
    };
    
    // Esegui all'avvio
    handleResize();
    
    // Aggiungi event listener per il resize
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Show auth modal if user is not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [isAuthenticated, isLoading]);

  return (
    <SidebarContext.Provider value={{ expanded, setExpanded }}>
      <div className="flex flex-col md:flex-row h-screen relative">
        {/* Sidebar - Solo visibile su desktop */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <main className={`flex-1 p-4 md:p-8 pt-8 md:pt-16 overflow-y-auto bg-gradient-to-b from-[hsl(220,70%,5%)] to-[hsl(220,70%,10%)] transition-all duration-300 
          ${expanded ? 'md:ml-64' : 'md:ml-20'}
          ${/* Su mobile aggiunge uno spazio in basso per la barra di navigazione */
            'mb-16 md:mb-0'}
        `}>
          {children}
        </main>
        
        {/* Music Player */}
        {/* Il MusicPlayer appare solo quando c'è un video in riproduzione (logica gestita nel componente stesso) */}
        <MusicPlayer />
        
        {/* Mobile Navigation Bar - Solo su mobile */}
        <div className="block md:hidden">
          <div className="fixed bottom-0 left-0 right-0 z-10">
            <Sidebar />
          </div>
        </div>
        
        {/* Auth Modal */}
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    </SidebarContext.Provider>
  );
}
