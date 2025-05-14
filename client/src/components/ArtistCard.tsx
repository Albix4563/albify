import { Search } from "lucide-react";
import { usePlayer } from "@/hooks/use-player";
import { useYoutubeSearch } from "@/hooks/use-youtube";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ArtistCardProps {
  id: string;
  name: string;
  image: string;
}

export default function ArtistCard({ id, name, image }: ArtistCardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { playVideo } = usePlayer();
  
  // Pre-fetch top song by artist but don't render anything
  const { data: searchResults, isError } = useYoutubeSearch(`${name} official audio`);
  
  const handleClick = () => {
    // If we have search results, play the first one
    if (searchResults && searchResults.length > 0) {
      playVideo(searchResults[0]);
      toast({
        title: "Now Playing",
        description: `Playing top track by ${name}`,
      });
    } else {
      // Otherwise, navigate to search with the artist name
      setLocation(`/search?q=${encodeURIComponent(name)}`);
    }
  };
  
  return (
    <div 
      className="flex flex-col items-center cursor-pointer group"
      onClick={handleClick}
    >
      <div className="relative">
        <img 
          src={image} 
          alt={name} 
          className="w-24 h-24 rounded-full object-cover shadow-lg mb-3 group-hover:opacity-80 transition-opacity" 
        />
        <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Search className="text-white h-6 w-6" />
        </div>
      </div>
      <h3 className="font-medium text-sm text-center group-hover:text-[hsl(var(--albify-primary))] transition-colors">
        {name}
      </h3>
    </div>
  );
}
