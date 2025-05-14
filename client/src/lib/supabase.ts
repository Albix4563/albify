// This file acts as a placeholder for Supabase configuration
// The actual database interactions are handled through the backend API
// which uses Drizzle to connect to the Supabase PostgreSQL database

export const SUPABASE_SETUP_INSTRUCTIONS = `
To use this application with Supabase:

1. Go to the Supabase dashboard (https://supabase.com/dashboard/projects)
2. Create a new project if you haven't already
3. Once in the project page, click the "Connect" button on the top toolbar
4. Copy URI value under "Connection string" -> "Transaction pooler"
5. Replace [YOUR-PASSWORD] with the database password you set for the project
6. Set this as the DATABASE_URL environment variable
`;

// Table creation SQL for reference
export const TABLE_CREATION_SQL = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE playlists (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  duration TEXT
);

CREATE TABLE playlist_videos (
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (playlist_id, video_id)
);

CREATE TABLE favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE recent_plays (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  played_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);
`;
