import { pgTable, text, serial, integer, timestamp, primaryKey, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  avatar_url: text("avatar_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Playlists table
export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Videos / Tracks table
export const videos = pgTable("videos", {
  id: text("id").primaryKey(), // YouTube video ID
  title: text("title").notNull(),
  thumbnail: text("thumbnail").notNull(),
  channel_title: text("channel_title").notNull(),
  duration: text("duration"),
});

// Playlist items
export const playlist_videos = pgTable("playlist_videos", {
  playlist_id: integer("playlist_id").notNull().references(() => playlists.id, { onDelete: "cascade" }),
  video_id: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.playlist_id, t.video_id] }),
}));

// Favorites
export const favorites = pgTable("favorites", {
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  video_id: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.user_id, t.video_id] }),
}));

// Recent plays
export const recent_plays = pgTable("recent_plays", {
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  video_id: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  played_at: timestamp("played_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.user_id, t.video_id] }),
}));

// Schemas for inserts
export const insertUserSchema = createInsertSchema(users).omit({ id: true, created_at: true });
export const insertPlaylistSchema = createInsertSchema(playlists).omit({ id: true, created_at: true });
export const insertVideoSchema = createInsertSchema(videos);
export const insertPlaylistVideoSchema = createInsertSchema(playlist_videos).omit({ created_at: true });
export const insertFavoriteSchema = createInsertSchema(favorites).omit({ created_at: true });
export const insertRecentPlaySchema = createInsertSchema(recent_plays).omit({ played_at: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;

export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;

export type PlaylistVideo = typeof playlist_videos.$inferSelect;
export type InsertPlaylistVideo = z.infer<typeof insertPlaylistVideoSchema>;

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export type RecentPlay = typeof recent_plays.$inferSelect;
export type InsertRecentPlay = z.infer<typeof insertRecentPlaySchema>;

// For authentication
export const authUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerUserSchema = authUserSchema.extend({
  username: z.string().min(3).max(50),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;

// YouTube search schema
export const youtubeSearchSchema = z.object({
  query: z.string().min(1),
});

export type YoutubeSearch = z.infer<typeof youtubeSearchSchema>;

// YouTube playlist import schema
export const youtubePlaylistImportSchema = z.object({
  playlistId: z.string().min(1),
  playlistName: z.string().min(1),
  description: z.string().optional(),
  existingPlaylistId: z.number().optional(),
});

export type YoutubePlaylistImport = z.infer<typeof youtubePlaylistImportSchema>;

// YouTube video import schema
export const youtubeVideoImportSchema = z.object({
  videoId: z.string().min(1),
  playlistId: z.number()
});

export type YoutubeVideoImport = z.infer<typeof youtubeVideoImportSchema>;
