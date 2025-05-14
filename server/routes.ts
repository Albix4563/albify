import express from "express";
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { searchYouTubeVideos, getYouTubeVideo, getTrendingMusicVideos, getPlaylistVideos } from "./youtube";
import { recentSearches } from "./cache";
import * as schema from "@shared/schema";
import * as youtube from "./youtube";

// Define custom session with userId
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Funzione per creare playlist predefinita "Top Hits" con video popolari
async function createDefaultPlaylist(userId: number) {
  try {
    // Crea una nuova playlist "Top Hits" per l'utente
    const playlist = await storage.createPlaylist({
      name: "Top Hits",
      description: "I brani più popolari selezionati per te",
      user_id: userId
    });
    
    console.log(`[Default Playlist] Creata playlist "Top Hits" per l'utente ${userId}`);
    
    // Lista di 5 ID video popolari da YouTube da aggiungere alla playlist
    const popularVideoIds = [
      "kPa7bsKwL-c", // Lady Gaga - Poker Face
      "F7dJY0jkpyU", // YoungBoy Never Broke Again - Flossin (with A Boogie)
      "2_LlMpedbrY", // Flo Rida - Whistle
      "rNbJ3K-XKgI", // Elley Duhé - MIDDLE OF THE NIGHT
      "Jx9h3iWudTU"  // OneRepublic - Counting Stars
    ];
    
    // Aggiungi ogni video alla playlist
    for (let i = 0; i < popularVideoIds.length; i++) {
      const videoId = popularVideoIds[i];
      
      // Verifica se il video esiste già nel database
      let video = await storage.getVideo(videoId);
      
      // Se non esiste, ottieni i dettagli da YouTube e crealo
      if (!video) {
        try {
          const videoData = await youtube.getYouTubeVideo(videoId);
          if (videoData) {
            video = await storage.createVideo(videoData);
          }
        } catch (error) {
          console.error(`Errore nel recupero del video ${videoId}:`, error);
          // Continua con il prossimo video anche se questo fallisce
          continue;
        }
      }
      
      // Aggiungi il video alla playlist con la posizione corretta
      if (video) {
        await storage.addVideoToPlaylist({
          playlist_id: playlist.id,
          video_id: videoId,
          position: i
        });
        console.log(`[Default Playlist] Aggiunto video "${video.title}" alla playlist Top Hits`);
      }
    }
    
    return playlist;
  } catch (error) {
    console.error("Error creating default playlist:", error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "albify-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
      }
    })
  );

  // Helper middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const handleZodError = (error: unknown, res: Response) => {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        message: "Validation error", 
        errors: validationError.details 
      });
    }
    console.error("Unexpected error:", error);
    return res.status(500).json({ message: "Internal server error" });
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, username, password } = schema.registerUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      // Create user
      const user = await storage.createUser({ email, username });
      
      // Crea la playlist predefinita "Top Hits" per il nuovo utente
      try {
        await createDefaultPlaylist(user.id);
        console.log(`Playlist predefinita "Top Hits" creata per l'utente ${user.id}`);
      } catch (playlistError) {
        console.error(`Errore durante la creazione della playlist predefinita per l'utente ${user.id}:`, playlistError);
        // Continuiamo anche se la creazione della playlist fallisce
      }
      
      // Set session
      req.session.userId = user.id;
      
      return res.status(201).json({
        id: user.id,
        email: user.email,
        username: user.username
      });
    } catch (error) {
      return handleZodError(error, res);
    }
  });

  // Verifica se un utente ha una playlist "Top Hits" e la crea se non esiste
  async function ensureUserHasTopHitsPlaylist(userId: number) {
    try {
      // Ottieni tutte le playlist dell'utente
      const userPlaylists = await storage.getPlaylists(userId);
      
      // Cerca se l'utente ha già una playlist chiamata "Top Hits"
      const hasTopHits = userPlaylists.some(playlist => 
        playlist.name === "Top Hits" || 
        playlist.name === "Best Hits" ||
        playlist.name === "Top Brani"
      );
      
      // Se non ha la playlist, creala
      if (!hasTopHits) {
        console.log(`[Login] L'utente ${userId} non ha una playlist Top Hits, la creiamo ora`);
        await createDefaultPlaylist(userId);
      }
    } catch (error) {
      console.error(`Errore durante la verifica/creazione della playlist Top Hits per l'utente ${userId}:`, error);
      // Ignoriamo l'errore per non bloccare il login
    }
  }

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = schema.authUserSchema.parse(req.body);
      
      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      
      // Per ora accettiamo qualsiasi password per gli utenti esistenti
      // In un'applicazione reale qui verificheremmo il password hash
      // Questo è un semplice controllo basato sui dati che abbiamo inserito
      let passwordValid = false;
      
      if (email === "albertorossi2005@gmail.com" && password === "password123") {
        passwordValid = true;
      } else if (email === "ziopanax@boss.com" && password === "PanaxBoss") {
        passwordValid = true;
      } else if (email === "olga@gmail.com" && password === "Olga1234") {
        passwordValid = true;
      }
      
      if (!passwordValid) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Verifica e crea una playlist Top Hits se l'utente non ce l'ha già
      // Lo facciamo in modo asincrono per non rallentare il login
      ensureUserHasTopHitsPlaylist(user.id).catch(error => {
        console.error("Errore nella creazione della playlist di default:", error);
      });
      
      return res.json({
        id: user.id,
        email: user.email,
        username: user.username
      });
    } catch (error) {
      return handleZodError(error, res);
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      
      // Impostiamo header per evitare caching
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Cancelliamo il cookie di sessione
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      
      return res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.json({
      id: user.id,
      email: user.email,
      username: user.username
    });
  });

  // YouTube search API - Auth required
  app.get("/api/search", requireAuth, async (req, res) => {
    try {
      const { query } = schema.youtubeSearchSchema.parse(req.query);
      const results = await searchYouTubeVideos(query);
      return res.json(results);
    } catch (error: any) {
      // Check if it's a validation error
      if (error.name === "ZodError") {
        return handleZodError(error, res);
      }
      
      // Check if it's a YouTube API quota error
      if (error.message && error.message.includes("Forbidden")) {
        console.error("YouTube API quota exceeded:", error);
        return res.status(429).json({ 
          message: "Limite di quota YouTube API superato. Per favore riprova più tardi.",
          error: "QUOTA_EXCEEDED"
        });
      }
      
      // Generic error
      console.error("Unexpected error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get video details - No auth required
  app.get("/api/videos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check local storage first
      let video = await storage.getVideo(id);
      
      if (!video) {
        // Get from YouTube
        const youtubeVideo = await getYouTubeVideo(id);
        if (!youtubeVideo) {
          return res.status(404).json({ message: "Video not found" });
        }
        
        // Save to local storage
        video = await storage.createVideo(youtubeVideo);
      }
      
      return res.json(video);
    } catch (error: any) {
      console.error("Error getting video:", error);
      
      // Check if it's a YouTube API quota error
      if (error.message && error.message.includes("Forbidden")) {
        return res.status(429).json({ 
          message: "Limite di quota YouTube API superato. Per favore riprova più tardi.",
          error: "QUOTA_EXCEEDED"
        });
      }
      
      return res.status(500).json({ message: "Failed to get video" });
    }
  });

  // Get trending videos - No auth required
  app.get("/api/trending", async (req, res) => {
    try {
      const videos = await getTrendingMusicVideos();
      return res.json(videos);
    } catch (error: any) {
      console.error("Error getting trending videos:", error);
      
      // Check if it's a YouTube API quota error
      if (error.message && error.message.includes("Forbidden")) {
        return res.status(429).json({ 
          message: "Limite di quota YouTube API superato. Per favore riprova più tardi.",
          error: "QUOTA_EXCEEDED"
        });
      }
      
      return res.status(500).json({ message: "Failed to get trending videos" });
    }
  });
  
  // Recent searches API - Auth required
  app.get("/api/recent-searches", requireAuth, async (_req, res) => {
    try {
      // Accesso diretto all'importazione
      const searches = recentSearches.getRecentSearches(5);
      return res.json(searches);
    } catch (error) {
      console.error("Error getting recent searches:", error);
      return res.status(500).json({ message: "Failed to get recent searches" });
    }
  });

  // Database test endpoint - No auth required
  app.get("/api/db-test", async (_req, res) => {
    try {
      // Test query per verificare la connessione e le tabelle del database
      const tablesResult = await storage.testDatabaseTables();
      res.json({ 
        status: "ok", 
        message: "Connessione al database riuscita", 
        tables: tablesResult 
      });
    } catch (error: any) {
      console.error("Errore nel test del database:", error);
      res.status(500).json({ 
        status: "error", 
        message: "Errore nella connessione al database",
        error: error.message
      });
    }
  });

  // Playlist routes
  app.get("/api/playlists", requireAuth, async (req, res) => {
    try {
      const playlists = await storage.getPlaylists(req.session.userId);
      return res.json(playlists);
    } catch (error) {
      console.error("Error getting playlists:", error);
      return res.status(500).json({ message: "Failed to get playlists" });
    }
  });

  app.post("/api/playlists", requireAuth, async (req, res) => {
    try {
      const data = schema.insertPlaylistSchema.parse({
        ...req.body,
        user_id: req.session.userId
      });
      
      const playlist = await storage.createPlaylist(data);
      return res.status(201).json(playlist);
    } catch (error) {
      return handleZodError(error, res);
    }
  });
  
  // Import playlist from YouTube
  app.post("/api/playlists/import-youtube", requireAuth, async (req, res) => {
    try {
      // Parse request body
      const importData = schema.youtubePlaylistImportSchema.parse(req.body);
      const userId = 1; // Forza l'uso dell'utente 1 come richiesto
      
      console.log(`[Playlist Import] Importing YouTube playlist: ${importData.playlistId} for user ${userId}`);
      
      // Variabile per memorizzare l'ID della playlist (esistente o nuova)
      let playlistId: number;
      let playlistName: string;
      
      // Controlla se è stata specificata una playlist esistente
      if (importData.existingPlaylistId) {
        // Protezione per la playlist "Top Hits" (ID 14)
        if (importData.existingPlaylistId === 14) {
          return res.status(403).json({ message: "Non è possibile importare contenuti nella playlist 'Top Hits'" });
        }
        
        // Verifica che la playlist esista
        const existingPlaylist = await storage.getPlaylist(importData.existingPlaylistId);
        if (!existingPlaylist) {
          return res.status(404).json({ message: "Playlist specificata non trovata" });
        }
        
        playlistId = existingPlaylist.id;
        playlistName = existingPlaylist.name;
        console.log(`[Playlist Import] Adding to existing playlist: ${playlistId}`);
      } else {
        // Crea una nuova playlist per l'utente
        const newPlaylist = await storage.createPlaylist({
          name: importData.playlistName,
          description: importData.description || "",
          user_id: userId
        });
        
        if (!newPlaylist) {
          return res.status(500).json({ message: "Impossibile creare la playlist" });
        }
        
        playlistId = newPlaylist.id;
        playlistName = newPlaylist.name;
        console.log(`[Playlist Import] Created new playlist: ${playlistId}`);
      }
      
      // Ottieni i video dalla playlist YouTube
      const videos = await getPlaylistVideos(importData.playlistId);
      
      if (!videos || videos.length === 0) {
        return res.status(404).json({ message: "Nessun video trovato nella playlist" });
      }
      
      console.log(`[Playlist Import] Found ${videos.length} videos in YouTube playlist`);
      
      // Ottieni il numero attuale di brani nella playlist per determinare la posizione iniziale
      let startPosition = 0;
      if (importData.existingPlaylistId) {
        const existingVideos = await storage.getPlaylistVideos(playlistId);
        startPosition = existingVideos.length;
      }
      
      // Aggiungi ciascun video al database e alla playlist
      const addedVideos = [];
      
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        
        // Controlla se il video esiste già nel database
        let videoInDb = await storage.getVideo(video.id);
        
        // Se non esiste, crealo
        if (!videoInDb) {
          videoInDb = await storage.createVideo(video);
        }
        
        // Aggiungi il video alla playlist con la posizione corretta
        await storage.addVideoToPlaylist({
          playlist_id: playlistId,
          video_id: videoInDb.id,
          position: startPosition + i
        });
        
        addedVideos.push(videoInDb);
      }
      
      return res.status(201).json({
        playlist_id: playlistId,
        videos: addedVideos,
        message: `Importati con successo ${addedVideos.length} video nella playlist "${playlistName}"`
      });
    } catch (error) {
      console.error("Errore durante l'importazione della playlist:", error);
      if (error instanceof ZodError) {
        return handleZodError(error, res);
      }
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      console.error("Dettaglio errore importazione playlist:", errorMessage);
      return res.status(500).json({ message: "Errore durante l'importazione della playlist", error: errorMessage });
    }
  });
  
  // Endpoint per aggiungere un singolo video YouTube a una playlist esistente
  app.post("/api/playlists/add-youtube-video", requireAuth, async (req, res) => {
    try {
      // Parse request body
      const importData = schema.youtubeVideoImportSchema.parse(req.body);
      const userId = req.session.userId;
      
      // Protezione della playlist "Top Hits" (ID 14)
      if (importData.playlistId === 14) {
        return res.status(403).json({ message: "Non è possibile aggiungere video alla playlist 'Top Hits'" });
      }
      
      console.log(`[Video Import] Importing YouTube video: ${importData.videoId} to playlist ${importData.playlistId}`);
      
      // Verifica se la playlist esiste e appartiene all'utente
      const playlist = await storage.getPlaylist(importData.playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist non trovata" });
      }
      
      // Verifica che l'utente sia proprietario della playlist
      if (playlist.user_id !== userId) {
        return res.status(403).json({ message: "Non hai i permessi per modificare questa playlist" });
      }
      
      // Ottieni i dettagli del video da YouTube
      const youtubeVideo = await getYouTubeVideo(importData.videoId);
      
      if (!youtubeVideo) {
        return res.status(404).json({ message: "Video non trovato su YouTube" });
      }
      
      // Controlla se il video esiste già nel database
      let videoInDb = await storage.getVideo(youtubeVideo.id);
      
      // Se non esiste, crealo
      if (!videoInDb) {
        videoInDb = await storage.createVideo(youtubeVideo);
      }
      
      // Verifica se il video è già nella playlist
      const playlistVideos = await storage.getPlaylistVideos(importData.playlistId);
      const isVideoInPlaylist = playlistVideos.some(pv => pv.id === videoInDb.id);
      
      if (isVideoInPlaylist) {
        return res.status(400).json({ message: "Il video è già presente nella playlist" });
      }
      
      // Aggiungi il video alla playlist
      await storage.addVideoToPlaylist({
        playlist_id: importData.playlistId,
        video_id: videoInDb.id,
        position: playlistVideos.length // Aggiungi in fondo
      });
      
      return res.status(200).json({
        playlist: playlist,
        video: videoInDb,
        playlistId: importData.playlistId,
        message: `Video "${videoInDb.title}" aggiunto con successo alla playlist "${playlist.name}"`
      });
    } catch (error) {
      console.error("Errore durante l'aggiunta del video:", error);
      
      // Check if it's a YouTube API quota error
      if (error.message && error.message.includes("Forbidden")) {
        return res.status(429).json({ 
          message: "Limite di quota YouTube API superato. Per favore riprova più tardi.",
          error: "QUOTA_EXCEEDED"
        });
      }
      
      if (error instanceof ZodError) {
        return handleZodError(error, res);
      }
      
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      console.error("Dettaglio errore importazione video:", errorMessage);
      return res.status(500).json({ 
        message: "Errore durante l'aggiunta del video", 
        error: errorMessage 
      });
    }
  });

  app.get("/api/playlists/:id", requireAuth, async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check ownership
      if (playlist.user_id !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      return res.json(playlist);
    } catch (error) {
      console.error("Error getting playlist:", error);
      return res.status(500).json({ message: "Failed to get playlist" });
    }
  });

  app.put("/api/playlists/:id", requireAuth, async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      
      // Protezione della playlist "Top Hits" (ID 14)
      if (playlistId === 14) {
        return res.status(403).json({ message: "La playlist 'Top Hits' non può essere modificata" });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check ownership
      if (playlist.user_id !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const data = z.object({
        name: z.string().optional(),
        description: z.string().optional()
      }).parse(req.body);
      
      const updatedPlaylist = await storage.updatePlaylist(playlistId, data);
      return res.json(updatedPlaylist);
    } catch (error) {
      return handleZodError(error, res);
    }
  });

  app.delete("/api/playlists/:id", requireAuth, async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      
      // Protezione della playlist "Top Hits" (ID 14)
      if (playlistId === 14) {
        return res.status(403).json({ message: "La playlist 'Top Hits' non può essere eliminata" });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check ownership
      if (playlist.user_id !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deletePlaylist(playlistId);
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting playlist:", error);
      return res.status(500).json({ message: "Failed to delete playlist" });
    }
  });

  // Playlist videos
  app.get("/api/playlists/:id/videos", requireAuth, async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check ownership
      if (playlist.user_id !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const videos = await storage.getPlaylistVideos(playlistId);
      return res.json(videos);
    } catch (error) {
      console.error("Error getting playlist videos:", error);
      return res.status(500).json({ message: "Failed to get playlist videos" });
    }
  });

  app.post("/api/playlists/:id/videos", requireAuth, async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      
      // Protezione della playlist "Top Hits" (ID 14)
      if (playlistId === 14) {
        return res.status(403).json({ message: "Non è possibile aggiungere brani alla playlist 'Top Hits'" });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check ownership
      if (playlist.user_id !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { video_id } = z.object({
        video_id: z.string()
      }).parse(req.body);
      
      // Get video from storage or YouTube
      let video = await storage.getVideo(video_id);
      if (!video) {
        const youtubeVideo = await getYouTubeVideo(video_id);
        if (!youtubeVideo) {
          return res.status(404).json({ message: "Video not found" });
        }
        video = await storage.createVideo(youtubeVideo);
      }
      
      // Get current count to determine position
      const currentVideos = await storage.getPlaylistVideos(playlistId);
      const position = currentVideos.length;
      
      await storage.addVideoToPlaylist({
        playlist_id: playlistId,
        video_id,
        position
      });
      
      return res.status(201).json({ message: "Video added to playlist" });
    } catch (error) {
      return handleZodError(error, res);
    }
  });

  app.delete("/api/playlists/:id/videos/:videoId", requireAuth, async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const { videoId } = req.params;
      
      // Protezione della playlist "Top Hits" (ID 14)
      if (playlistId === 14) {
        return res.status(403).json({ message: "Non è possibile rimuovere brani dalla playlist 'Top Hits'" });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check ownership
      if (playlist.user_id !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.removeVideoFromPlaylist(playlistId, videoId);
      return res.status(204).send();
    } catch (error) {
      console.error("Error removing video from playlist:", error);
      return res.status(500).json({ message: "Failed to remove video from playlist" });
    }
  });

  // Favorites
  app.get("/api/favorites", requireAuth, async (req, res) => {
    try {
      const favorites = await storage.getFavorites(req.session.userId);
      return res.json(favorites);
    } catch (error) {
      console.error("Error getting favorites:", error);
      return res.status(500).json({ message: "Failed to get favorites" });
    }
  });

  app.post("/api/favorites", requireAuth, async (req, res) => {
    try {
      const { video_id } = z.object({
        video_id: z.string()
      }).parse(req.body);
      
      // Ensure video exists
      let video = await storage.getVideo(video_id);
      if (!video) {
        const youtubeVideo = await getYouTubeVideo(video_id);
        if (!youtubeVideo) {
          return res.status(404).json({ message: "Video not found" });
        }
        video = await storage.createVideo(youtubeVideo);
      }
      
      await storage.addFavorite({
        user_id: req.session.userId,
        video_id
      });
      
      return res.status(201).json({ message: "Added to favorites" });
    } catch (error) {
      return handleZodError(error, res);
    }
  });

  app.delete("/api/favorites/:id", requireAuth, async (req, res) => {
    try {
      const videoId = req.params.id;
      
      await storage.removeFavorite(req.session.userId, videoId);
      return res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      return res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  // Check if a video is favorited
  app.get("/api/favorites/:id", requireAuth, async (req, res) => {
    try {
      const videoId = req.params.id;
      const isFavorite = await storage.checkFavorite(req.session.userId, videoId);
      
      return res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      return res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Recent plays
  app.get("/api/recent", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const recentPlays = await storage.getRecentPlays(req.session.userId, limit);
      
      return res.json(recentPlays);
    } catch (error) {
      console.error("Error getting recent plays:", error);
      return res.status(500).json({ message: "Failed to get recent plays" });
    }
  });

  app.post("/api/recent", requireAuth, async (req, res) => {
    try {
      const { video_id } = z.object({
        video_id: z.string()
      }).parse(req.body);
      
      // Ensure video exists
      let video = await storage.getVideo(video_id);
      if (!video) {
        const youtubeVideo = await getYouTubeVideo(video_id);
        if (!youtubeVideo) {
          return res.status(404).json({ message: "Video not found" });
        }
        video = await storage.createVideo(youtubeVideo);
      }
      
      await storage.addRecentPlay({
        user_id: req.session.userId,
        video_id
      });
      
      return res.status(201).json({ message: "Added to recent plays" });
    } catch (error) {
      return handleZodError(error, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Utility per gestire controlli relativi ai messaggi di errore di quota YouTube
function isYouTubeQuotaError(error: unknown): boolean {
  return error instanceof Error && 
         error.message && 
         error.message.includes("Forbidden");
}

// Utility per estrarre il messaggio di errore
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Errore sconosciuto";
}
