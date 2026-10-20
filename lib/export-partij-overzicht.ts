import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  buildPartijExportFilename,
  filterMutatiesByYears,
  partijLabel,
  toNlDate,
  yearsLabel,
  type PartijExportInfo,
  type PartijExportMutatie,
} from './export-partij-overzicht-shared';

export type { PartijExportInfo, PartijExportMutatie };
export {
  getAvailableYears,
  filterMutatiesByYears,
  buildPartijExportFilename,
} from './export-partij-overzicht-shared';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportPartijOverzichtPdf(
  partij: PartijExportInfo,
  mutaties: PartijExportMutatie[],
  years: number[]
): Promise<void> {
  const filtered = filterMutatiesByYears(mutaties, years);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const BLUE: [number, number, number] = [37, 99, 235];
  const GREEN: [number, number, number] = [5, 150, 105];
  const RED: [number, number, number] = [220, 38, 38];
  const GRAY: [number, number, number] = [107, 114, 128];

  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('FustOverzicht', pageWidth / 2, 16, { align: 'center' });

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(partijLabel(partij), 14, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, 14, 43);
  doc.setFontSize(9);
  doc.text(
    `Jaren: ${yearsLabel(years)}  |  Totaal: ${filtered.length} mutatie(s)`,
    14,
    49
  );

  let totaalC = 0;
  let totaalB = 0;
  const body = filtered.map((m) => {
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

  if (filtered.length > 0) {
    body.push(['Totaal saldo:', '', '', '', '', '', totaalC, totaalB]);
  }

  autoTable(doc, {
    startY: 54,
    head: [
      [
        { content: 'Datum', rowSpan: 2 },
        { content: 'Ref.', rowSpan: 2 },
        { content: 'LOSSEN', colSpan: 2, styles: { halign: 'center' } },
        { content: 'LADEN', colSpan: 2, styles: { halign: 'center' } },
        { content: 'saldo', colSpan: 2, styles: { halign: 'center' } },
      ],
      ['CC TAG6', 'Platen', 'CC TAG6', 'Platen', 'CC TAG6', 'Platen'],
    ],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.8,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [...BLUE],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'left' },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14, bottom: 28 },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body') return;
      const isTotal =
        hookData.row.index === body.length - 1 && filtered.length > 0;
      if (isTotal) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [243, 244, 246];
      }
      const col = hookData.column.index;
      if (col === 6 || col === 7) {
        const value = Number(hookData.cell.raw ?? 0);
        if (value > 0) hookData.cell.styles.textColor = [...GREEN];
        else if (value < 0) hookData.cell.styles.textColor = [...RED];
      }
    },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 54;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  const legendY = Math.min(finalY + 8, pageHeight - 24);
  doc.setFont('helvetica', 'bold');
  doc.text('+', 14, legendY);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Tegoed Arno Straver / to be received Arno Straver / noch zu erhalten Arno Straver',
    20,
    legendY
  );
  doc.setFont('helvetica', 'bold');
  doc.text('-', 14, legendY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Tegoed klant / to be received customer / kunde noch zu erhalten',
    20,
    legendY + 5
  );

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `© ${new Date().getFullYear()} Fust64 - Alle rechten voorbehouden`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    doc.text(`Pagina ${i} / ${pageCount}`, pageWidth - 14, pageHeight - 8, {
      align: 'right',
    });
  }

  doc.save(buildPartijExportFilename(partij, years, 'pdf'));
}

export async function exportPartijOverzichtXlsx(
  partijId: string | number,
  years: number[]
): Promise<void> {
  const response = await fetch(`/api/fust-overzicht/${partijId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ years, format: 'xlsx' }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Fout bij XLSX export');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || `overzicht-${partijId}.xlsx`;
  downloadBlob(blob, filename);
}
