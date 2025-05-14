import { eq, and, desc } from "drizzle-orm";
import * as fs from 'fs';
import * as path from 'path';
import * as schema from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<schema.User | undefined>;
  getUserByEmail(email: string): Promise<schema.User | undefined>;
  createUser(user: schema.InsertUser): Promise<schema.User>;
  
  // Playlist operations
  getPlaylists(userId: number): Promise<schema.Playlist[]>;
  getPlaylist(id: number): Promise<schema.Playlist | undefined>;
  createPlaylist(playlist: schema.InsertPlaylist): Promise<schema.Playlist>;
  updatePlaylist(id: number, playlist: Partial<schema.InsertPlaylist>): Promise<schema.Playlist | undefined>;
  deletePlaylist(id: number): Promise<void>;
  
  // Video operations
  getVideo(id: string): Promise<schema.Video | undefined>;
  createVideo(video: schema.InsertVideo): Promise<schema.Video>;
  
  // Playlist video operations
  getPlaylistVideos(playlistId: number): Promise<(schema.Video & { position: number })[]>;
  addVideoToPlaylist(playlistVideo: schema.InsertPlaylistVideo): Promise<void>;
  removeVideoFromPlaylist(playlistId: number, videoId: string): Promise<void>;
  updateVideoPosition(playlistId: number, videoId: string, position: number): Promise<void>;
  
  // Favorite operations
  getFavorites(userId: number): Promise<schema.Video[]>;
  addFavorite(favorite: schema.InsertFavorite): Promise<void>;
  removeFavorite(userId: number, videoId: string): Promise<void>;
  checkFavorite(userId: number, videoId: string): Promise<boolean>;
  
  // Recent plays operations
  getRecentPlays(userId: number, limit?: number): Promise<schema.Video[]>;
  addRecentPlay(recentPlay: schema.InsertRecentPlay): Promise<void>;
  
  // Database testing
  testDatabaseTables?(): Promise<any>;
}

// Classe JSON File Storage
export class JsonFileStorage implements IStorage {
  private dataDir: string;
  private usersFile: string;
  private playlistsFile: string;
  private videosFile: string;
  private playlistVideosFile: string;
  private favoritesFile: string;
  private recentPlaysFile: string;
  
  private users: Map<number, schema.User>;
  private playlists: Map<number, schema.Playlist>;
  private videos: Map<string, schema.Video>;
  private playlistVideos: Map<string, schema.PlaylistVideo[]>;
  private favorites: Map<string, schema.Favorite[]>;
  private recentPlays: Map<string, schema.RecentPlay[]>;
  
  private userIdCounter: number;
  private playlistIdCounter: number;
  
  private backupDir: string;
  private backupInterval: NodeJS.Timeout | null;
  private lastBackupTime: Date;
  
  constructor() {
    // Inizializzazione directory e file
    this.dataDir = path.join(process.cwd(), 'data');
    this.backupDir = path.join(process.cwd(), 'data_backup');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.playlistsFile = path.join(this.dataDir, 'playlists.json');
    this.videosFile = path.join(this.dataDir, 'videos.json');
    this.playlistVideosFile = path.join(this.dataDir, 'playlist_videos.json');
    this.favoritesFile = path.join(this.dataDir, 'favorites.json');
    this.recentPlaysFile = path.join(this.dataDir, 'recent_plays.json');
    
    // Inizializzazione strutture dati
    this.users = new Map();
    this.playlists = new Map();
    this.videos = new Map();
    this.playlistVideos = new Map();
    this.favorites = new Map();
    this.recentPlays = new Map();
    
    this.userIdCounter = 1;
    this.playlistIdCounter = 1;
    this.backupInterval = null;
    this.lastBackupTime = new Date();
    
    // Creazione directory se non esiste
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log("[FileStorage] Directory dati creata:", this.dataDir);
    }
    
    // Creazione directory backup se non esiste
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log("[FileStorage] Directory backup creata:", this.backupDir);
    }
    
    // Caricamento dati
    this.loadData();
    
    // Avvio backup automatico ogni 30 minuti
    this.startAutomaticBackup();
    
    console.log("[FileStorage] Storage JSON inizializzato con successo");
  }
  
  // Metodi privati per gestione file
  
  private startAutomaticBackup(): void {
    // Backup iniziale
    this.createBackup();
    
    // Imposta backup automatico ogni 30 minuti
    this.backupInterval = setInterval(() => {
      this.createBackup();
    }, 30 * 60 * 1000); // 30 minuti in millisecondi
    
    console.log("[FileStorage] Backup automatico attivato (ogni 30 minuti)");
  }
  
  private createBackup(): void {
    try {
      const now = new Date();
      const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/g, '');
      const backupFolderName = `backup_${timestamp}`;
      const backupPath = path.join(this.backupDir, backupFolderName);
      
      // Crea directory per questo backup
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      // Copia tutti i file JSON nella directory di backup
      if (fs.existsSync(this.usersFile)) {
        fs.copyFileSync(this.usersFile, path.join(backupPath, 'users.json'));
      }
      if (fs.existsSync(this.playlistsFile)) {
        fs.copyFileSync(this.playlistsFile, path.join(backupPath, 'playlists.json'));
      }
      if (fs.existsSync(this.videosFile)) {
        fs.copyFileSync(this.videosFile, path.join(backupPath, 'videos.json'));
      }
      if (fs.existsSync(this.playlistVideosFile)) {
        fs.copyFileSync(this.playlistVideosFile, path.join(backupPath, 'playlist_videos.json'));
      }
      if (fs.existsSync(this.favoritesFile)) {
        fs.copyFileSync(this.favoritesFile, path.join(backupPath, 'favorites.json'));
      }
      if (fs.existsSync(this.recentPlaysFile)) {
        fs.copyFileSync(this.recentPlaysFile, path.join(backupPath, 'recent_plays.json'));
      }
      
      // Mantieni solo gli ultimi 10 backup
      this.cleanOldBackups();
      
      this.lastBackupTime = now;
      console.log(`[FileStorage] Backup completato: ${backupFolderName}`);
    } catch (error) {
      console.error("[FileStorage] Errore durante il backup:", error);
    }
  }
  
  private cleanOldBackups(): void {
    try {
      // Ottieni tutte le directory di backup
      const backupDirs = fs.readdirSync(this.backupDir)
        .filter(name => name.startsWith('backup_'))
        .map(name => ({
          name,
          path: path.join(this.backupDir, name),
          time: new Date(name.replace('backup_', '').replace(/-/g, ':')).getTime()
        }))
        .sort((a, b) => b.time - a.time); // Ordina dal più recente al più vecchio
      
      // Rimuovi backup più vecchi se ce ne sono più di 10
      if (backupDirs.length > 10) {
        const oldBackups = backupDirs.slice(10);
        for (const backup of oldBackups) {
          this.removeDirectory(backup.path);
          console.log(`[FileStorage] Rimosso backup vecchio: ${backup.name}`);
        }
      }
    } catch (error) {
      console.error("[FileStorage] Errore nella pulizia dei backup vecchi:", error);
    }
  }
  
  private removeDirectory(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach(file => {
        const curPath = path.join(dirPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          this.removeDirectory(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(dirPath);
    }
  }
  
  private loadData(): void {
    // Caricamento Users
    if (fs.existsSync(this.usersFile)) {
      const data = JSON.parse(fs.readFileSync(this.usersFile, 'utf8'));
      this.users = new Map(Object.entries(data.users).map(([k, v]) => [Number(k), v as schema.User]));
      this.userIdCounter = data.userIdCounter;
      console.log(`[FileStorage] Caricati ${this.users.size} utenti`);
    } else {
      this.saveUsers();
    }
    
    // Caricamento Playlists
    if (fs.existsSync(this.playlistsFile)) {
      const data = JSON.parse(fs.readFileSync(this.playlistsFile, 'utf8'));
      this.playlists = new Map(Object.entries(data.playlists).map(([k, v]) => [Number(k), v as schema.Playlist]));
      this.playlistIdCounter = data.playlistIdCounter;
      console.log(`[FileStorage] Caricate ${this.playlists.size} playlist`);
    } else {
      this.savePlaylists();
    }
    
    // Caricamento Videos
    if (fs.existsSync(this.videosFile)) {
      const data = JSON.parse(fs.readFileSync(this.videosFile, 'utf8'));
      this.videos = new Map(Object.entries(data));
      console.log(`[FileStorage] Caricati ${this.videos.size} video`);
    } else {
      this.saveVideos();
    }
    
    // Caricamento PlaylistVideos
    if (fs.existsSync(this.playlistVideosFile)) {
      const data = JSON.parse(fs.readFileSync(this.playlistVideosFile, 'utf8'));
      this.playlistVideos = new Map(Object.entries(data));
      console.log(`[FileStorage] Caricate ${this.playlistVideos.size} associazioni playlist-video`);
    } else {
      this.savePlaylistVideos();
    }
    
    // Caricamento Favorites
    if (fs.existsSync(this.favoritesFile)) {
      const data = JSON.parse(fs.readFileSync(this.favoritesFile, 'utf8'));
      this.favorites = new Map(Object.entries(data));
      console.log(`[FileStorage] Caricati ${this.favorites.size} preferiti`);
    } else {
      this.saveFavorites();
    }
    
    // Caricamento RecentPlays
    if (fs.existsSync(this.recentPlaysFile)) {
      const data = JSON.parse(fs.readFileSync(this.recentPlaysFile, 'utf8'));
      this.recentPlays = new Map(Object.entries(data));
      console.log(`[FileStorage] Caricate ${this.recentPlays.size} riproduzioni recenti`);
    } else {
      this.saveRecentPlays();
    }
  }
  
  private saveUsers(): void {
    const data = {
      users: Object.fromEntries(this.users),
      userIdCounter: this.userIdCounter
    };
    fs.writeFileSync(this.usersFile, JSON.stringify(data, null, 2));
  }
  
  private savePlaylists(): void {
    const data = {
      playlists: Object.fromEntries(this.playlists),
      playlistIdCounter: this.playlistIdCounter
    };
    fs.writeFileSync(this.playlistsFile, JSON.stringify(data, null, 2));
  }
  
  private saveVideos(): void {
    fs.writeFileSync(this.videosFile, JSON.stringify(Object.fromEntries(this.videos), null, 2));
  }
  
  private savePlaylistVideos(): void {
    fs.writeFileSync(this.playlistVideosFile, JSON.stringify(Object.fromEntries(this.playlistVideos), null, 2));
  }
  
  private saveFavorites(): void {
    fs.writeFileSync(this.favoritesFile, JSON.stringify(Object.fromEntries(this.favorites), null, 2));
  }
  
  private saveRecentPlays(): void {
    fs.writeFileSync(this.recentPlaysFile, JSON.stringify(Object.fromEntries(this.recentPlays), null, 2));
  }
  
  // Implementazione IStorage
  
  async getUser(id: number): Promise<schema.User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }
  
  async createUser(user: schema.InsertUser): Promise<schema.User> {
    const id = this.userIdCounter++;
    const created_at = new Date();
    const newUser = {
      id,
      created_at,
      ...user,
      avatar_url: user.avatar_url || null
    };
    this.users.set(id, newUser);
    this.saveUsers();
    return newUser;
  }
  
  async getPlaylists(userId: number): Promise<schema.Playlist[]> {
    const userPlaylists: schema.Playlist[] = [];
    for (const playlist of this.playlists.values()) {
      if (playlist.user_id === userId) {
        userPlaylists.push(playlist);
      }
    }
    return userPlaylists;
  }
  
  async getPlaylist(id: number): Promise<schema.Playlist | undefined> {
    return this.playlists.get(id);
  }
  
  async createPlaylist(playlist: schema.InsertPlaylist): Promise<schema.Playlist> {
    const id = this.playlistIdCounter++;
    const created_at = new Date();
    const newPlaylist = {
      id,
      created_at,
      ...playlist,
      description: playlist.description || null
    };
    this.playlists.set(id, newPlaylist);
    this.savePlaylists();
    return newPlaylist;
  }
  
  async updatePlaylist(id: number, playlist: Partial<schema.InsertPlaylist>): Promise<schema.Playlist | undefined> {
    const existingPlaylist = this.playlists.get(id);
    if (!existingPlaylist) {
      return undefined;
    }
    
    const updatedPlaylist = {
      ...existingPlaylist,
      ...playlist,
      description: playlist.description || existingPlaylist.description
    };
    this.playlists.set(id, updatedPlaylist);
    this.savePlaylists();
    return updatedPlaylist;
  }
  
  async deletePlaylist(id: number): Promise<void> {
    this.playlists.delete(id);
    this.savePlaylists();
    
    // Elimina anche i video associati alla playlist
    const key = id.toString();
    if (this.playlistVideos.has(key)) {
      this.playlistVideos.delete(key);
      this.savePlaylistVideos();
    }
  }
  
  async getVideo(id: string): Promise<schema.Video | undefined> {
    return this.videos.get(id);
  }
  
  async createVideo(video: schema.InsertVideo): Promise<schema.Video> {
    // Controlla se il video esiste già
    const existingVideo = this.videos.get(video.id);
    if (existingVideo) {
      return existingVideo;
    }
    
    // Crea nuovo video
    const newVideo = {
      ...video,
      duration: video.duration || null
    };
    this.videos.set(video.id, newVideo);
    this.saveVideos();
    return newVideo;
  }
  
  async getPlaylistVideos(playlistId: number): Promise<(schema.Video & { position: number })[]> {
    const key = playlistId.toString();
    const playlistVideos = this.playlistVideos.get(key) || [];
    const results: (schema.Video & { position: number })[] = [];
    
    for (const pv of playlistVideos) {
      const video = this.videos.get(pv.video_id);
      if (video) {
        results.push({
          ...video,
          position: pv.position
        });
      }
    }
    
    // Ordina per posizione
    return results.sort((a, b) => a.position - b.position);
  }
  
  async addVideoToPlaylist(playlistVideo: schema.InsertPlaylistVideo): Promise<void> {
    const key = playlistVideo.playlist_id.toString();
    const playlistVideos = this.playlistVideos.get(key) || [];
    
    // Controlla se il video è già nella playlist
    const exists = playlistVideos.some(pv => pv.video_id === playlistVideo.video_id);
    if (exists) {
      return;
    }
    
    // Trova la posizione massima
    let maxPos = 0;
    for (const pv of playlistVideos) {
      if (pv.position > maxPos) {
        maxPos = pv.position;
      }
    }
    
    // Crea nuovo playlistVideo
    const newPlaylistVideo = {
      ...playlistVideo,
      position: maxPos + 1,
      created_at: new Date()
    };
    
    playlistVideos.push(newPlaylistVideo);
    this.playlistVideos.set(key, playlistVideos);
    this.savePlaylistVideos();
  }
  
  async removeVideoFromPlaylist(playlistId: number, videoId: string): Promise<void> {
    const key = playlistId.toString();
    const playlistVideos = this.playlistVideos.get(key) || [];
    
    // Trova e rimuovi il video
    const updatedPlaylistVideos = playlistVideos.filter(pv => pv.video_id !== videoId);
    
    // Se nessun video è stato rimosso, esci
    if (updatedPlaylistVideos.length === playlistVideos.length) {
      return;
    }
    
    // Riordina le posizioni
    updatedPlaylistVideos.sort((a, b) => a.position - b.position);
    for (let i = 0; i < updatedPlaylistVideos.length; i++) {
      updatedPlaylistVideos[i].position = i + 1;
    }
    
    this.playlistVideos.set(key, updatedPlaylistVideos);
    this.savePlaylistVideos();
  }
  
  async updateVideoPosition(playlistId: number, videoId: string, position: number): Promise<void> {
    const key = playlistId.toString();
    const playlistVideos = this.playlistVideos.get(key) || [];
    
    // Verifica se la posizione è valida
    if (position < 1 || position > playlistVideos.length) {
      throw new Error(`Invalid position: ${position}. Must be between 1 and ${playlistVideos.length}`);
    }
    
    // Trova il video da spostare
    const videoIndex = playlistVideos.findIndex(pv => pv.video_id === videoId);
    if (videoIndex === -1) {
      throw new Error("Video not found in playlist");
    }
    
    const videoToMove = playlistVideos[videoIndex];
    const oldPosition = videoToMove.position;
    
    // Se la posizione è la stessa, esci
    if (oldPosition === position) {
      return;
    }
    
    // Riordina gli altri video
    if (oldPosition < position) {
      // Sposta verso il basso
      for (const pv of playlistVideos) {
        if (pv.position > oldPosition && pv.position <= position) {
          pv.position--;
        }
      }
    } else {
      // Sposta verso l'alto
      for (const pv of playlistVideos) {
        if (pv.position >= position && pv.position < oldPosition) {
          pv.position++;
        }
      }
    }
    
    // Aggiorna la posizione del video spostato
    videoToMove.position = position;
    
    this.savePlaylistVideos();
  }
  
  async getFavorites(userId: number): Promise<schema.Video[]> {
    const key = userId.toString();
    const userFavorites = this.favorites.get(key) || [];
    const results: schema.Video[] = [];
    
    for (const favorite of userFavorites) {
      const video = this.videos.get(favorite.video_id);
      if (video) {
        results.push(video);
      }
    }
    
    // Ordina per data di creazione (più recenti prima)
    return results.sort((a, b) => {
      const dateA = userFavorites.find(f => f.video_id === a.id)?.created_at || new Date();
      const dateB = userFavorites.find(f => f.video_id === b.id)?.created_at || new Date();
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }
  
  async addFavorite(favorite: schema.InsertFavorite): Promise<void> {
    const key = favorite.user_id.toString();
    const userFavorites = this.favorites.get(key) || [];
    
    // Controlla se il video è già nei preferiti
    const exists = userFavorites.some(f => f.video_id === favorite.video_id);
    if (exists) {
      return;
    }
    
    // Crea nuovo preferito
    const newFavorite = {
      ...favorite,
      created_at: new Date()
    };
    
    userFavorites.push(newFavorite);
    this.favorites.set(key, userFavorites);
    this.saveFavorites();
  }
  
  async removeFavorite(userId: number, videoId: string): Promise<void> {
    const key = userId.toString();
    const userFavorites = this.favorites.get(key) || [];
    
    // Filtra per rimuovere il preferito
    const updatedFavorites = userFavorites.filter(f => f.video_id !== videoId);
    
    if (updatedFavorites.length !== userFavorites.length) {
      this.favorites.set(key, updatedFavorites);
      this.saveFavorites();
    }
  }
  
  async checkFavorite(userId: number, videoId: string): Promise<boolean> {
    const key = userId.toString();
    const userFavorites = this.favorites.get(key) || [];
    return userFavorites.some(f => f.video_id === videoId);
  }
  
  async getRecentPlays(userId: number, limit: number = 10): Promise<schema.Video[]> {
    const key = userId.toString();
    const userRecentPlays = this.recentPlays.get(key) || [];
    const results: schema.Video[] = [];
    
    // Ordina per data di riproduzione (più recenti prima)
    const sortedPlays = [...userRecentPlays].sort((a, b) => {
      return new Date(b.played_at).getTime() - new Date(a.played_at).getTime();
    }).slice(0, limit);
    
    for (const recentPlay of sortedPlays) {
      const video = this.videos.get(recentPlay.video_id);
      if (video) {
        results.push(video);
      }
    }
    
    return results;
  }
  
  async addRecentPlay(recentPlay: schema.InsertRecentPlay): Promise<void> {
    const key = recentPlay.user_id.toString();
    let userRecentPlays = this.recentPlays.get(key) || [];
    
    // Rimuovi il video se già presente nei recenti
    userRecentPlays = userRecentPlays.filter(rp => rp.video_id !== recentPlay.video_id);
    
    // Aggiungi il nuovo recente
    const newRecentPlay = {
      ...recentPlay,
      played_at: new Date()
    };
    
    userRecentPlays.push(newRecentPlay);
    
    // Limita a 50 riproduzioni recenti
    if (userRecentPlays.length > 50) {
      userRecentPlays.sort((a, b) => {
        return new Date(b.played_at).getTime() - new Date(a.played_at).getTime();
      });
      userRecentPlays = userRecentPlays.slice(0, 50);
    }
    
    this.recentPlays.set(key, userRecentPlays);
    this.saveRecentPlays();
  }
  
  async testDatabaseTables(): Promise<any> {
    try {
      // Test di accesso ai file JSON
      const results = {
        status: "success",
        message: "Test di connessione ai file JSON completato",
        files: {
          users: fs.existsSync(this.usersFile),
          playlists: fs.existsSync(this.playlistsFile),
          videos: fs.existsSync(this.videosFile),
          playlist_videos: fs.existsSync(this.playlistVideosFile),
          favorites: fs.existsSync(this.favoritesFile),
          recent_plays: fs.existsSync(this.recentPlaysFile)
        },
        counts: {
          users: this.users.size,
          playlists: this.playlists.size,
          videos: this.videos.size,
          playlist_videos: Array.from(this.playlistVideos.values()).reduce((acc, curr) => acc + curr.length, 0),
          favorites: Array.from(this.favorites.values()).reduce((acc, curr) => acc + curr.length, 0),
          recent_plays: Array.from(this.recentPlays.values()).reduce((acc, curr) => acc + curr.length, 0)
        }
      };
      
      return results;
    } catch (error: any) {
      console.error("[FileStorage] Errore durante il test delle tabelle:", error);
      return {
        status: "error",
        message: error.message
      };
    }
  }
}

// Memory storage implementation for development/testing
export class MemStorage implements IStorage {
  private users: Map<number, schema.User>;
  private playlists: Map<number, schema.Playlist>;
  private videos: Map<string, schema.Video>;
  private playlistVideos: Map<string, schema.PlaylistVideo[]>;
  private favorites: Map<string, schema.Favorite[]>;
  private recentPlays: Map<string, schema.RecentPlay[]>;
  private userIdCounter: number;
  private playlistIdCounter: number;

  constructor() {
    this.users = new Map();
    this.playlists = new Map();
    this.videos = new Map();
    this.playlistVideos = new Map();
    this.favorites = new Map();
    this.recentPlays = new Map();
    this.userIdCounter = 1;
    this.playlistIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<schema.User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(user: schema.InsertUser): Promise<schema.User> {
    const id = this.userIdCounter++;
    const newUser = { ...user, id, created_at: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }

  // Playlist operations
  async getPlaylists(userId: number): Promise<schema.Playlist[]> {
    const result: schema.Playlist[] = [];
    for (const playlist of this.playlists.values()) {
      if (playlist.user_id === userId) {
        result.push(playlist);
      }
    }
    return result;
  }

  async getPlaylist(id: number): Promise<schema.Playlist | undefined> {
    return this.playlists.get(id);
  }

  async createPlaylist(playlist: schema.InsertPlaylist): Promise<schema.Playlist> {
    const id = this.playlistIdCounter++;
    const newPlaylist = { ...playlist, id, created_at: new Date() };
    this.playlists.set(id, newPlaylist);
    this.playlistVideos.set(`${id}`, []);
    return newPlaylist;
  }

  async updatePlaylist(id: number, playlist: Partial<schema.InsertPlaylist>): Promise<schema.Playlist | undefined> {
    const existingPlaylist = this.playlists.get(id);
    if (!existingPlaylist) {
      return undefined;
    }
    
    const updatedPlaylist = { ...existingPlaylist, ...playlist };
    this.playlists.set(id, updatedPlaylist);
    return updatedPlaylist;
  }

  async deletePlaylist(id: number): Promise<void> {
    this.playlists.delete(id);
    this.playlistVideos.delete(`${id}`);
  }

  // Video operations
  async getVideo(id: string): Promise<schema.Video | undefined> {
    return this.videos.get(id);
  }

  async createVideo(video: schema.InsertVideo): Promise<schema.Video> {
    const existingVideo = this.videos.get(video.id);
    if (existingVideo) {
      return existingVideo;
    }
    
    this.videos.set(video.id, video);
    return video;
  }

  // Playlist video operations
  async getPlaylistVideos(playlistId: number): Promise<(schema.Video & { position: number })[]> {
    const playlistVids = this.playlistVideos.get(`${playlistId}`) || [];
    const result = playlistVids
      .map(pv => {
        const video = this.videos.get(pv.video_id);
        if (!video) return null;
        return { ...video, position: pv.position };
      })
      .filter((v): v is (schema.Video & { position: number }) => v !== null)
      .sort((a, b) => a.position - b.position);
    
    return result;
  }

  async addVideoToPlaylist(playlistVideo: schema.InsertPlaylistVideo): Promise<void> {
    const key = `${playlistVideo.playlist_id}`;
    const existingItems = this.playlistVideos.get(key) || [];
    
    // Check if video already exists in playlist
    const exists = existingItems.some(item => 
      item.playlist_id === playlistVideo.playlist_id && 
      item.video_id === playlistVideo.video_id
    );
    
    if (!exists) {
      const newItem = { ...playlistVideo, created_at: new Date() };
      existingItems.push(newItem);
      this.playlistVideos.set(key, existingItems);
    }
  }

  async removeVideoFromPlaylist(playlistId: number, videoId: string): Promise<void> {
    const key = `${playlistId}`;
    const existingItems = this.playlistVideos.get(key) || [];
    
    const updatedItems = existingItems.filter(item => 
      !(item.playlist_id === playlistId && item.video_id === videoId)
    );
    
    this.playlistVideos.set(key, updatedItems);
  }

  async updateVideoPosition(playlistId: number, videoId: string, position: number): Promise<void> {
    const key = `${playlistId}`;
    const existingItems = this.playlistVideos.get(key) || [];
    
    const updatedItems = existingItems.map(item => {
      if (item.playlist_id === playlistId && item.video_id === videoId) {
        return { ...item, position };
      }
      return item;
    });
    
    this.playlistVideos.set(key, updatedItems);
  }

  // Favorite operations
  async getFavorites(userId: number): Promise<schema.Video[]> {
    const userFavorites = this.favorites.get(`${userId}`) || [];
    
    return userFavorites.map(favorite => {
      const video = this.videos.get(favorite.video_id);
      if (!video) {
        // This shouldn't happen in a real DB but handle it anyway
        return null;
      }
      return video;
    }).filter((v): v is schema.Video => v !== null);
  }

  async addFavorite(favorite: schema.InsertFavorite): Promise<void> {
    const key = `${favorite.user_id}`;
    const existingItems = this.favorites.get(key) || [];
    
    // Check if already exists
    const exists = existingItems.some(item => 
      item.user_id === favorite.user_id && 
      item.video_id === favorite.video_id
    );
    
    if (!exists) {
      const newItem = { ...favorite, created_at: new Date() };
      existingItems.push(newItem);
      this.favorites.set(key, existingItems);
    }
  }

  async removeFavorite(userId: number, videoId: string): Promise<void> {
    const key = `${userId}`;
    const existingItems = this.favorites.get(key) || [];
    
    const updatedItems = existingItems.filter(item => 
      !(item.user_id === userId && item.video_id === videoId)
    );
    
    this.favorites.set(key, updatedItems);
  }

  async checkFavorite(userId: number, videoId: string): Promise<boolean> {
    const userFavorites = this.favorites.get(`${userId}`) || [];
    
    return userFavorites.some(favorite => 
      favorite.user_id === userId && favorite.video_id === videoId
    );
  }

  // Recent plays operations
  async getRecentPlays(userId: number, limit: number = 10): Promise<schema.Video[]> {
    const userPlays = this.recentPlays.get(`${userId}`) || [];
    
    // Sort by played_at descending
    const sortedPlays = [...userPlays].sort((a, b) => 
      b.played_at.getTime() - a.played_at.getTime()
    );
    
    return sortedPlays.slice(0, limit).map(play => {
      const video = this.videos.get(play.video_id);
      if (!video) {
        return null;
      }
      return video;
    }).filter((v): v is schema.Video => v !== null);
  }

  async addRecentPlay(recentPlay: schema.InsertRecentPlay): Promise<void> {
    const key = `${recentPlay.user_id}`;
    let existingItems = this.recentPlays.get(key) || [];
    
    // Remove if already exists (to update timestamp)
    existingItems = existingItems.filter(item => 
      !(item.user_id === recentPlay.user_id && item.video_id === recentPlay.video_id)
    );
    
    const newItem = { ...recentPlay, played_at: new Date() };
    existingItems.push(newItem);
    this.recentPlays.set(key, existingItems);
  }
  
  // Implementazione vuota per la memoria
  async testDatabaseTables(): Promise<any> {
    return {
      connection: "success (memory storage)",
      tables: {
        users: this.users.size,
        playlists: this.playlists.size,
        videos: this.videos.size,
        playlist_videos: Array.from(this.playlistVideos.values()).reduce((acc, curr) => acc + curr.length, 0),
        favorites: Array.from(this.favorites.values()).reduce((acc, curr) => acc + curr.length, 0),
        recent_plays: Array.from(this.recentPlays.values()).reduce((acc, curr) => acc + curr.length, 0)
      }
    };
  }
}

// Utilizziamo sempre lo storage di database se disponibile DATABASE_URL
export const storage = (() => {
  try {
    console.log("[STORAGE] Inizializzazione FileStorage (JSON)");
    return new JsonFileStorage();
  } catch (error) {
    console.error("[STORAGE] Errore durante l'inizializzazione di JsonFileStorage, fallback a MemStorage:", error);
    console.log("[STORAGE] Utilizzo MemStorage come fallback");
    return new MemStorage();
  }
})();
