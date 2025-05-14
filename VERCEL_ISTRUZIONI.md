# Istruzioni per il Deploy su Vercel

## Preparazione prima del Deploy

Dopo aver esportato questo progetto su GitHub e prima di importarlo su Vercel, segui questi passaggi:

### 1. Aggiungi gli script di utility al package.json

Modifica il file `package.json` aggiungendo questi script nella sezione "scripts":

```json
"scripts": {
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push",
  "vercel-build": "node vercel-setup.js && npm run build",
  "verify-youtube": "node verify-youtube-api.js",
  "verify-db": "node verify-database.js"
},
```

### 2. Verifica le Integrazioni

Prima di deployare su Vercel, verifica che le API di YouTube e la connessione al database funzionino:

```bash
# Verifica le API YouTube
npm run verify-youtube

# Verifica la connessione al database
npm run verify-db
```

### 3. Configura le Variabili d'Ambiente su Vercel

Nella dashboard di Vercel, vai su "Settings" -> "Environment Variables" e aggiungi:

1. `YOUTUBE_API_KEY_1` (obbligatoria)
2. `YOUTUBE_API_KEY_2` (opzionale)
3. `YOUTUBE_API_KEY_3` (opzionale)
4. `YOUTUBE_API_KEY_4` (opzionale)
5. `DATABASE_URL` (stringa di connessione al database)

### 4. Configura le Impostazioni di Build su Vercel

In "Settings" -> "Build & Development Settings":

- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 5. Preparazione Database

Se stai utilizzando Supabase:

1. Crea un nuovo progetto Supabase
2. Vai nella sezione "Settings" -> "Database"
3. Copia la stringa di connessione sotto "Connection Pooling"
4. Sostituisci `[YOUR-PASSWORD]` con la password del database
5. Imposta questa stringa come variabile d'ambiente `DATABASE_URL` su Vercel
6. Esegui la migrazione del database con `npm run db:push` prima del deploy

## Struttura dei File del Progetto

Il progetto è organizzato nei seguenti componenti principali:

- `client/`: Codice frontend React
- `server/`: API e logica backend
- `shared/`: Tipizzazioni e schemi condivisi
- `vercel.json`: Configurazione per il deploy su Vercel
- `verify-youtube-api.js`: Script per verificare le API di YouTube
- `verify-database.js`: Script per verificare la connessione al database

## Note sulla Sicurezza

- Le chiavi API di YouTube sono variabili d'ambiente e non sono mai esposte nel frontend
- Il file `.env` non deve essere incluso nel repository Git
- Utilizza `.env.example` come template per le variabili d'ambiente richieste

## Dopo il Deploy

Dopo il primo deploy, verifica:

1. Che il server sia in esecuzione correttamente
2. Che la connessione al database funzioni
3. Che le API YouTube siano accessibili
4. Che l'autenticazione funzioni correttamente

In caso di problemi, controlla i log di build e runtime su Vercel.