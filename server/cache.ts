/**
 * Un semplice sistema di cache per le richieste API di YouTube
 * per ridurre il consumo della quota API
 */
import fs from 'fs';
import path from 'path';

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

type CacheMap<T> = Map<string, CacheEntry<T>>;

class APICache {
  private searchCache: CacheMap<any[]>;
  private videoCache: CacheMap<any>;
  public trendingCache: CacheEntry<any[]> | null;
  private cacheDuration: number; // durata della cache in millisecondi

  constructor(cacheDurationMinutes: number = 30) {
    this.searchCache = new Map();
    this.videoCache = new Map();
    this.trendingCache = null;
    this.cacheDuration = cacheDurationMinutes * 60 * 1000;
  }

  /**
   * Salva i risultati di ricerca nella cache
   */
  saveSearchResults(query: string, results: any[]): void {
    this.searchCache.set(query.toLowerCase().trim(), {
      data: results,
      timestamp: Date.now()
    });
  }

  /**
   * Ottiene i risultati di ricerca dalla cache se disponibili e validi
   */
  getSearchResults(query: string): any[] | null {
    const key = query.toLowerCase().trim();
    const entry = this.searchCache.get(key);
    
    if (entry && Date.now() - entry.timestamp < this.cacheDuration) {
      return entry.data;
    }
    
    // Rimuovi la voce scaduta
    if (entry) {
      this.searchCache.delete(key);
    }
    
    return null;
  }

  /**
   * Salva i dettagli del video nella cache
   */
  saveVideoDetails(videoId: string, videoDetails: any): void {
    this.videoCache.set(videoId, {
      data: videoDetails,
      timestamp: Date.now()
    });
  }

  /**
   * Ottiene i dettagli del video dalla cache se disponibili e validi
   */
  getVideoDetails(videoId: string): any | null {
    const entry = this.videoCache.get(videoId);
    
    if (entry && Date.now() - entry.timestamp < this.cacheDuration) {
      return entry.data;
    }
    
    // Rimuovi la voce scaduta
    if (entry) {
      this.videoCache.delete(videoId);
    }
    
    return null;
  }

  /**
   * Salva i video di tendenza nella cache
   */
  saveTrendingVideos(videos: any[]): void {
    this.trendingCache = {
      data: videos,
      timestamp: Date.now()
    };
  }

  /**
   * Ottiene i video di tendenza dalla cache se disponibili e validi
   */
  getTrendingVideos(): any[] | null {
    if (this.trendingCache && Date.now() - this.trendingCache.timestamp < this.cacheDuration) {
      return this.trendingCache.data;
    }
    
    this.trendingCache = null;
    return null;
  }

  /**
   * Pulisce tutte le voci di cache scadute
   */
  cleanupCache(): void {
    const now = Date.now();
    
    // Pulisci cache di ricerca
    this.searchCache.forEach((entry, key) => {
      if (now - entry.timestamp >= this.cacheDuration) {
        this.searchCache.delete(key);
      }
    });
    
    // Pulisci cache video
    this.videoCache.forEach((entry, key) => {
      if (now - entry.timestamp >= this.cacheDuration) {
        this.videoCache.delete(key);
      }
    });
    
    // Pulisci cache tendenze
    if (this.trendingCache && now - this.trendingCache.timestamp >= this.cacheDuration) {
      this.trendingCache = null;
    }
  }

  /**
   * Imposta la durata della cache
   */
  setCacheDuration(minutes: number): void {
    this.cacheDuration = minutes * 60 * 1000;
  }
}

// Funzione per determinare se è il momento di aggiornare la cache tendenze (alle 12:00 e 00:00)
function shouldRefreshTrendingCache(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Aggiorna alle 12:00 e 00:00 con una tolleranza di 5 minuti
  return (hour === 0 || hour === 12) && minute < 5;
}

/**
 * Funzione per salvare query di ricerca recenti
 * Mantiene un array delle ultime queries usate dagli utenti
 * Salva su disco per persistenza tra riavvii del server
 */

export class RecentSearchesManager {
  private static readonly MAX_RECENT_SEARCHES = 20;
  private static instance: RecentSearchesManager;
  private recentSearches: string[] = [];
  private dataPath: string;
  
  private constructor() {
    // Percorso per salvare i dati
    this.dataPath = path.join(process.cwd(), 'data', 'recent_searches.json');
    this.loadFromDisk();
  }
  
  public static getInstance(): RecentSearchesManager {
    if (!RecentSearchesManager.instance) {
      RecentSearchesManager.instance = new RecentSearchesManager();
    }
    return RecentSearchesManager.instance;
  }

  /**
   * Carica le ricerche recenti dal disco
   */
  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf-8');
        this.recentSearches = JSON.parse(data);
        console.log(`Caricate ${this.recentSearches.length} ricerche recenti dal disco`);
      } else {
        console.log('File delle ricerche recenti non trovato, verrà creato al primo salvataggio');
      }
    } catch (error) {
      console.error('Errore nel caricamento delle ricerche recenti:', error);
      // Se c'è un errore, inizializza un array vuoto
      this.recentSearches = [];
    }
  }

  /**
   * Salva le ricerche recenti su disco
   */
  private saveToDisk(): void {
    try {
      const dirPath = path.dirname(this.dataPath);
      
      // Assicurati che la directory esista
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      fs.writeFileSync(this.dataPath, JSON.stringify(this.recentSearches), 'utf-8');
    } catch (error) {
      console.error('Errore nel salvataggio delle ricerche recenti:', error);
    }
  }
  
  public addSearch(query: string): void {
    query = query.trim().toLowerCase();
    
    // Non aggiungere se vuoto o troppo corto
    if (!query || query.length < 2) return;
    
    // Rimuovi se già presente per evitare duplicati
    this.recentSearches = this.recentSearches.filter(q => q !== query);
    
    // Aggiungi all'inizio dell'array
    this.recentSearches.unshift(query);
    
    // Limita il numero di ricerche recenti
    if (this.recentSearches.length > RecentSearchesManager.MAX_RECENT_SEARCHES) {
      this.recentSearches = this.recentSearches.slice(0, RecentSearchesManager.MAX_RECENT_SEARCHES);
    }
    
    // Salva su disco dopo ogni modifica
    this.saveToDisk();
  }
  
  public getRecentSearches(limit: number = 5): string[] {
    return this.recentSearches.slice(0, limit);
  }
}

// Esporta le istanze per tutta l'applicazione
export const youtubeCache = new APICache(24 * 60); // Cache valida per 24 ore
export const recentSearches = RecentSearchesManager.getInstance();

// Avvia un timer per pulire periodicamente la cache e controllare gli aggiornamenti di trending
setInterval(() => {
  youtubeCache.cleanupCache();
  
  // Se è il momento di aggiornare la cache dei trending videos, impostala a null
  if (shouldRefreshTrendingCache()) {
    console.log('Aggiornamento programmato della cache trending videos alle 12:00/00:00');
    youtubeCache.trendingCache = null;
  }
}, 5 * 60 * 1000); // Controlla ogni 5 minuti