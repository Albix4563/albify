import { useState, useEffect } from "react";
import { Search as SearchIcon, X, History } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface SearchBarProps {
  placeholder?: string;
  initialQuery?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

export default function SearchBar({ 
  placeholder = "Cerca canzoni, artisti o playlist", 
  initialQuery = "",
  onSearch,
  className = ""
}: SearchBarProps) {
  const [searchValue, setSearchValue] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [, setLocation] = useLocation();
  
  // Fetch recent searches from API
  const { data: recentSearches = [] } = useQuery<string[]>({
    queryKey: ['/api/recent-searches'],
    enabled: true,
    staleTime: 60000 // 1 minute cache
  });

  // Handle search query parameter from URL
  useEffect(() => {
    if (initialQuery) {
      setSearchValue(initialQuery);
    }
  }, [initialQuery]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    // Non eseguiamo più la ricerca automatica quando l'utente digita
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      if (onSearch) {
        onSearch(searchValue);
      } else {
        // Navigate to search page with query
        setLocation(`/search?q=${encodeURIComponent(searchValue)}`);
      }
      setShowSuggestions(false);
    }
  };

  // Clear search input
  const clearSearch = () => {
    setSearchValue("");
    if (onSearch) {
      onSearch(""); // Puliamo i risultati di ricerca
    }
    setShowSuggestions(false);
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (query: string) => {
    setSearchValue(query);
    if (onSearch) {
      onSearch(query);
    } else {
      setLocation(`/search?q=${encodeURIComponent(query)}`);
    }
    setShowSuggestions(false);
  };

  // Focus and blur handlers to show/hide suggestions
  const handleFocus = () => {
    // Only show suggestions if we have some and no current search value
    if (recentSearches.length > 0) {
      setShowSuggestions(true);
    }
  };
  
  const handleBlur = () => {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className={className}>
        <div className="flex items-center bg-[hsl(220,70%,8%)] rounded-full overflow-hidden px-5 w-full h-14 border border-[hsl(220,50%,15%)] shadow-inner shadow-blue-500/5 hover:border-[hsl(210,100%,50%/0.3)] transition-all duration-200">
          <SearchIcon className="text-blue-400 mr-3 h-5 w-5" />
          <input
            type="text"
            value={searchValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="bg-transparent border-none outline-none py-3 text-blue-50 w-full text-base font-medium placeholder-blue-400/50"
          />
          {searchValue && (
            <button 
              type="button" 
              onClick={clearSearch}
              className="text-blue-400 hover:text-blue-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>
      
      {/* Recent searches suggestions */}
      {showSuggestions && recentSearches.length > 0 && !searchValue && (
        <div className="absolute mt-2 w-full bg-[hsl(220,70%,8%)] rounded-lg border border-[hsl(220,50%,15%)] shadow-lg shadow-blue-500/10 z-50 py-2 max-h-96 overflow-y-auto">
          <h3 className="text-blue-400 text-xs uppercase px-4 py-2 font-bold">Ricerche recenti</h3>
          <ul>
            {recentSearches.map((search: string, index: number) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(search)}
                  className="flex items-center w-full px-4 py-2 text-blue-100 hover:bg-[hsl(210,100%,50%/0.2)] transition-colors rounded-sm mx-1"
                >
                  <History className="h-4 w-4 mr-3 text-blue-400" />
                  <span className="truncate">{search}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
