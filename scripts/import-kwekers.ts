import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createPartij, getPartijByNummer } from '../lib/db-supabase';

interface KwekerRow {
  code: string;
  naam: string;
}

function parseCSV(filePath: string): KwekerRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  const kwekers: KwekerRow[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse CSV line - handle quoted fields
    const columns: string[] = [];
    let currentField = '';
    let insideQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        if (insideQuotes && line[j + 1] === '"') {
          // Escaped quote
          currentField += '"';
          j++;
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of field
        columns.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    // Add last field
    columns.push(currentField.trim());
    
    // Kolom 19 (index 18) = kweker code (A01, A02, etc.)
    // Kolom 20 (index 19) = naam
    if (columns.length >= 20) {
      const code = columns[18]?.replace(/"/g, '').trim();
      const naam = columns[19]?.replace(/"/g, '').trim();
      
      // Skip if code is empty or if it's a header value
      // Check if code looks like a kweker code (starts with letter, like A01, ASB, B02, etc.)
      if (code && code.length > 0 && 
          code !== 'Leverancier' && 
          code !== 'Naam' &&
          code !== 'Faxnr' &&
          /^[A-Z][A-Z0-9]*$/i.test(code)) { // Pattern: starts with letter, followed by optional letters/numbers
        kwekers.push({
          code: code,
          naam: naam || ''
        });
      }
    }
  }
  
  // Remove duplicates based on code
  const uniqueKwekers = new Map<string, KwekerRow>();
  for (const kweker of kwekers) {
    if (!uniqueKwekers.has(kweker.code)) {
      uniqueKwekers.set(kweker.code, kweker);
    }
  }
  
  return Array.from(uniqueKwekers.values());
}

async function importKwekers(filePath: string) {
  console.log('📂 CSV bestand lezen...');
  const kwekers = parseCSV(filePath);
  console.log(`✅ ${kwekers.length} unieke kwekers gevonden`);
  
  // Show first few examples
  console.log('\n📋 Voorbeelden:');
  kwekers.slice(0, 5).forEach(k => {
    console.log(`   ${k.code}: ${k.naam || '(geen naam)'}`);
  });
  
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors: Array<{ code: string; error: string }> = [];
  
  console.log('\n🔄 Beginnen met importeren...\n');
  
  for (let i = 0; i < kwekers.length; i++) {
    const kweker = kwekers[i];
    
    try {
      // Check if partij already exists
      const existingPartij = await getPartijByNummer(kweker.code);
      
      if (existingPartij) {
        skippedCount++;
        console.log(`  ⏭️  ${kweker.code} (${kweker.naam || 'geen naam'}) - bestaat al, overgeslagen`);
        continue;
      }
      
      // Create new partij as leverancier
      await createPartij(kweker.code, kweker.naam || '', 'leverancier');
      successCount++;
      
      // Progress indicator every 20 kwekers
      if ((i + 1) % 20 === 0) {
        console.log(`  📊 ${i + 1}/${kwekers.length} kwekers verwerkt...`);
      } else {
        console.log(`  ✓ ${kweker.code}: ${kweker.naam || '(geen naam)'}`);
      }
    } catch (error: any) {
      errorCount++;
      const errorMsg = error.message || 'Onbekende fout';
      errors.push({ code: kweker.code, error: errorMsg });
      console.error(`  ❌ ${kweker.code}: ${errorMsg}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT RESULTAAT');
  console.log('='.repeat(50));
  console.log(`✅ Nieuw aangemaakt: ${successCount}`);
  console.log(`⏭️  Overgeslagen (bestond al): ${skippedCount}`);
  console.log(`❌ Gefaald: ${errorCount}`);
  console.log(`📝 Totaal verwerkt: ${kwekers.length}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  FOUTEN:');
    errors.slice(0, 10).forEach(err => {
      console.log(`   ${err.code}: ${err.error}`);
    });
    if (errors.length > 10) {
      console.log(`   ... en ${errors.length - 10} meer fouten`);
    }
  }
  
  console.log('\n✅ Import voltooid!');
}

// Run script
const csvPath = process.argv[2] || 'Kwekers_.csv';

if (!csvPath) {
  console.error('❌ Geef het pad naar het CSV bestand op');
  console.log('Gebruik: npm run import-kwekers <pad-naar-csv-bestand>');
  process.exit(1);
}

importKwekers(csvPath)
  .then(() => {
    console.log('\n🎉 Klaar!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fout bij importeren:', error);
    process.exit(1);
  });
