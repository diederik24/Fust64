/**
 * PDF in dezelfde stijl als Export → PDF op /fust-overzicht,
 * maar alleen voor opgegeven klantnummers.
 *
 * Gebruik:
 *   npx tsx scripts/export-tegoed-selectie-pdf.ts 47,74,87,125,...
 */
import { resolve } from 'path';
import { config } from 'dotenv';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pool } from '@neondatabase/serverless';

config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const nummers = (process.argv[2] || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (nummers.length === 0) {
    throw new Error('Gebruik: npx tsx scripts/export-tegoed-selectie-pdf.ts 47,74,87,...');
  }

  const connectionString = process.env.DATABASE_URL?.trim().replace(/^['"]|['"]$/g, '');
  if (!connectionString) throw new Error('DATABASE_URL ontbreekt');

  const pool = new Pool({ connectionString });
  const outPath = resolve(
    process.cwd(),
    `public/tegoed-selectie-${nummers.join('-')}.pdf`
  );

  try {
    const result = await pool.query<{
      nummer: string;
      naam: string | null;
      cactag6_balans: number;
      bleche_balans: number;
    }>(
      `SELECT
         p.nummer,
         p.naam,
         COALESCE(SUM(m.gelost_cactag6), 0) - COALESCE(SUM(m.geladen_cactag6), 0) AS cactag6_balans,
         COALESCE(SUM(m.gelost_bleche), 0) - COALESCE(SUM(m.geladen_bleche), 0) AS bleche_balans
       FROM partijen p
       LEFT JOIN fust_mutaties m ON m.partij_id = p.id
       WHERE p.type = 'klant'
         AND p.nummer = ANY($1::text[])
       GROUP BY p.id, p.nummer, p.naam
       ORDER BY CASE WHEN p.nummer ~ '^[0-9]+$' THEN p.nummer::int END NULLS LAST, p.nummer`,
      [nummers]
    );

    const found = new Set(result.rows.map((r) => r.nummer));
    const missing = nummers.filter((n) => !found.has(n));
    if (result.rows.length === 0) {
      throw new Error('Geen van de gevraagde klanten gevonden');
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('FustOverzicht', pageWidth / 2, 15, { align: 'center' });

    const datum = new Date().toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text('Selectie klanten', 14, 40);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(`Datum: ${datum}`, 14, 47);
    doc.setFontSize(9);
    doc.text(`Totaal: ${result.rows.length} klant(en)`, 14, 53);

    const tableData = result.rows.map((item) => [
      String(item.nummer || ''),
      String(item.naam || ''),
      Number(item.cactag6_balans || 0),
      Number(item.bleche_balans || 0),
    ]);

    autoTable(doc, {
      head: [['Klant Nummer', 'Naam', 'CC-TAG6 Balans', 'Bleche Balans']],
      body: tableData,
      startY: 58,
      styles: {
        fontSize: 10,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
        overflow: 'linebreak',
        cellWidth: 'wrap',
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 35, halign: 'left' },
        1: { cellWidth: 80, halign: 'left' },
        2: {
          cellWidth: 45,
          halign: 'right',
          cellPadding: { top: 3, bottom: 3, left: 4, right: 8 },
        },
        3: {
          cellWidth: 35,
          halign: 'right',
          cellPadding: { top: 3, bottom: 3, left: 4, right: 12 },
        },
      },
      margin: { top: 42, left: 14, right: 14 },
      didParseCell: function (data: any) {
        if (data.row.index === 0 && (data.column.index === 2 || data.column.index === 3)) {
          data.cell.styles.halign = 'right';
          return;
        }
        if (data.column.index === 2 || data.column.index === 3) {
          data.cell.styles.halign = 'right';
          const value = parseFloat(String(data.cell.text[0] || 0));
          if (value > 0) {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = 'bold';
          } else if (value < 0) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
          data.cell.styles.font = 'courier';
        }
      },
    });

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `© ${new Date().getFullYear()} Fust64 - Alle rechten voorbehouden`,
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );

    doc.save(outPath);
    console.log('Geschreven:', outPath);
    if (missing.length) console.warn('Niet gevonden:', missing.join(', '));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
