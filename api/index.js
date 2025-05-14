// Serverless function per Vercel
import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { registerRoutes } from '../server/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ottieni il percorso alla directory root
const rootDir = path.resolve(__dirname, '..');

// Imposta la directory pubblica
const publicDir = path.join(rootDir, 'dist');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Aggiungiamo headers per evitare problemi di cache
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Servi i file statici dalla directory "dist"
app.use(express.static(publicDir));

// Registra tutte le routes API
const server = await registerRoutes(app);

// Per tutte le altre richieste, invia il file index.html
app.get('*', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not found');
  }
});

// Esporta la funzione serverless
export default app;