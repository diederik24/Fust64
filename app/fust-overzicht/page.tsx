'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { Package, RefreshCw, AlertCircle, Eye, Search, X, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface FustOverzicht {
  id: number;
  nummer: string;
  naam: string | null;
  type: 'klant' | 'leverancier';
  cactag6_geladen: number;
  cactag6_gelost: number;
  cactag6_balans: number;
  bleche_geladen: number;
  bleche_gelost: number;
  bleche_balans: number;
}

export default function FustOverzichtPage() {
  const [overzicht, setOverzicht] = useState<FustOverzicht[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'klant' | 'leverancier'>('klant');
  const [balansFilter, setBalansFilter] = useState<'none' | 'positief' | 'negatief'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadOverzicht();
  }, []);

  async function loadOverzicht() {
    setLoading(true);
    try {
      const response = await fetch('/api/fust-overzicht');
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Fout bij laden overzicht:', errorData);
        return;
      }
      const data = await response.json();
      setOverzicht(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fout bij laden overzicht:', error);
    } finally {
      setLoading(false);
    }
  }

  const gefilterd = (() => {
    let filtered = overzicht;
    
    // Eerst filteren op type
    if (typeFilter === 'klant') {
      filtered = overzicht.filter(item => item.type === 'klant');
    } else if (typeFilter === 'leverancier') {
      filtered = overzicht.filter(item => item.type === 'leverancier');
    }
    // typeFilter === 'all' betekent alle types, dus geen filter
    
    // Dan filteren op balans (werkt voor zowel klanten als leveranciers op basis van typeFilter)
    if (balansFilter === 'positief') {
      filtered = filtered.filter(item => 
        (item.cactag6_balans > 0 || item.bleche_balans > 0)
      );
    } else if (balansFilter === 'negatief') {
      filtered = filtered.filter(item => 
        (item.cactag6_balans < 0 || item.bleche_balans < 0)
      );
    }
    
    return filtered;
  })().filter(item => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.nummer.toLowerCase().includes(query) ||
      (item.naam && item.naam.toLowerCase().includes(query))
    );
  });

  function formatBalans(balans: number): string {
    if (balans === 0) return '0';
    return balans.toString();
  }

  function getBalansClass(balans: number): string {
    if (balans > 0) return 'text-green-600 font-semibold';
    if (balans < 0) return 'text-red-600 font-semibold';
    return 'text-gray-600';
  }

  async function handleExport(format: 'pdf' | 'excel', balansType: 'positief' | 'negatief') {
    try {
      // Filter data op basis van balans type
      const filteredData = overzicht.filter(item => {
        if (item.type !== 'klant') return false;
        
        if (balansType === 'positief') {
          // Tegoed Arno Straver: klanten met positieve balans
          return (item.cactag6_balans > 0 || item.bleche_balans > 0);
        } else {
          // Tegoed Klant: klanten met negatieve balans
          return (item.cactag6_balans < 0 || item.bleche_balans < 0);
        }
      });

      if (filteredData.length === 0) {
        alert('Geen data beschikbaar voor export');
        return;
      }

      if (format === 'pdf') {
        try {
          // Client-side PDF generatie (jsPDF en autoTable zijn al geïmporteerd)
          const doc = new jsPDF('p', 'mm', 'a4'); // Portrait orientatie (staand)
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          
          // Header - FustOverzicht
          doc.setFillColor(37, 99, 235); // Blauwe achtergrond
          doc.rect(0, 0, pageWidth, 25, 'F'); // Header achtergrond
          
          doc.setFontSize(24);
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.text('FustOverzicht', pageWidth / 2, 15, { align: 'center' });
          
          // Subtitel met betere styling
          const title = balansType === 'positief' ? 'Tegoed Arno Straver' : 'Tegoed Klant';
          const datum = new Date().toLocaleDateString('nl-NL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          doc.setFontSize(16);
          doc.setTextColor(31, 41, 55);
          doc.setFont('helvetica', 'bold');
          doc.text(title, 14, 40);
          
          // Datum
          doc.setFontSize(10);
          doc.setTextColor(107, 114, 128);
          doc.setFont('helvetica', 'normal');
          doc.text(`Datum: ${datum}`, 14, 47);
          
          // Totaal aantal klanten
          doc.setFontSize(9);
          doc.text(`Totaal: ${filteredData.length} klant(en)`, 14, 53);
          
          // Tabel data voorbereiden
          const tableData = filteredData.map((item: any) => [
            String(item.nummer || ''),
            String(item.naam || ''),
            Number(item.cactag6_balans || 0),
            Number(item.bleche_balans || 0)
          ]);

          // Gebruik autoTable als functie, niet als doc.autoTable
          autoTable(doc, {
            head: [['Klant Nummer', 'Naam', 'CC-TAG6 Balans', 'Bleche Balans']],
            body: tableData,
            startY: 58, // Start verder naar beneden vanwege header
            styles: { 
              fontSize: 10,
              cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
              overflow: 'linebreak',
              cellWidth: 'wrap'
            },
            headStyles: { 
              fillColor: [37, 99, 235], // Blauwe header
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 11
            },
            alternateRowStyles: {
              fillColor: [249, 250, 251]
            },
            columnStyles: {
              0: { cellWidth: 35, halign: 'left' }, // Klant Nummer
              1: { cellWidth: 80, halign: 'left' }, // Naam
              2: { 
                cellWidth: 45, 
                halign: 'right',
                cellPadding: { top: 3, bottom: 3, left: 4, right: 8 } // Minder padding rechts
              }, // CC-TAG6 Balans - rechts uitgelijnd met vaste breedte
              3: { 
                cellWidth: 35, 
                halign: 'right',
                cellPadding: { top: 3, bottom: 3, left: 4, right: 12 } // Extra padding rechts voor spacing
              }  // Bleche Balans - smaller kolom, dichter bij CC-TAG6
            },
            margin: { top: 42, left: 14, right: 14 },
            didParseCell: function(data: any) {
              // Header cellen (row index 0) - rechts uitlijnen voor numerieke kolommen
              if (data.row.index === 0 && (data.column.index === 2 || data.column.index === 3)) {
                data.cell.styles.halign = 'right';
                return;
              }
              
              // Body cellen - numerieke kolommen (index 2 en 3) - rechts uitlijnen en monospaced font
              if (data.column.index === 2 || data.column.index === 3) {
                // Zorg dat getallen rechts uitgelijnd zijn
                data.cell.styles.halign = 'right';
                
                // Kleur voor balans kolommen
                const value = parseFloat(String(data.cell.text[0] || 0));
                if (value > 0) {
                  data.cell.styles.textColor = [5, 150, 105]; // groen
                  data.cell.styles.fontStyle = 'bold';
                } else if (value < 0) {
                  data.cell.styles.textColor = [220, 38, 38]; // rood
                  data.cell.styles.fontStyle = 'bold';
                }
                
                // Gebruik monospaced font voor consistente cijferbreedte
                data.cell.styles.font = 'courier';
              }
            }
          });

          // Footer - Copyright tekst
          const finalY = (doc as any).lastAutoTable.finalY || pageHeight - 20;
          
          // Lijn boven footer
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
          
          // Copyright tekst
          doc.setFontSize(9);
          doc.setTextColor(107, 114, 128);
          doc.setFont('helvetica', 'normal');
          const copyrightText = `© ${new Date().getFullYear()} Fust64 - Alle rechten voorbehouden`;
          doc.text(copyrightText, pageWidth / 2, pageHeight - 12, { align: 'center' });

          // Bestand downloaden
          doc.save(`tegoed-${balansType === 'positief' ? 'arno-straver' : 'klant'}-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (pdfError) {
          console.error('PDF export error:', pdfError);
          alert(`Fout bij PDF export: ${pdfError instanceof Error ? pdfError.message : 'Onbekende fout'}`);
        }
      } else {
        // Excel export via API
        const response = await fetch('/api/fust-overzicht/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            format,
            balansType,
            data: filteredData
          })
        });

        if (!response.ok) {
          throw new Error('Export gefaald');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tegoed-${balansType === 'positief' ? 'arno-straver' : 'klant'}-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Fout bij exporteren');
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fust Overzicht</h1>
          <p className="text-gray-600 mt-2">Overzicht van CC-TAG6 en Platen per klant/leverancier</p>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={typeFilter === 'all' && balansFilter === 'none' ? 'default' : 'outline'}
              onClick={() => {
                setTypeFilter('all');
                setBalansFilter('none'); // Reset balans filter
              }}
            >
              <Package className="mr-2 h-4 w-4" />
              Alles
            </Button>
            <Button
              variant={typeFilter === 'klant' && balansFilter === 'none' ? 'default' : 'outline'}
              onClick={() => {
                setTypeFilter('klant');
                setBalansFilter('none'); // Reset balans filter
              }}
            >
              Klanten
            </Button>
            <Button
              variant={typeFilter === 'leverancier' && balansFilter === 'none' ? 'default' : 'outline'}
              onClick={() => {
                setTypeFilter('leverancier');
                setBalansFilter('none'); // Reset balans filter
              }}
            >
              Leveranciers
            </Button>
          </div>
          <div className="flex gap-2 border-l pl-4 ml-2 items-center">
            <Button
              variant={balansFilter === 'positief' ? 'default' : 'outline'}
              onClick={() => {
                setBalansFilter('positief');
                // Als 'all' actief is, zet op klant (default)
                if (typeFilter === 'all') {
                  setTypeFilter('klant');
                }
              }}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              + Tegoed Arno Straver
            </Button>
            <Button
              variant={balansFilter === 'negatief' ? 'default' : 'outline'}
              onClick={() => {
                setBalansFilter('negatief');
                // Als 'all' actief is, zet op klant (default)
                if (typeFilter === 'all') {
                  setTypeFilter('klant');
                }
              }}
              className="text-red-700 border-red-300 hover:bg-red-50"
            >
              - Tegoed klant
            </Button>
            {balansFilter !== 'none' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBalansFilter('none');
                }}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                title="Filter verwijderen"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            onClick={loadOverzicht}
            disabled={loading}
            variant="outline"
            className="ml-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Vernieuwen
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="space-y-1">
                <div className="px-2 py-1.5 text-sm font-semibold text-gray-700">+ Tegoed Arno Straver</div>
                <button
                  onClick={() => handleExport('pdf', 'positief')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                >
                  <img src="/Icon pdf.png" alt="PDF" className="h-6 w-auto object-contain" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => handleExport('excel', 'positief')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                >
                  <img src="/Icon excel.png" alt="Excel" className="h-6 w-auto object-contain" />
                  <span>Excel</span>
                </button>
                <div className="border-t my-1"></div>
                <div className="px-2 py-1.5 text-sm font-semibold text-gray-700">- Tegoed Klant</div>
                <button
                  onClick={() => handleExport('pdf', 'negatief')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                >
                  <img src="/Icon pdf.png" alt="PDF" className="h-6 w-auto object-contain" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => handleExport('excel', 'negatief')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                >
                  <img src="/Icon excel.png" alt="Excel" className="h-6 w-auto object-contain" />
                  <span>Excel</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
                <div className="flex items-center justify-between mb-4 gap-4">
                  <div>
                    <CardTitle>Fust Balans Overzicht</CardTitle>
                    <CardDescription>
                      Totaal: {gefilterd.length} partij{gefilterd.length !== 1 ? 'en' : ''}
                    </CardDescription>
                  </div>
                  <div className="relative w-full max-w-md lg:max-w-lg xl:max-w-xl flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Zoek op nummer of naam..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Overzicht laden...</p>
                </div>
              ) : gefilterd.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Geen data beschikbaar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Klanten</TableHead>
                        <TableHead className="text-center bg-yellow-50">CC TAG6</TableHead>
                        <TableHead className="text-center">Platen</TableHead>
                        <TableHead className="text-right w-[100px]">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gefilterd.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell>
                            <div>
                              <p className="font-semibold">{item.nummer}</p>
                              {item.naam && (
                                <p className="text-sm text-gray-500">{item.naam}</p>
                              )}
                              <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                                item.type === 'klant'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {item.type === 'klant' ? 'Klant' : 'Leverancier'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={getBalansClass(item.cactag6_balans)}>
                              {formatBalans(item.cactag6_balans)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={getBalansClass(item.bleche_balans)}>
                              {formatBalans(item.bleche_balans)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/fust-overzicht/${item.id}`)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Bekijk
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
