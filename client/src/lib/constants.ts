// Music categories for the home page
export const MUSIC_CATEGORIES = [
  { id: "trending", name: "Trending Now" },
  { id: "pop", name: "Pop" },
  { id: "rock", name: "Rock" },
  { id: "hiphop", name: "Hip Hop" },
  { id: "electronic", name: "Electronic" },
  { id: "indie", name: "Indie" },
  { id: "jazz", name: "Jazz" },
  { id: "classical", name: "Classical" }
];

// Placeholder images for music categories
export const CATEGORY_IMAGES = {
  trending: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300",
  pop: "https://images.unsplash.com/photo-1496293455970-f8581aae0e3b?w=300&h=300",
  rock: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300",
  hiphop: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300",
  electronic: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300",
  indie: "https://images.unsplash.com/photo-1604072366595-e75dc92d6bdc?w=300&h=300",
  jazz: "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=300&h=300",
  classical: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=300&h=300"
};

// Audio visualizations section removed as requested

// Artists section removed as requested

// Query keys for react-query
export const QUERY_KEYS = {
  user: "/api/auth/me",
  trending: "/api/trending",
  search: (query: string) => [`/api/search?query=${query}`],
  favorites: "/api/favorites",
  playlists: "/api/playlists",
  playlist: (id: string) => [`/api/playlists/${id}`],
  playlistVideos: (id: string) => [`/api/playlists/${id}/videos`],
  recentPlays: "/api/recent",
  video: (id: string) => [`/api/videos/${id}`],
  isFavorite: (id: string) => [`/api/favorites/${id}`]
};
