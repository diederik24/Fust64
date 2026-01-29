import { NextRequest, NextResponse } from 'next/server';
import { createMutatie, getPartijByNummer, createPartij } from '@/lib/db-supabase';

interface CSVRow {
  partij_nummer: string;
  datum: string;
  partij_type: 'klant' | 'leverancier';
  geladen_cactag6?: number;
  geladen_bleche?: number;
  gelost_cactag6?: number;
  gelost_bleche?: number;
}

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n after \r
      }
      currentLine.push(currentField.trim());
      if (currentLine.length > 0 && currentLine.some(field => field.length > 0)) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Add last line
  if (currentField.length > 0 || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    if (currentLine.some(field => field.length > 0)) {
      lines.push(currentLine);
    }
  }

  return lines;
}

function validateRow(row: string[], headers: string[]): { valid: boolean; data?: CSVRow; error?: string } {
  if (row.length !== headers.length) {
    return { valid: false, error: `Aantal kolommen komt niet overeen (verwacht ${headers.length}, gevonden ${row.length})` };
  }

  const rowData: any = {};
  headers.forEach((header, idx) => {
    rowData[header] = row[idx];
  });

  // Validatie
  if (!rowData.partij_nummer || rowData.partij_nummer.trim() === '') {
    return { valid: false, error: 'partij_nummer is verplicht' };
  }

  if (!rowData.datum || rowData.datum.trim() === '') {
    return { valid: false, error: 'datum is verplicht' };
  }

  // Datum validatie (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(rowData.datum)) {
    return { valid: false, error: 'datum moet formaat YYYY-MM-DD hebben' };
  }

  // Datum check
  const date = new Date(rowData.datum);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'datum is ongeldig' };
  }

  if (!rowData.partij_type || !['klant', 'leverancier'].includes(rowData.partij_type.toLowerCase())) {
    return { valid: false, error: 'partij_type moet "klant" of "leverancier" zijn' };
  }

  const csvRow: CSVRow = {
    partij_nummer: rowData.partij_nummer.trim(),
    datum: rowData.datum.trim(),
    partij_type: rowData.partij_type.toLowerCase() as 'klant' | 'leverancier',
    geladen_cactag6: parseInt(rowData.geladen_cactag6) || 0,
    geladen_bleche: parseInt(rowData.geladen_bleche) || 0,
    gelost_cactag6: parseInt(rowData.gelost_cactag6) || 0,
    gelost_bleche: parseInt(rowData.gelost_bleche) || 0,
  };

  return { valid: true, data: csvRow };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Geen bestand geüpload' }, { status: 400 });
    }

    const text = await file.text();
    const lines = parseCSV(text);

    if (lines.length === 0) {
      return NextResponse.json({ success: false, error: 'CSV bestand is leeg' }, { status: 400 });
    }

    // Eerste regel zijn headers
    const headers = lines[0].map(h => h.toLowerCase().trim());
    const expectedHeaders = ['partij_nummer', 'datum', 'partij_type', 'geladen_cactag6', 'geladen_bleche', 'gelost_cactag6', 'gelost_bleche'];
    
    // Check of alle headers aanwezig zijn
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Ontbrekende kolommen: ${missingHeaders.join(', ')}` 
      }, { status: 400 });
    }

    const dataRows = lines.slice(1);
    const errors: Array<{ row: number; error: string }> = [];
    let successful = 0;

    // Verwerk elke regel
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 omdat regel 1 headers zijn en we vanaf 0 tellen

      // Skip lege regels
      if (row.every(cell => cell.trim() === '')) {
        continue;
      }

      const validation = validateRow(row, headers);
      if (!validation.valid || !validation.data) {
        errors.push({ row: rowNumber, error: validation.error || 'Validatie gefaald' });
        continue;
      }

      try {
        const csvRow = validation.data;

        // Zoek of maak partij
        let partij = await getPartijByNummer(csvRow.partij_nummer);
        if (!partij) {
          // Maak nieuwe partij aan
          await createPartij(csvRow.partij_nummer, '', csvRow.partij_type);
          partij = await getPartijByNummer(csvRow.partij_nummer);
          if (!partij) {
            errors.push({ row: rowNumber, error: 'Fout bij aanmaken partij' });
            continue;
          }
        }

        console.log(`CSV Import: Creating mutatie for partij nummer ${csvRow.partij_nummer}, partij_id: ${partij.id}, datum: ${csvRow.datum}`);

        // Maak mutatie aan - gebruik EXACT dezelfde functie als handmatige invoer
        const mutatieId = await createMutatie(
          partij.id,
          csvRow.datum,
          csvRow.geladen_cactag6 + csvRow.geladen_bleche,
          csvRow.gelost_cactag6 + csvRow.gelost_bleche,
          csvRow.geladen_cactag6,
          csvRow.geladen_bleche,
          csvRow.gelost_cactag6,
          csvRow.gelost_bleche
        );
        
        console.log(`CSV Import: Mutatie created with ID: ${mutatieId}, partij_id: ${partij.id}`);

        successful++;
      } catch (error: any) {
        errors.push({ 
          row: rowNumber, 
          error: error.message || 'Fout bij verwerken regel' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalRows: dataRows.length,
      successful,
      failed: errors.length,
      errors: errors.slice(0, 50), // Max 50 errors
    });
  } catch (error: any) {
    console.error('Error in CSV import:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Fout bij verwerken CSV bestand'
    }, { status: 500 });
  }
}
