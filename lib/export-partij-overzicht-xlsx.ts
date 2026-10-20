import 'server-only';
import ExcelJS from 'exceljs';
import {
  filterMutatiesByYears,
  partijLabel,
  toNlDate,
  yearsLabel,
  type PartijExportInfo,
  type PartijExportMutatie,
} from './export-partij-overzicht-shared';

export async function buildPartijOverzichtXlsxBuffer(
  partij: PartijExportInfo,
  mutaties: PartijExportMutatie[],
  years: number[]
): Promise<ArrayBuffer> {
  const filtered = filterMutatiesByYears(mutaties, years);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fust Beheer';

  const sheet = workbook.addWorksheet('Overzicht', {
    views: [{ state: 'frozen', ySplit: 6 }],
  });

  const BLUE = 'FF2563EB';
  const LIGHT_GRAY = 'FFF9FAFB';
  const BORDER = 'FFD1D5DB';
  const MUTED = 'FF6B7280';
  const GREEN = 'FF059669';
  const RED = 'FFDC2626';

  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'FustOverzicht';
  titleCell.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 30;

  sheet.mergeCells('A2:H2');
  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value = partijLabel(partij);
  subtitleCell.font = { size: 14, bold: true, color: { argb: 'FF1F2937' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(2).height = 22;

  sheet.mergeCells('A3:H3');
  const dateCell = sheet.getCell('A3');
  dateCell.value = `Datum: ${new Date().toLocaleDateString('nl-NL')}  |  Jaren: ${yearsLabel(years)}`;
  dateCell.font = { size: 10, color: { argb: MUTED } };
  sheet.getRow(3).height = 18;

  sheet.mergeCells('A4:H4');
  const metaCell = sheet.getCell('A4');
  metaCell.value = `Totaal: ${filtered.length} mutatie(s)`;
  metaCell.font = { size: 9, color: { argb: MUTED } };
  sheet.getRow(4).height = 16;

  sheet.getRow(5).height = 5;

  const headers = [
    'Datum',
    'Referentie',
    'LOSSEN CC TAG6 Groen',
    'LOSSEN Platen',
    'LADEN CC TAG6 Groen',
    'LADEN Platen',
    'saldo CC TAG6',
    'saldo Platen',
  ];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER } },
      left: { style: 'thin', color: { argb: BORDER } },
      bottom: { style: 'thin', color: { argb: BORDER } },
      right: { style: 'thin', color: { argb: BORDER } },
    };
  });

  let totaalSaldoCactag6 = 0;
  let totaalSaldoBleche = 0;

  const styleSaldo = (cell: ExcelJS.Cell, value: number) => {
    if (value > 0) cell.font = { bold: true, color: { argb: GREEN } };
    else if (value < 0) cell.font = { bold: true, color: { argb: RED } };
    else cell.font = { bold: true, color: { argb: 'FF374151' } };
  };

  filtered.forEach((m, index) => {
    const d = new Date(m.datum);
    const gelostC = m.gelost_cactag6 || 0;
    const gelostB = m.gelost_bleche || 0;
    const geladenC = m.geladen_cactag6 || 0;
    const geladenB = m.geladen_bleche || 0;
    const saldoC = gelostC - geladenC;
    const saldoB = gelostB - geladenB;

    totaalSaldoCactag6 += saldoC;
    totaalSaldoBleche += saldoB;

    const row = sheet.addRow([
      isNaN(d.getTime()) ? String(m.datum) : toNlDate(d),
      '-',
      gelostC,
      gelostB,
      geladenC,
      geladenB,
      saldoC,
      saldoB,
    ]);

    row.height = 18;
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let i = 3; i <= 8; i++) {
      row.getCell(i).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(i).numFmt = '#,##0';
    }

    if (index % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } };
    }

    styleSaldo(row.getCell(7), saldoC);
    styleSaldo(row.getCell(8), saldoB);

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER } },
        left: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'thin', color: { argb: BORDER } },
        right: { style: 'thin', color: { argb: BORDER } },
      };
    });
  });

  if (filtered.length > 0) {
    const totaalRow = sheet.addRow([
      'Totaal saldo:',
      '',
      '',
      '',
      '',
      '',
      totaalSaldoCactag6,
      totaalSaldoBleche,
    ]);

    sheet.mergeCells(`A${totaalRow.number}:F${totaalRow.number}`);
    const labelCell = sheet.getCell(`A${totaalRow.number}`);
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    labelCell.font = { bold: true };

    totaalRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    totaalRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
    totaalRow.getCell(7).numFmt = '#,##0';
    totaalRow.getCell(8).numFmt = '#,##0';
    styleSaldo(totaalRow.getCell(7), totaalSaldoCactag6);
    styleSaldo(totaalRow.getCell(8), totaalSaldoBleche);

    totaalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    totaalRow.height = 20;
    totaalRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER } },
        left: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'thin', color: { argb: BORDER } },
        right: { style: 'thin', color: { argb: BORDER } },
      };
    });
  }

  const legendStart = sheet.rowCount + 2;
  sheet.getCell(`A${legendStart}`).value =
    '+ Tegoed Arno Straver / to be received Arno Straver / noch zu erhalten Arno Straver';
  sheet.getCell(`A${legendStart + 1}`).value =
    '- Tegoed klant / to be received customer / kunde noch zu erhalten';
  sheet.getCell(`A${legendStart}`).font = { size: 9, color: { argb: MUTED } };
  sheet.getCell(`A${legendStart + 1}`).font = { size: 9, color: { argb: MUTED } };

  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 18;
  sheet.getColumn(6).width = 14;
  sheet.getColumn(7).width = 14;
  sheet.getColumn(8).width = 14;

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
