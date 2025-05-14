/**
 * Script per verificare che le chiavi API YouTube siano valide e funzionanti
 * Utile per testare prima del deploy su Vercel
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';
config();

// Funzione per testare una chiave API YouTube
async function testYouTubeApiKey(key, keyNumber) {
  try {
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&key=${key}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ CHIAVE API ${keyNumber} (${maskApiKey(key)}) - FUNZIONANTE`);
      return true;
    } else {
      console.log(`❌ CHIAVE API ${keyNumber} (${maskApiKey(key)}) - ERRORE: ${data.error.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ CHIAVE API ${keyNumber} (${maskApiKey(key)}) - ERRORE: ${error.message}`);
    return false;
  }
}

// Genera una versione mascherata della chiave per la stampa sicura
function maskApiKey(key) {
  if (!key || key.length <= 8) return '********';
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}

// Funzione principale
async function verifyYouTubeApiKeys() {
  console.log('============================================================');
  console.log('VERIFICA CHIAVI API YOUTUBE');
  console.log('============================================================');
  
  // Trova tutte le chiavi API configurate
  const apiKeys = [];
  for (let i = 1; i <= 4; i++) {
    const keyEnvVar = `YOUTUBE_API_KEY_${i}`;
    const apiKey = process.env[keyEnvVar];
    
    if (apiKey && apiKey !== 'YOUR_YOUTUBE_API_KEY_' + i) {
      apiKeys.push({ 
        number: i, 
        key: apiKey 
      });
    }
  }
  
  if (apiKeys.length === 0) {
    console.log('❌ ERRORE: Nessuna chiave API YouTube configurata!');
    console.log('Per favore, configura almeno una chiave API YouTube in .env o nelle variabili d\'ambiente di Vercel.');
    process.exit(1);
  }
  
  console.log(`Trovate ${apiKeys.length} chiavi API YouTube da verificare...`);
  
  // Testa ogni chiave API
  let workingKeys = 0;
  for (const apiKey of apiKeys) {
    const isWorking = await testYouTubeApiKey(apiKey.key, apiKey.number);
    if (isWorking) workingKeys++;
  }
  
  console.log('============================================================');
  if (workingKeys > 0) {
    console.log(`✅ VERIFICA COMPLETATA: ${workingKeys}/${apiKeys.length} chiavi API funzionanti`);
    process.exit(0);
  } else {
    console.log('❌ ERRORE: Nessuna chiave API YouTube funzionante!');
    console.log('Per favore, configura almeno una chiave API YouTube valida.');
    process.exit(1);
  }
}

// Esegui la verifica
verifyYouTubeApiKeys();