import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, balansType, data } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Geen data beschikbaar' }, { status: 400 });
    }

    if (format === 'excel') {
      // Excel export (.xlsx formaat) met ExcelJS voor betere styling
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tegoed');
      
      const title = balansType === 'positief' ? 'Tegoed Arno Straver' : 'Tegoed Klant';
      const datum = new Date().toLocaleDateString('nl-NL', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Header - FustOverzicht (rij 1)
      worksheet.mergeCells('A1:D1');
      const headerCell = worksheet.getCell('A1');
      headerCell.value = 'FustOverzicht';
      headerCell.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' } // Blauwe achtergrond zoals PDF
      };
      headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 30;

      // Subtitel (rij 2)
      worksheet.mergeCells('A2:D2');
      const titleCell = worksheet.getCell('A2');
      titleCell.value = title;
      titleCell.font = { size: 14, bold: true, color: { argb: 'FF1F2937' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.getRow(2).height = 22;

      // Datum (rij 3)
      worksheet.mergeCells('A3:D3');
      const dateCell = worksheet.getCell('A3');
      dateCell.value = `Datum: ${datum}`;
      dateCell.font = { size: 10, color: { argb: 'FF6B7280' } };
      worksheet.getRow(3).height = 18;

      // Totaal (rij 4)
      worksheet.mergeCells('A4:D4');
      const totalCell = worksheet.getCell('A4');
      totalCell.value = `Totaal: ${data.length} klant(en)`;
      totalCell.font = { size: 9, color: { argb: 'FF6B7280' } };
      worksheet.getRow(4).height = 16;

      // Lege rij
      worksheet.getRow(5).height = 5;

      // Headers (rij 6)
      const headerRow = worksheet.getRow(6);
      headerRow.values = ['Klant Nummer', 'Naam', 'CC-TAG6 Balans', 'Bleche Balans'];
      headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' } // Blauw
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;
      
      // Header cellen rechts uitlijnen voor numerieke kolommen
      const cactag6Header = headerRow.getCell(3);
      const blecheHeader = headerRow.getCell(4);
      cactag6Header.alignment = { vertical: 'middle', horizontal: 'right' };
      blecheHeader.alignment = { vertical: 'middle', horizontal: 'right' };

      // Data rijen (start vanaf rij 7)
      data.forEach((item: any, index: number) => {
        const row = worksheet.getRow(7 + index);
        row.values = [
          item.nummer || '',
          item.naam || '',
          item.cactag6_balans || 0,
          item.bleche_balans || 0
        ];
        
        // Alternerende rij kleuren
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' } // Licht grijs
          };
        }
        
        // Balans kolommen styling
        const cactag6Cell = row.getCell(3);
        const blecheCell = row.getCell(4);
        
        [cactag6Cell, blecheCell].forEach(cell => {
          const value = cell.value as number;
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          
          if (value > 0) {
            cell.font = { bold: true, color: { argb: 'FF059669' } }; // Groen
          } else if (value < 0) {
            cell.font = { bold: true, color: { argb: 'FFDC2626' } }; // Rood
          }
        });
        
        row.height = 20;
      });
      
      // Footer - Copyright (laatste rij + 2)
      const footerRow = worksheet.getRow(7 + data.length + 2);
      worksheet.mergeCells(`A${footerRow.number}:D${footerRow.number}`);
      const footerCell = worksheet.getCell(`A${footerRow.number}`);
      footerCell.value = `© ${new Date().getFullYear()} Fust64 - Alle rechten voorbehouden`;
      footerCell.font = { size: 9, color: { argb: 'FF6B7280' }, italic: true };
      footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
      footerRow.height = 18;
      
      // Lijn boven footer
      const lineRow = worksheet.getRow(7 + data.length + 1);
      ['A', 'B', 'C', 'D'].forEach(col => {
        const cell = worksheet.getCell(`${col}${lineRow.number}`);
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFC8C8C8' } }
        };
      });

      // Kolombreedtes (zoals PDF)
      worksheet.getColumn(1).width = 18; // Klant Nummer
      worksheet.getColumn(2).width = 35; // Naam
      worksheet.getColumn(3).width = 20; // CC-TAG6 Balans
      worksheet.getColumn(4).width = 18; // Bleche Balans

      // Borders voor alle cellen met data (tabel start vanaf rij 6)
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber >= 6 && rowNumber <= 6 + data.length) {
          row.eachCell({ includeEmpty: false }, (cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };
          });
        }
      });

      // Genereer Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="tegoed-${balansType === 'positief' ? 'arno-straver' : 'klant'}-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    } else if (format === 'pdf') {
      // PDF export - gebruik een simpele HTML naar PDF conversie
      const title = balansType === 'positief' ? 'Tegoed Arno Straver' : 'Tegoed Klant';
      const datum = new Date().toLocaleDateString('nl-NL');
      
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1f2937; margin-bottom: 10px; }
            .datum { color: #6b7280; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f3f4f6; padding: 10px; text-align: left; border: 1px solid #d1d5db; }
            td { padding: 10px; border: 1px solid #d1d5db; }
            .balans-positief { color: #059669; font-weight: bold; }
            .balans-negatief { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="datum">Datum: ${datum}</div>
          <table>
            <thead>
              <tr>
                <th>Klant Nummer</th>
                <th>Naam</th>
                <th>CC-TAG6 Balans</th>
                <th>Bleche Balans</th>
              </tr>
            </thead>
            <tbody>
      `;

      data.forEach((item: any) => {
        const cactag6Class = item.cactag6_balans > 0 ? 'balans-positief' : item.cactag6_balans < 0 ? 'balans-negatief' : '';
        const blecheClass = item.bleche_balans > 0 ? 'balans-positief' : item.bleche_balans < 0 ? 'balans-negatief' : '';
        
        htmlContent += `
          <tr>
            <td>${item.nummer || ''}</td>
            <td>${item.naam || ''}</td>
            <td class="${cactag6Class}">${item.cactag6_balans || 0}</td>
            <td class="${blecheClass}">${item.bleche_balans || 0}</td>
          </tr>
        `;
      });

      htmlContent += `
            </tbody>
          </table>
        </body>
        </html>
      `;

      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html;charset=utf-8',
          'Content-Disposition': `attachment; filename="tegoed-${balansType === 'positief' ? 'arno-straver' : 'klant'}-${new Date().toISOString().split('T')[0]}.html"`
        }
      });
    }

    return NextResponse.json({ error: 'Ongeldig formaat' }, { status: 400 });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error.message || 'Fout bij exporteren' }, { status: 500 });
  }
}
