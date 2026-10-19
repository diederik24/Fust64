/**
 * Staande PDF: 1 pagina per klant-overzicht (past op A4 portrait).
 *
 * Gebruik:
 *   npx tsx scripts/export-klanten-overzicht-pdf.ts 83,84,92,125,634,920
 */
import { resolve } from 'path';
import { config } from 'dotenv';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pool } from '@neondatabase/serverless';

config({ path: resolve(process.cwd(), '.env') });

type PartijRow = { id: number; nummer: string; naam: string | null; type: string };
type MutatieRow = {
  datum: string;
  geladen_cactag6: number | null;
  geladen_bleche: number | null;
  gelost_cactag6: number | null;
  gelost_bleche: number | null;
};

async function getPartijByNummer(pool: Pool, nummer: string): Promise<PartijRow | null> {
  const r = await pool.query<PartijRow>(
    `SELECT id, nummer, naam, type::text AS type
     FROM partijen WHERE UPPER(nummer) = UPPER($1) LIMIT 1`,
    [nummer.trim()]
  );
  return r.rows[0] ?? null;
}

async function getMutatiesByPartijId(pool: Pool, partijId: number): Promise<MutatieRow[]> {
  const r = await pool.query<MutatieRow>(
    `SELECT datum, geladen_cactag6, geladen_bleche, gelost_cactag6, gelost_bleche
     FROM fust_mutaties
     WHERE partij_id = $1
     ORDER BY datum ASC, created_at ASC`,
    [partijId]
  );
  return r.rows;
}

function toNlDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function parseNummers(arg: string): string[] {
  return arg
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const nummers = parseNummers(process.argv[2] || '83,84,92,125,634,920');
  if (nummers.length === 0) {
    console.error('Gebruik: npx tsx scripts/export-klanten-overzicht-pdf.ts 83,84,92,125,634,920');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL?.trim().replace(/^['"]|['"]$/g, '');
  if (!connectionString) throw new Error('DATABASE_URL ontbreekt');
  const pool = new Pool({ connectionString });

  const outPath = resolve(
    process.cwd(),
    `public/overzicht-klanten-${nummers.join('-')}-staand.pdf`
  );

  const BLUE = [37, 99, 235] as const;
  const LIGHT_GRAY = [249, 250, 251] as const;
  const GRAY = [243, 244, 246] as const;
  const GREEN = [5, 150, 105] as const;
  const RED = [220, 38, 38] as const;
  const MUTED = [107, 114, 128] as const;

  // Kortere headers zodat het op staand A4 past
  const headers = [
    'Datum',
    'Ref.',
    'LOSSEN\nCC',
    'LOSSEN\nPlaten',
    'LADEN\nCC',
    'LADEN\nPlaten',
    'saldo\nCC',
    'saldo\nPlaten',
  ];

  // Portrait A4 in mm – makkelijker schalen voor 1 pagina
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // 210
  const pageH = doc.internal.pageSize.getHeight(); // 297
  const marginX = 10;
  const marginTop = 10;
  const tableW = pageW - marginX * 2;

  // Kolombreedtes die samen tableW vullen
  const ratios = [0.14, 0.07, 0.12, 0.12, 0.12, 0.12, 0.155, 0.155];
  const colW = ratios.map((r) => Math.floor(tableW * r * 10) / 10);
  const used = colW.reduce((s, w) => s + w, 0);
  if (used < tableW) colW[colW.length - 1] += Math.round((tableW - used) * 10) / 10;

  let first = true;
  const missing: string[] = [];

  for (const nummer of nummers) {
    const partij = await getPartijByNummer(pool, nummer);
    if (!partij) {
      missing.push(nummer);
      continue;
    }

    const mutaties = await getMutatiesByPartijId(pool, partij.id);

    let totaalC = 0;
    let totaalB = 0;
    const body: (string | number)[][] = mutaties.map((m) => {
      const d = new Date(m.datum);
      const gelostC = m.gelost_cactag6 || 0;
      const gelostB = m.gelost_bleche || 0;
      const geladenC = m.geladen_cactag6 || 0;
      const geladenB = m.geladen_bleche || 0;
      const saldoC = gelostC - geladenC;
      const saldoB = gelostB - geladenB;
      totaalC += saldoC;
      totaalB += saldoB;
      return [
        isNaN(d.getTime()) ? String(m.datum) : toNlDate(d),
        '-',
        gelostC,
        gelostB,
        geladenC,
        geladenB,
        saldoC,
        saldoB,
      ];
    });

    if (mutaties.length > 0) {
      body.push(['Totaal saldo:', '', '', '', '', '', totaalC, totaalB]);
    }

    if (!first) doc.addPage();
    first = false;

    // Headerbalk
    const headerBarH = 12;
    doc.setFillColor(...BLUE);
    doc.rect(marginX, marginTop, pageW - marginX * 2, headerBarH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('FustOverzicht', marginX + 3, marginTop + 8);

    const subtitle = `${partij.type.toUpperCase()}: ${partij.nummer}${
      partij.naam ? ` - ${partij.naam}` : ''
    }`;
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(subtitle, marginX, marginTop + headerBarH + 7);

    const startY = marginTop + headerBarH + 10;
    // Ruimte tot footer: zorg dat alles op 1 pagina blijft
    const availableH = pageH - startY - 12;

    // Font/padding kleiner bij veel rijen zodat het past
    const rowCount = Math.max(body.length, 1);
    const fontSize = rowCount > 28 ? 6.5 : rowCount > 20 ? 7 : rowCount > 14 ? 7.5 : 8;
    const cellPad = rowCount > 28 ? 1.1 : rowCount > 20 ? 1.3 : rowCount > 14 ? 1.6 : 1.8;

    autoTable(doc, {
      startY,
      margin: { left: marginX, right: marginX, bottom: 10 },
      head: [headers],
      body,
      theme: 'grid',
      // Forceer 1 pagina: geen pageBreak midden in tabel
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
      tableWidth: tableW,
      styles: {
        font: 'helvetica',
        fontSize,
        cellPadding: cellPad,
        overflow: 'linebreak',
        valign: 'middle',
        minCellHeight: fontSize + cellPad * 2,
      },
      headStyles: {
        fillColor: [...BLUE],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: Math.max(fontSize - 0.5, 6),
        cellPadding: cellPad,
      },
      columnStyles: {
        0: { cellWidth: colW[0], halign: 'left' },
        1: { cellWidth: colW[1], halign: 'center' },
        2: { cellWidth: colW[2], halign: 'center' },
        3: { cellWidth: colW[3], halign: 'center' },
        4: { cellWidth: colW[4], halign: 'center' },
        5: { cellWidth: colW[5], halign: 'center' },
        6: { cellWidth: colW[6], halign: 'center' },
        7: { cellWidth: colW[7], halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const rawRow = data.row?.raw as unknown;
        const isTotal =
          Array.isArray(rawRow) && rawRow[0] === 'Totaal saldo:';
        if (isTotal) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [...GRAY];
          if (data.column.index === 0) data.cell.styles.halign = 'right';
        } else if (data.row.index % 2 === 0) {
          data.cell.styles.fillColor = [...LIGHT_GRAY];
        }

        const col = data.column.index;
        if (col === 6 || col === 7) {
          const v =
            typeof data.cell.raw === 'number'
              ? data.cell.raw
              : Number(String(data.cell.raw ?? '').trim());
          if (Number.isFinite(v)) {
            if (v > 0) data.cell.styles.textColor = [...GREEN];
            else if (v < 0) data.cell.styles.textColor = [...RED];
          }
        }
      },
    });

    // Als autoTable toch een 2e pagina heeft gemaakt voor deze klant: log waarschuwing
    // (we schalen al op basis van rowCount; bij extreme aantallen kan het nog knellen)
    void availableH;
  }

  if (first) {
    console.error('Geen van de gevraagde partijen gevonden.');
    process.exit(1);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(`© ${new Date().getFullYear()} Fust64`, marginX, pageH - 5);
    doc.text(`Pagina ${i} / ${pageCount}`, pageW - marginX, pageH - 5, {
      align: 'right',
    });
  }

  doc.save(outPath);
  await pool.end();
  console.log('Geschreven:', outPath);
  console.log('Klanten:', nummers.join(', '), `(${nummers.length} pagina's verwacht)`);
  console.log('Pagina\'s in PDF:', pageCount);
  if (missing.length) console.warn('Niet gevonden:', missing.join(', '));
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
