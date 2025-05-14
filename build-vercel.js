/**
 * Script di build per Vercel
 * Questo script assicura che il processo di build funzioni su Vercel
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Assicurati che server/routes.ts abbia l'estensione
// Vercel ha problemi con gli import senza estensione
function fixTsImports() {
  try {
    const serverDir = path.join(process.cwd(), 'server');
    const files = fs.readdirSync(serverDir);
    
    files.forEach(file => {
      if (file.endsWith('.ts')) {
        const filePath = path.join(serverDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Aggiungi estensione .ts agli import locali che non hanno estensione
        content = content.replace(/from\s+['"]\.\/([^'"]+)['"]/g, (match, p1) => {
          // Se il percorso non ha già un'estensione, aggiungi .ts
          if (!p1.endsWith('.ts') && !p1.endsWith('.js') && !p1.includes('/')) {
            return `from './${p1}.js'`;
          }
          return match;
        });
        
        // Riscrivi il file con gli import corretti
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed imports in ${file}`);
      }
    });

    console.log('🎉 Import fixes completed!');
  } catch (error) {
    console.error('❌ Error fixing imports:', error);
  }
}

// Esegui il processo di build
async function buildProject() {
  try {
    console.log('🔨 Building project for Vercel...');
    console.log('1️⃣ Checking TypeScript compilation...');
    
    // Compila TypeScript con esbuild
    exec('vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Build error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`⚠️ Build warnings: ${stderr}`);
      }
      console.log('✅ Build completed successfully!');
      console.log(stdout);
      
      // Fix imports in JS files in dist directory
      fixTsImports();
    });
  } catch (error) {
    console.error('❌ Error during build process:', error);
    process.exit(1);
  }
}

// Esegui il build
buildProject();