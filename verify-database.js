/**
 * Script per verificare la connessione al database
 * Utile per testare prima del deploy su Vercel
 */

import { Pool } from "@neondatabase/serverless";
import { config } from 'dotenv';
config();

// Funzione principale per testare la connessione al database
async function verifyDatabaseConnection() {
  console.log('============================================================');
  console.log('VERIFICA CONNESSIONE DATABASE');
  console.log('============================================================');
  
  try {
    // Verifica che DATABASE_URL sia impostato
    if (!process.env.DATABASE_URL) {
      console.log('❌ ERRORE: DATABASE_URL non è impostato nell\'ambiente');
      console.log('Per favore, configura DATABASE_URL in .env o nelle variabili d\'ambiente di Vercel.');
      process.exit(1);
    }
    
    console.log('DATABASE_URL è configurato. Tentativo di connessione al database...');
    
    // Crea un pool di connessione
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Testa la connessione con una query semplice
    const result = await pool.query("SELECT 'Connessione al database riuscita!' AS message");
    console.log('✅ ' + result.rows[0].message);
    
    // Ottieni un elenco delle tabelle nel database
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('⚠️ Nessuna tabella trovata nel database. È necessario creare le tabelle.');
    } else {
      console.log(`✅ Trovate ${tablesResult.rows.length} tabelle nel database:`);
      tablesResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.table_name}`);
      });
    }
    
    // Chiudi il pool di connessione
    await pool.end();
    
    console.log('============================================================');
    console.log('✅ Verifica della connessione al database completata con successo.');
    process.exit(0);
  } catch (error) {
    console.log('❌ ERRORE durante la connessione al database:');
    console.log(error.message);
    console.log('============================================================');
    console.log('Possibili cause:');
    console.log('1. DATABASE_URL non è corretto');
    console.log('2. Il database non è accessibile dalla tua posizione corrente');
    console.log('3. Le credenziali nel DATABASE_URL non sono valide');
    console.log('============================================================');
    process.exit(1);
  }
}

// Esegui la verifica
verifyDatabaseConnection();