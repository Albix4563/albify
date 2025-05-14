/**
 * Script di preparazione per il deploy su Vercel
 * Verifica che le chiavi API e le configurazioni del database siano presenti
 */

// Verifica se le variabili d'ambiente necessarie sono configurate
const requiredEnvVars = [
  'YOUTUBE_API_KEY_1',
  'DATABASE_URL'
];

// Array per archiviare le variabili mancanti
const missingVars = [];

// Verifica ciascuna variabile
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  }
});

// Se mancano variabili, mostra un messaggio di errore
if (missingVars.length > 0) {
  console.error(`
===============================================================================
ERRORE: Mancano le seguenti variabili d'ambiente richieste nel deploy Vercel:
${missingVars.map(v => `  - ${v}`).join('\n')}

Assicurati di impostare queste variabili nelle impostazioni del progetto su Vercel:
1. Vai alla dashboard di Vercel
2. Seleziona il tuo progetto
3. Vai a "Settings" > "Environment Variables"
4. Aggiungi le variabili mancanti
===============================================================================
`);
  process.exit(1);
}

// Verifica le chiavi API opzionali
const optionalKeys = ['YOUTUBE_API_KEY_2', 'YOUTUBE_API_KEY_3', 'YOUTUBE_API_KEY_4'];
const availableKeys = optionalKeys.filter(key => process.env[key]);

console.log(`
===============================================================================
CONFIGURAZIONE API YOUTUBE
===============================================================================
- YOUTUBE_API_KEY_1: Configurata
- Chiavi aggiuntive: ${availableKeys.length} configurate

Numero totale di chiavi API YouTube disponibili: ${1 + availableKeys.length}
===============================================================================
`);

// Verifica la connessione al database
console.log(`
===============================================================================
CONFIGURAZIONE DATABASE
===============================================================================
- DATABASE_URL: Configurata

NOTA: Assicurati che:
1. La connessione al database sia configurata correttamente
2. Le tabelle del database siano state create correttamente
===============================================================================
`);

console.log("Verifica delle configurazioni completata con successo!");