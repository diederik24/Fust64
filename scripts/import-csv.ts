import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createMutatie, getPartijByNummer, createPartij } from '../lib/db-provider';

interface CSVRow {
  partij_nummer: string;
  datum: string;
  partij_type: 'klant' | 'leverancier';
  geladen_cactag6: number;
  geladen_bleche: number;
  gelost_cactag6: number;
  gelost_bleche: number;
}

function parseCSV(filePath: string): CSVRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  // Skip header
  const dataLines = lines.slice(1);
  
  return dataLines.map((line, index) => {
    const columns = line.split(',');
    
    if (columns.length !== 7) {
      throw new Error(`Regel ${index + 2}: Verkeerd aantal kolommen (verwacht 7, gevonden ${columns.length})`);
    }
    
    const [
      partij_nummer,
      datum,
      partij_type,
      geladen_cactag6,
      geladen_bleche,
      gelost_cactag6,
      gelost_bleche
    ] = columns.map(col => col.trim());
    
    // Validatie
    if (!partij_nummer || !datum) {
      throw new Error(`Regel ${index + 2}: partij_nummer en datum zijn verplicht`);
    }
    
    if (!['klant', 'leverancier'].includes(partij_type.toLowerCase())) {
      throw new Error(`Regel ${index + 2}: partij_type moet 'klant' of 'leverancier' zijn`);
    }
    
    // Datum validatie
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(datum)) {
      throw new Error(`Regel ${index + 2}: datum moet formaat YYYY-MM-DD hebben`);
    }
    
    return {
      partij_nummer,
      datum,
      partij_type: partij_type.toLowerCase() as 'klant' | 'leverancier',
      geladen_cactag6: parseInt(geladen_cactag6) || 0,
      geladen_bleche: parseInt(geladen_bleche) || 0,
      gelost_cactag6: parseInt(gelost_cactag6) || 0,
      gelost_bleche: parseInt(gelost_bleche) || 0,
    };
  });
}

async function importCSV(filePath: string) {
  console.log('📂 CSV bestand lezen...');
  const rows = parseCSV(filePath);
  console.log(`✅ ${rows.length} regels gevonden`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ row: number; error: string }> = [];
  
  console.log('\n🔄 Beginnen met importeren...\n');
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 omdat regel 1 headers zijn en we vanaf 0 tellen
    
    try {
      const nummer = row.partij_nummer.trim().toUpperCase();
      let partij = await getPartijByNummer(nummer);

      if (row.partij_type === 'leverancier') {
        if (!partij) {
          throw new Error(`Onbekende kweker: ${nummer}`);
        }
        if (partij.type !== 'leverancier') {
          throw new Error(`Nummer ${nummer} bestaat als klant, niet als kweker`);
        }
      } else if (!partij) {
        await createPartij(nummer, '', 'klant');
        partij = await getPartijByNummer(nummer);
        if (!partij) {
          throw new Error('Fout bij aanmaken partij');
        }
        console.log(`  ✓ Partij ${nummer} aangemaakt`);
      }
      
      // Maak mutatie aan
      await createMutatie(
        partij.id,
        row.datum,
        row.geladen_cactag6 + row.geladen_bleche,
        row.gelost_cactag6 + row.gelost_bleche,
        row.geladen_cactag6,
        row.geladen_bleche,
        row.gelost_cactag6,
        row.gelost_bleche
      );
      
      successCount++;
      
      // Progress indicator elke 50 regels
      if ((i + 1) % 50 === 0) {
        console.log(`  📊 ${i + 1}/${rows.length} regels verwerkt...`);
      }
    } catch (error: any) {
      errorCount++;
      const errorMsg = error.message || 'Onbekende fout';
      errors.push({ row: rowNumber, error: errorMsg });
      console.error(`  ❌ Regel ${rowNumber}: ${errorMsg}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT RESULTAAT');
  console.log('='.repeat(50));
  console.log(`✅ Succesvol: ${successCount}`);
  console.log(`❌ Gefaald: ${errorCount}`);
  console.log(`📝 Totaal: ${rows.length}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  FOUTEN:');
    errors.slice(0, 10).forEach(err => {
      console.log(`   Regel ${err.row}: ${err.error}`);
    });
    if (errors.length > 10) {
      console.log(`   ... en ${errors.length - 10} meer fouten`);
    }
  }
  
  console.log('\n✅ Import voltooid!');
}

// Run script
const csvPath = process.argv[2] || 'Alle_Mutaties_Gefilterd.csv';

if (!csvPath) {
  console.error('❌ Geef het pad naar het CSV bestand op');
  console.log('Gebruik: npm run import-csv <pad-naar-csv-bestand>');
  process.exit(1);
}

importCSV(csvPath)
  .then(() => {
    console.log('\n🎉 Klaar!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fout bij importeren:', error);
    process.exit(1);
  });
