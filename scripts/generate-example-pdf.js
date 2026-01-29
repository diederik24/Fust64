const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

// Voorbeeld data
const partijInfo = {
  nummer: '76',
  naam: 'Voorbeeld Klant BV',
  type: 'klant'
};

const mutatiesMetSaldo = [
  {
    datum: '2025-01-14',
    gelost_cactag6: 6,
    gelost_bleche: 4,
    geladen_cactag6: 0,
    geladen_bleche: 0,
    saldo_cactag6: 6,
    saldo_bleche: 4,
  },
  {
    datum: '2025-04-04',
    gelost_cactag6: 11,
    gelost_bleche: 16,
    geladen_cactag6: 0,
    geladen_bleche: 0,
    saldo_cactag6: 17,
    saldo_bleche: 20,
  },
  {
    datum: '2025-05-20',
    gelost_cactag6: 9,
    gelost_bleche: 14,
    geladen_cactag6: 0,
    geladen_bleche: 0,
    saldo_cactag6: 26,
    saldo_bleche: 34,
  },
  {
    datum: '2025-06-10',
    gelost_cactag6: 5,
    gelost_bleche: 3,
    geladen_cactag6: 0,
    geladen_bleche: 0,
    saldo_cactag6: 31,
    saldo_bleche: 37,
  },
  {
    datum: '2025-06-13',
    gelost_cactag6: 8,
    gelost_bleche: 16,
    geladen_cactag6: 0,
    geladen_bleche: 0,
    saldo_cactag6: 39,
    saldo_bleche: 53,
  },
  {
    datum: '2025-07-02',
    gelost_cactag6: 6,
    gelost_bleche: 15,
    geladen_cactag6: 0,
    geladen_bleche: 0,
    saldo_cactag6: 45,
    saldo_bleche: 68,
  },
];

const totaleSaldo = {
  cactag6: 45,
  bleche: 68,
};

// Genereer PDF (landscape A4 = 297mm breed, 210mm hoog)
const doc = new jsPDF('landscape', 'mm', 'a4');
doc.setProperties({
  title: 'Fust Overzicht',
  subject: 'Fust Overzicht Klant',
  author: 'Fust Beheer Systeem',
});

// Header met bedrijfsnaam
doc.setFontSize(16);
doc.setFont('helvetica', 'bold');
doc.text('StraverPflanzenExport', 14, 12);

// Titel
doc.setFontSize(18);
doc.setFont('helvetica', 'bold');
doc.text('Fust Overzicht', 14, 20);

// Klant informatie box
const infoY = 28;
doc.setDrawColor(200, 200, 200);
doc.setLineWidth(0.5);
doc.rect(14, infoY - 5, 100, 20);

doc.setFontSize(11);
doc.setFont('helvetica', 'bold');
doc.text('Klant Informatie:', 16, infoY + 2);

doc.setFont('helvetica', 'normal');
doc.setFontSize(10);
doc.text(`Klantnummer: ${partijInfo.nummer}`, 16, infoY + 7);
if (partijInfo.naam) {
  doc.text(`Naam: ${partijInfo.naam}`, 16, infoY + 12);
}
doc.text(`Type: ${partijInfo.type === 'klant' ? 'Klant' : 'Leverancier'}`, 16, infoY + 17);

// Datum en rapport informatie (rechts)
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.text(`Rapport Datum: ${new Date().toLocaleDateString('nl-NL')}`, 200, infoY + 2);
doc.text(`Aantal Mutaties: ${mutatiesMetSaldo.length}`, 200, infoY + 7);
doc.text(`Periode: ${new Date(mutatiesMetSaldo[0]?.datum || Date.now()).toLocaleDateString('nl-NL')} - ${new Date(mutatiesMetSaldo[mutatiesMetSaldo.length - 1]?.datum || Date.now()).toLocaleDateString('nl-NL')}`, 200, infoY + 12);

// Tabel data voorbereiden
const tableData = mutatiesMetSaldo.map(mutatie => [
  new Date(mutatie.datum).toLocaleDateString('nl-NL'),
  '-',
  (mutatie.gelost_cactag6 || 0).toString(),
  (mutatie.gelost_bleche || 0).toString(),
  (mutatie.geladen_cactag6 || 0).toString(),
  (mutatie.geladen_bleche || 0).toString(),
  mutatie.saldo_cactag6.toString(),
  mutatie.saldo_bleche.toString(),
]);

// Genereer tabel
autoTable(doc, {
  startY: infoY + 25,
  margin: { left: 10, right: 10 },
  tableWidth: 'wrap',
  head: [
    [
      'Datum',
      'Referentie',
      'LOSSEN\nCC TAG6\nGroen',
      'LOSSEN\nPlaten',
      'LADEN\nCC TAG6\nGroen',
      'LADEN\nPlaten',
      'saldo\nCC TAG6',
      'saldo\nPlaten',
    ],
  ],
  body: tableData,
  theme: 'grid',
  headStyles: {
    fillColor: [59, 130, 246], // Blauw
    textColor: 255,
    fontStyle: 'bold',
    fontSize: 9,
  },
  columnStyles: {
    0: { cellWidth: 20 },
    1: { cellWidth: 15 },
    2: { cellWidth: 16, halign: 'center', fillColor: [220, 252, 231] }, // Groen voor LOSSEN
    3: { cellWidth: 16, halign: 'center', fillColor: [220, 252, 231] },
    4: { cellWidth: 16, halign: 'center', fillColor: [219, 234, 254] }, // Blauw voor LADEN
    5: { cellWidth: 16, halign: 'center', fillColor: [219, 234, 254] },
    6: { cellWidth: 16, halign: 'center' },
    7: { cellWidth: 16, halign: 'center' },
  },
  styles: {
    fontSize: 7,
    cellPadding: 1.5,
  },
  didParseCell: function (data) {
    // Kleuren voor saldo's
    if (data.column.index === 6 || data.column.index === 7) {
      const value = parseInt(data.cell.text[0] || '0');
      if (value > 0) {
        data.cell.styles.textColor = [34, 197, 94]; // Groen
      } else if (value < 0) {
        data.cell.styles.textColor = [239, 68, 68]; // Rood
      }
    }
  },
});

// Totaalrij
const finalY = doc.lastAutoTable?.finalY || 100;
autoTable(doc, {
  startY: finalY + 5,
  margin: { left: 10, right: 10 },
  tableWidth: 'wrap',
  body: [
    [
      '',
      '',
      '',
      '',
      '',
      '',
      'Totaal saldo:',
      totaleSaldo.cactag6.toString(),
      totaleSaldo.bleche.toString(),
    ],
  ],
  theme: 'grid',
  styles: {
    fontSize: 9,
    fontStyle: 'bold',
    fillColor: [243, 244, 246], // Grijs
    cellPadding: 2,
  },
  columnStyles: {
    0: { cellWidth: 20 },
    1: { cellWidth: 15 },
    2: { cellWidth: 16 },
    3: { cellWidth: 16 },
    4: { cellWidth: 16 },
    5: { cellWidth: 16 },
    6: { cellWidth: 16, halign: 'right' },
    7: { cellWidth: 16, halign: 'center', textColor: [34, 197, 94] },
    8: { cellWidth: 16, halign: 'center', textColor: [34, 197, 94] },
  },
});

// Legenda onderaan met box
const finalY2 = doc.lastAutoTable?.finalY || 120;
const legendaY = finalY2 + 8;

// Legenda box
doc.setDrawColor(240, 240, 240);
doc.setFillColor(250, 250, 250);
doc.rect(14, legendaY - 3, 270, 12, 'FD');

doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
doc.text('Legenda:', 16, legendaY + 2);

doc.setFont('helvetica', 'normal');
doc.text('+ Tegoed Arno Straver / to be received Arno Straver / noch zu erhalten Arno Straver', 16, legendaY + 7);
doc.text('- Tegoed klant / to be received customer / kunde noch zu erhalten', 16, legendaY + 11);

// Footer
const footerY = legendaY + 16;
doc.setFontSize(8);
doc.setFont('helvetica', 'italic');
doc.setTextColor(150, 150, 150);
doc.text(`Gegenereerd op ${new Date().toLocaleString('nl-NL')} door Fust Beheer Systeem`, 14, footerY);
doc.setTextColor(0, 0, 0);

// Sla PDF op
const filename = `voorbeeld-fust-overzicht-klant-${partijInfo.nummer}.pdf`;
doc.save(filename);
console.log(`PDF gegenereerd: ${filename}`);
