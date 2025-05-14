import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script di compatibilità per Vercel
 * Questo script modifica i file compilati aggiungendo le estensioni .js alle importazioni
 * necessarie per il corretto funzionamento con ESM in Node.js
 */
function fixImports() {
  try {
    console.log('🔄 Fixing imports for Vercel compatibility...');
    
    // Directory contenenti i file da modificare
    const serverDir = path.join(__dirname, 'server');
    const sharedDir = path.join(__dirname, 'shared');
    
    // Funzione per gestire ricorsivamente le directory
    function processDirectory(dir) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          processDirectory(filePath);
        } else if (file.endsWith('.ts')) {
          console.log(`Processing ${filePath}`);
          let content = fs.readFileSync(filePath, 'utf8');
          
          // Aggiungi estensione .js agli import locali
          content = content.replace(/from\s+['"]([\.\/]{1,2}[^'"]+)['"]/g, (match, importPath) => {
            // Ignora i percorsi che hanno già un'estensione
            if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
              return match;
            }
            
            // Ignora i pacchetti npm (non iniziano con ./ o ../)
            if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
              return match;
            }
            
            return `from '${importPath}.js'`;
          });
          
          // Aggiungi estensione .js agli import da @shared/
          content = content.replace(/from\s+['"](@shared\/[^'"]+)['"]/g, (match, importPath) => {
            // Ignora i percorsi che hanno già un'estensione
            if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
              return match;
            }
            
            return `from '${importPath}.js'`;
          });
          
          fs.writeFileSync(filePath, content);
        }
      }
    }
    
    // Processa le directory
    if (fs.existsSync(serverDir)) processDirectory(serverDir);
    if (fs.existsSync(sharedDir)) processDirectory(sharedDir);
    
    console.log('✅ Import fix completato!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Esegui il fix
fixImports();