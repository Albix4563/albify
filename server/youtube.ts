import type { Video } from '@shared/schema';
import { youtubeCache, recentSearches } from './cache';

/**
 * Sistema di gestione delle API key con rotazione automatica
 * Supporta da 1 a 4 chiavi API e cambia automaticamente quando una esaurisce la quota
 */
class YouTubeApiKeyManager {
  private keys: string[] = [];
  private currentKeyIndex: number = 0;
  private keysStatus: Map<string, boolean> = new Map(); // true = attiva, false = quota esaurita
  
  constructor() {
    // Carica le chiavi API dalle variabili d'ambiente
    this.loadApiKeys();
    console.log(`[API Key Manager] Inizializzato con ${this.keys.length} chiavi API`);
  }
  
  /**
   * Carica le chiavi API dalle variabili d'ambiente
   * Supporta 4 chiavi, ma funziona anche con meno
   */
  private loadApiKeys(): void {
    // Verifica e carica ogni chiave se disponibile
    for (let i = 1; i <= 4; i++) {
      const keyEnvVar = `YOUTUBE_API_KEY_${i}`;
      const apiKey = process.env[keyEnvVar];
      
      if (apiKey) {
        this.keys.push(apiKey);
        this.keysStatus.set(apiKey, true); // Imposta la chiave come attiva
      }
    }
    
    // Controlla che ci sia almeno una chiave
    if (this.keys.length === 0) {
      throw new Error('Nessuna chiave API YouTube disponibile nelle variabili d\'ambiente');
    }
  }
  
  /**
   * Ottiene la chiave API corrente
   */
  public getCurrentKey(): string {
    return this.keys[this.currentKeyIndex];
  }
  
  /**
   * Passa alla chiave API successiva
   * Ritorna la nuova chiave attiva
   */
  public rotateKey(): string {
    const oldKeyIndex = this.currentKeyIndex;
    
    // Trova la prossima chiave attiva
    let foundActive = false;
    let loopCount = 0;
    
    while (!foundActive && loopCount < this.keys.length) {
      // Passa alla chiave successiva (con rotazione circolare)
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      
      // Controlla se questa chiave è attiva
      if (this.keysStatus.get(this.keys[this.currentKeyIndex])) {
        foundActive = true;
      }
      
      loopCount++;
    }
    
    // Se abbiamo fatto il giro completo e non abbiamo trovato chiavi attive
    // resettiamo lo stato di tutte le chiavi (magari sono state resettate le quote)
    if (!foundActive) {
      console.log('[API Key Manager] Tutte le chiavi hanno esaurito la quota, reset dello stato');
      this.keys.forEach(key => this.keysStatus.set(key, true));
    }
    
    const newKey = this.keys[this.currentKeyIndex];
    console.log(`[API Key Manager] Rotazione da chiave ${oldKeyIndex+1} a chiave ${this.currentKeyIndex+1}`);
    return newKey;
  }
  
  /**
   * Segna una chiave come con quota esaurita
   */
  public markKeyAsExhausted(key: string): void {
    if (this.keysStatus.has(key)) {
      console.log(`[API Key Manager] Quota esaurita per la chiave ${this.currentKeyIndex+1}`);
      this.keysStatus.set(key, false);
    }
  }
  
  /**
   * Verifica se tutte le chiavi hanno esaurito la quota
   */
  public allKeysExhausted(): boolean {
    // Controlla se almeno una chiave è attiva
    let allExhausted = true;
    this.keysStatus.forEach((status) => {
      if (status === true) {
        allExhausted = false;
      }
    });
    return allExhausted;
  }
  
  /**
   * Ottiene statistiche sull'utilizzo delle chiavi
   */
  public getStats(): { total: number, active: number, exhausted: number } {
    let active = 0;
    this.keysStatus.forEach((status) => {
      if (status === true) {
        active++;
      }
    });
    
    return {
      total: this.keys.length,
      active,
      exhausted: this.keys.length - active
    };
  }
}

// Crea un'istanza del gestore delle chiavi API
const apiKeyManager = new YouTubeApiKeyManager();

/**
 * Funzione wrapper per fetch che gestisce la rotazione delle API key
 * Rileva automaticamente errori di quota esaurita e passa alla chiave successiva
 */
async function fetchWithApiKeyRotation(url: string, includingKey: boolean = false): Promise<Response> {
  // Se l'URL già include la chiave, usa direttamente
  if (includingKey) {
    const response = await fetch(url);
    return response;
  }
  
  // Ottieni la chiave corrente
  let apiKey = apiKeyManager.getCurrentKey();
  const fullUrl = `${url}&key=${apiKey}`;
  
  try {
    const response = await fetch(fullUrl);
    
    // Se la risposta non è ok, controlla se è un errore di quota
    if (!response.ok && response.status === 403) {
      // Clone della risposta per poter leggere il corpo più volte
      const responseClone = response.clone();
      const errorData = await responseClone.json();
      
      // Controlla se l'errore è dovuto a quota esaurita
      if (errorData.error && 
          (errorData.error.message?.includes("quota") || 
           errorData.error.message?.includes("Quota") ||
           errorData.error.message?.includes("exceeded"))) {
        
        console.log("[API Key Manager] Errore di quota esaurita rilevato, passaggio a chiave successiva");
        
        // Segna questa chiave come esaurita
        apiKeyManager.markKeyAsExhausted(apiKey);
        
        // Prova con la chiave successiva
        apiKey = apiKeyManager.rotateKey();
        
        // Se tutte le chiavi sono esaurite, restituisci comunque l'errore originale
        if (apiKeyManager.allKeysExhausted()) {
          console.error("[API Key Manager] Tutte le chiavi API hanno esaurito la quota!");
          return response;
        }
        
        // Riprova la richiesta con la nuova chiave
        const newUrl = `${url}&key=${apiKey}`;
        return fetchWithApiKeyRotation(newUrl, true);
      }
    }
    
    return response;
  } catch (error) {
    console.error("Errore durante la richiesta all'API di YouTube:", error);
    throw error;
  }
}

// Define YouTube search response interfaces
interface YouTubeThumbnails {
  default?: { url: string; width: number; height: number };
  medium?: { url: string; width: number; height: number };
  high?: { url: string; width: number; height: number };
}

interface YouTubeSearchItem {
  id: {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
    liveBroadcastContent: string;
  };
  contentDetails?: {
    duration: string;
  };
}

interface YouTubeSearchResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  regionCode: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeSearchItem[];
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
    categoryId: string;
    liveBroadcastContent: string;
    defaultLanguage?: string;
    localized: {
      title: string;
      description: string;
    };
  };
  contentDetails: {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    contentRating: Record<string, any>;
    projection: string;
  };
}

interface YouTubeVideosResponse {
  kind: string;
  etag: string;
  items: YouTubeVideoItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

// Parse YouTube ISO 8601 duration to seconds
function parseDuration(duration: string): string {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);
  
  if (!matches) {
    return '0:00';
  }
  
  const hours = parseInt(matches[1] || '0');
  const minutes = parseInt(matches[2] || '0');
  const seconds = parseInt(matches[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Search YouTube videos
export async function searchYouTubeVideos(query: string): Promise<Video[]> {
  try {
    // Aggiungi la query alle ricerche recenti
    recentSearches.addSearch(query);
    
    // Prima controlla nella cache
    const cachedResults = youtubeCache.getSearchResults(query);
    if (cachedResults) {
      console.log(`Usando i risultati in cache per la ricerca "${query}"`);
      return cachedResults;
    }
    
    // First search for videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query)}&type=video`;
    
    const searchResponse = await fetchWithApiKeyRotation(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`YouTube API search error: ${searchResponse.statusText}`);
    }
    
    const searchData: YouTubeSearchResponse = await searchResponse.json();
    
    // Get video IDs for contentDetails request
    const videoIds = searchData.items
      .filter(item => item.id.videoId)
      .map(item => item.id.videoId);
    
    if (videoIds.length === 0) {
      return [];
    }
    
    // Get video details including duration
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds.join(',')}`;
    
    const videoDetailsResponse = await fetchWithApiKeyRotation(videoDetailsUrl);
    if (!videoDetailsResponse.ok) {
      throw new Error(`YouTube API video details error: ${videoDetailsResponse.statusText}`);
    }
    
    const videoDetailsData: YouTubeVideosResponse = await videoDetailsResponse.json();
    
    // Map the response to our Video schema
    const results = videoDetailsData.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      channel_title: item.snippet.channelTitle,
      duration: parseDuration(item.contentDetails.duration),
    }));
    
    // Salva i risultati nella cache
    youtubeCache.saveSearchResults(query, results);
    
    return results;
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    throw error;
  }
}

// Get details of a specific YouTube video
export async function getYouTubeVideo(videoId: string): Promise<Video | null> {
  try {
    // Prima controlla nella cache
    const cachedVideo = youtubeCache.getVideoDetails(videoId);
    if (cachedVideo) {
      console.log(`Usando i dettagli in cache per il video "${videoId}"`);
      return cachedVideo;
    }
    
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}`;
    
    const response = await fetchWithApiKeyRotation(url);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }
    
    const data: YouTubeVideosResponse = await response.json();
    
    if (data.items.length === 0) {
      return null;
    }
    
    const item = data.items[0];
    
    const videoDetails = {
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      channel_title: item.snippet.channelTitle,
      duration: parseDuration(item.contentDetails.duration),
    };
    
    // Salva il video nella cache
    youtubeCache.saveVideoDetails(videoId, videoDetails);
    
    return videoDetails;
  } catch (error) {
    console.error('Error getting YouTube video:', error);
    throw error;
  }
}

/**
 * Verifica se un ID o URL è una playlist YouTube valida
 * @param input ID o URL della playlist YouTube
 * @returns true se è una playlist valida, false altrimenti
 */
export async function isValidPlaylist(input: string): Promise<boolean> {
  try {
    // Estrai l'ID della playlist se è un URL completo
    let playlistId = input;
    
    // Cerca il parametro "list" se è un URL
    if (input.includes('youtube.com') || input.includes('youtu.be')) {
      try {
        const url = new URL(input);
        const listParam = url.searchParams.get('list');
        if (listParam) {
          playlistId = listParam;
        } else {
          return false; // Nessun parametro "list" trovato
        }
      } catch (e) {
        // Se non è un URL valido, usa l'input originale
      }
    }
    
    // Verifica la playlist con l'API di YouTube
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&maxResults=1`;
    const response = await fetchWithApiKeyRotation(url);
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.items && data.items.length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Ottiene i video da una playlist YouTube
 * @param playlistId ID della playlist YouTube
 * @returns Array di oggetti Video contenuti nella playlist
 */
export async function getPlaylistVideos(playlistId: string): Promise<Video[]> {
  try {
    // Verifica se l'ID della playlist è valido
    if (!playlistId) {
      throw new Error('ID playlist non valido');
    }
    
    // Estrai l'ID della playlist se è un URL completo
    if (playlistId.includes('youtube.com') || playlistId.includes('youtu.be')) {
      try {
        const url = new URL(playlistId);
        const listParam = url.searchParams.get('list');
        if (listParam) {
          playlistId = listParam;
          console.log(`Estratto ID playlist: ${playlistId} dall'URL`);
        } else {
          throw new Error('L\'URL fornito non contiene un ID di playlist valido (parametro "list")');
        }
      } catch (e) {
        throw new Error('L\'URL fornito non è valido o non contiene un ID di playlist');
      }
    }
    
    // Verifica che sia effettivamente una playlist
    const isPlaylist = await isValidPlaylist(playlistId);
    if (!isPlaylist) {
      throw new Error('L\'ID fornito non corrisponde a una playlist YouTube valida. Assicurati di fornire l\'URL di una playlist e non di un singolo video.');
    }
    
    const videos: Video[] = [];
    let nextPageToken: string | undefined = undefined;
    
    // Continua a richiedere pagine finché non ci sono più risultati
    do {
      // Costruisci l'URL per ottenere gli elementi della playlist
      let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}`;
      
      // Aggiungi il token della pagina successiva se disponibile
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }
      
      // Esegui la richiesta API
      const response = await fetchWithApiKeyRotation(url);
      
      if (!response.ok) {
        throw new Error(`Errore API YouTube: ${response.statusText}`);
      }
      
      const data = await response.json();
      nextPageToken = data.nextPageToken;
      
      // Estrai gli ID video per ottenere ulteriori dettagli
      const videoIds = data.items
        .filter((item: any) => item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId)
        .map((item: any) => item.snippet.resourceId.videoId);
      
      if (videoIds.length > 0) {
        // Ottieni dettagli completi per ogni video
        const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}`;
        const videoDetailsResponse = await fetchWithApiKeyRotation(videoDetailsUrl);
        
        if (!videoDetailsResponse.ok) {
          throw new Error(`Errore dettagli video API YouTube: ${videoDetailsResponse.statusText}`);
        }
        
        const videoDetailsData: YouTubeVideosResponse = await videoDetailsResponse.json();
        
        // Converti i dati nel formato Video
        const pageVideos = videoDetailsData.items.map(item => ({
          id: item.id,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
          channel_title: item.snippet.channelTitle,
          duration: parseDuration(item.contentDetails.duration),
        }));
        
        // Aggiungi i video all'array risultante
        videos.push(...pageVideos);
      }
      
      // Continua finché c'è un token per la pagina successiva
    } while (nextPageToken);
    
    return videos;
  } catch (error) {
    console.error('Errore durante il recupero dei video della playlist:', error);
    throw error;
  }
}

// Get trending music videos
export async function getTrendingMusicVideos(): Promise<Video[]> {
  try {
    // Prima controlla nella cache
    const cachedTrending = youtubeCache.getTrendingVideos();
    if (cachedTrending) {
      console.log(`Usando i video di tendenza dalla cache`);
      return cachedTrending;
    }
    
    // Use chart=mostPopular and videoCategoryId=10 for music
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&chart=mostPopular&videoCategoryId=10&maxResults=20`;
    
    const response = await fetchWithApiKeyRotation(url);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }
    
    const data: YouTubeVideosResponse = await response.json();
    
    const trendingVideos = data.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      channel_title: item.snippet.channelTitle,
      duration: parseDuration(item.contentDetails.duration),
    }));
    
    // Salva i video di tendenza nella cache
    youtubeCache.saveTrendingVideos(trendingVideos);
    
    return trendingVideos;
  } catch (error) {
    console.error('Error getting trending music videos:', error);
    throw error;
  }
}
