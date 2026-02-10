import { readFileSync, writeFileSync } from 'fs';

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

function generateSQL(filePath: string, outputPath: string) {
  console.log('📂 CSV bestand lezen...');
  const kwekers = parseCSV(filePath);
  console.log(`✅ ${kwekers.length} unieke kwekers gevonden`);
  
  if (kwekers.length === 0) {
    console.error('❌ Geen kwekers gevonden in CSV bestand!');
    console.log('Controleer of het CSV bestand de juiste structuur heeft.');
    process.exit(1);
  }
  
  // Show first few examples
  console.log('\n📋 Voorbeelden:');
  kwekers.slice(0, 5).forEach(k => {
    console.log(`   ${k.code}: ${k.naam || '(geen naam)'}`);
  });
  
  // Generate SQL INSERT statements
  let sql = `-- Import script voor kwekers uit CSV
-- Aangemaakt op: ${new Date().toISOString()}
-- Totaal aantal kwekers: ${kwekers.length}

-- Eerst bestaande kwekers verwijderen (optioneel - comment uit als je bestaande data wilt behouden)
-- DELETE FROM partijen WHERE type = 'leverancier';

-- Insert kwekers
INSERT INTO partijen (nummer, naam, type) VALUES
`;

  const values = kwekers.map((k, index) => {
    const naam = k.naam ? `'${k.naam.replace(/'/g, "''")}'` : 'NULL';
    const comma = index < kwekers.length - 1 ? ',' : ';';
    return `('${k.code.replace(/'/g, "''")}', ${naam}, 'leverancier')${comma}`;
  });

  sql += values.join('\n');
  
  // Only add UPDATE statement if there are kwekers
  if (kwekers.length > 0) {
    sql += `\n\n-- Update bestaande kwekers (als nummer al bestaat, update naam)\n`;
    sql += `-- ON CONFLICT (nummer) DO UPDATE SET naam = EXCLUDED.naam;\n`;
    sql += `-- Of gebruik deze query om bestaande kwekers te updaten:\n`;
    sql += `-- UPDATE partijen SET naam = excluded.naam FROM (VALUES\n`;
    
    const updateValues = kwekers.map((k, index) => {
      const naam = k.naam ? `'${k.naam.replace(/'/g, "''")}'` : 'NULL';
      const comma = index < kwekers.length - 1 ? ',' : '';
      return `  ('${k.code.replace(/'/g, "''")}', ${naam})${comma}`;
    });
    
    sql += updateValues.join('\n');
    sql += `\n) AS excluded(nummer, naam)\n`;
    sql += `-- WHERE partijen.nummer = excluded.nummer AND partijen.type = 'leverancier';\n`;
  }
  
  writeFileSync(outputPath, sql, 'utf-8');
  console.log(`\n✅ SQL bestand gegenereerd: ${outputPath}`);
  console.log(`\n💡 Je kunt dit SQL bestand nu uitvoeren in Supabase SQL Editor`);
}

// Run script
const csvPath = process.argv[2] || 'Kwekers_.csv';
const outputPath = process.argv[3] || 'kwekers-import.sql';

if (!csvPath) {
  console.error('❌ Geef het pad naar het CSV bestand op');
  console.log('Gebruik: tsx scripts/generate-kwekers-sql.ts <pad-naar-csv-bestand> [output-pad]');
  process.exit(1);
}

generateSQL(csvPath, outputPath);
console.log('\n🎉 Klaar!');
