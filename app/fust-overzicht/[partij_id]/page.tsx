'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, AlertCircle, Download } from 'lucide-react';
import {
  exportPartijOverzichtPdf,
  exportPartijOverzichtXlsx,
  getAvailableYears,
} from '@/lib/export-partij-overzicht';

interface Mutatie {
  id: number;
  datum: string;
  geladen_cactag6?: number;
  geladen_bleche?: number;
  gelost_cactag6?: number;
  gelost_bleche?: number;
  partij_nummer?: string;
  partij_naam?: string;
  partij_type?: string;
  created_at?: string;
}

interface MutatieMetSaldo extends Mutatie {
  saldo_cactag6: number;
  saldo_bleche: number;
}

function PartijDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const partijId = params.partij_id as string;

  const overzichtQuery = searchParams.toString();
  const terugHref = overzichtQuery
    ? `/fust-overzicht?${overzichtQuery}`
    : '/fust-overzicht';

  const [mutaties, setMutaties] = useState<Mutatie[]>([]);
  const [loading, setLoading] = useState(true);
  const [partijInfo, setPartijInfo] = useState<{ nummer?: string; naam?: string; type?: string }>({});

  const [exportOpen, setExportOpen] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [exporting, setExporting] = useState(false);

  const availableYears = useMemo(() => getAvailableYears(mutaties), [mutaties]);

  useEffect(() => {
    if (partijId) {
      loadMutaties();
    }
  }, [partijId]);

  useEffect(() => {
    if (exportOpen) {
      setSelectedYears(availableYears);
      setExportFormat('pdf');
    }
  }, [exportOpen, availableYears]);

  async function loadMutaties() {
    setLoading(true);
    try {
      console.log('Loading mutaties for partij_id:', partijId);
      const response = await fetch(`/api/mutaties/partij/${partijId}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Fout bij laden mutaties:', errorData);
        console.error('Response status:', response.status);
        return;
      }
      const data = await response.json();
      console.log('Loaded mutaties data:', {
        count: data.length,
        data: data,
        firstMutatie: data[0]
      });

      if (data.length > 0) {
        setPartijInfo({
          nummer: data[0].partij_nummer,
          naam: data[0].partij_naam,
          type: data[0].partij_type,
        });
      } else {
        console.warn('Geen mutaties gevonden voor partij_id:', partijId);
        try {
          const partijResponse = await fetch(`/api/partijen/${partijId}`);
          if (partijResponse.ok) {
            const partijData = await partijResponse.json();
            setPartijInfo({
              nummer: partijData.nummer,
              naam: partijData.naam,
              type: partijData.type,
            });
          }
        } catch (err) {
          console.error('Fout bij ophalen partij info:', err);
        }
      }
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => {
        const dateDiff = new Date(a.datum).getTime() - new Date(b.datum).getTime();
        if (dateDiff !== 0) return dateDiff;
        const createdDiff = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        return createdDiff;
      }) : [];
      console.log('Sorted mutaties:', {
        count: sorted.length,
        mutaties: sorted.map(m => ({
          id: m.id,
          datum: m.datum,
          created_at: m.created_at,
          geladen_cactag6: m.geladen_cactag6,
          geladen_bleche: m.geladen_bleche,
          gelost_cactag6: m.gelost_cactag6,
          gelost_bleche: m.gelost_bleche
        }))
      });
      setMutaties(sorted);
    } catch (error) {
      console.error('Fout bij laden mutaties:', error);
    } finally {
      setLoading(false);
    }
  }

  const totaleSaldoVooraf = useMemo(() => {
    let saldoCactag6 = 0;
    let saldoBleche = 0;

    mutaties.forEach((mutatie) => {
      saldoCactag6 += (mutatie.gelost_cactag6 || 0) - (mutatie.geladen_cactag6 || 0);
      saldoBleche += (mutatie.gelost_bleche || 0) - (mutatie.geladen_bleche || 0);
    });

    return { cactag6: saldoCactag6, bleche: saldoBleche };
  }, [mutaties]);

  const mutatiesMetSaldo = useMemo(() => {
    let saldoCactag6 = 0;
    let saldoBleche = 0;

    const mutatiesMetSaldoBerekend = mutaties.map((mutatie): MutatieMetSaldo => {
      const gelostCactag6 = mutatie.gelost_cactag6 || 0;
      const geladenCactag6 = mutatie.geladen_cactag6 || 0;
      const gelostBleche = mutatie.gelost_bleche || 0;
      const geladenBleche = mutatie.geladen_bleche || 0;

      saldoCactag6 = saldoCactag6 + gelostCactag6 - geladenCactag6;
      saldoBleche = saldoBleche + gelostBleche - geladenBleche;

      return {
        ...mutatie,
        saldo_cactag6: saldoCactag6,
        saldo_bleche: saldoBleche,
      };
    });

    return mutatiesMetSaldoBerekend;
  }, [mutaties]);

  const totaleSaldo = totaleSaldoVooraf;

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort((a, b) => a - b)
    );
  }

  function selectAllYears() {
    setSelectedYears(availableYears);
  }

  function selectNoYears() {
    setSelectedYears([]);
  }

  async function handleExport() {
    if (selectedYears.length === 0) return;
    setExporting(true);
    try {
      const years = [...selectedYears].sort((a, b) => a - b);
      if (exportFormat === 'pdf') {
        await exportPartijOverzichtPdf(partijInfo, mutaties, years);
      } else {
        await exportPartijOverzichtXlsx(partijId, years);
      }
      setExportOpen(false);
    } catch (error) {
      console.error('Fout bij exporteren:', error);
      alert('Fout bij exporteren');
    } finally {
      setExporting(false);
    }
  }

  const typeLabel = (partijInfo.type || 'klant').toUpperCase();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push(terugHref)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar overzicht
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {typeLabel}: {partijInfo.nummer || 'Laden...'}
            {partijInfo.naam && (
              <span className="ml-3 text-2xl font-normal text-gray-600">- {partijInfo.naam}</span>
            )}
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fust Overzicht</CardTitle>
                  <CardDescription>
                    Totaal: {mutaties.length} mutatie{mutaties.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={loadMutaties}
                    disabled={loading}
                    variant="outline"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Vernieuwen
                  </Button>
                  <Button
                    onClick={() => setExportOpen(true)}
                    disabled={loading || mutaties.length === 0}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Mutaties laden...</p>
                </div>
              ) : mutaties.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Geen mutaties gevonden</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Referentie</TableHead>
                        <TableHead colSpan={2} className="text-center border-l">
                          LOSSEN
                        </TableHead>
                        <TableHead colSpan={2} className="text-center border-l">
                          LADEN
                        </TableHead>
                        <TableHead colSpan={2} className="text-center border-l">
                          saldo
                        </TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead></TableHead>
                        <TableHead className="text-center bg-green-50">
                          CC TAG6<br />
                          <span className="text-xs font-normal">Groen</span>
                        </TableHead>
                        <TableHead className="text-center bg-green-50">
                          Platen
                        </TableHead>
                        <TableHead className="text-center bg-blue-50 border-l">
                          CC TAG6<br />
                          <span className="text-xs font-normal">Groen</span>
                        </TableHead>
                        <TableHead className="text-center bg-blue-50">
                          Platen
                        </TableHead>
                        <TableHead className="text-center border-l">
                          CC TAG6
                        </TableHead>
                        <TableHead className="text-center">
                          Platen
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mutatiesMetSaldo.map((mutatie, index) => {
                        return (
                        <motion.tr
                          key={mutatie.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell>
                            {new Date(mutatie.datum).toLocaleDateString('nl-NL')}
                          </TableCell>
                          <TableCell className="text-gray-400">
                            -
                          </TableCell>
                          <TableCell className="text-center bg-green-50">
                            <span className="font-semibold text-green-700">
                              {mutatie.gelost_cactag6 || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center bg-green-50">
                            <span className="font-semibold text-green-700">
                              {mutatie.gelost_bleche || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center bg-blue-50 border-l">
                            <span className="font-semibold text-blue-700">
                              {mutatie.geladen_cactag6 || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center bg-blue-50">
                            <span className="font-semibold text-blue-700">
                              {mutatie.geladen_bleche || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center border-l">
                            {(() => {
                              const saldoCactag6 = (mutatie.gelost_cactag6 || 0) - (mutatie.geladen_cactag6 || 0);
                              return (
                                <span className={`font-semibold ${
                                  saldoCactag6 > 0
                                    ? 'text-green-600'
                                    : saldoCactag6 < 0
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                                }`}>
                                  {saldoCactag6}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-center">
                            {(() => {
                              const saldoBleche = (mutatie.gelost_bleche || 0) - (mutatie.geladen_bleche || 0);
                              return (
                                <span className={`font-semibold ${
                                  saldoBleche > 0
                                    ? 'text-green-600'
                                    : saldoBleche < 0
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                                }`}>
                                  {saldoBleche}
                                </span>
                              );
                            })()}
                          </TableCell>
                        </motion.tr>
                        );
                      })}
                      {mutatiesMetSaldo.length > 0 && (
                        <TableRow className="bg-gray-50 font-bold border-t-2">
                          <TableCell colSpan={6} className="text-right">
                            Totaal saldo:
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`${
                              totaleSaldo.cactag6 > 0
                                ? 'text-green-600'
                                : totaleSaldo.cactag6 < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}>
                              {totaleSaldo.cactag6}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`${
                              totaleSaldo.bleche > 0
                                ? 'text-green-600'
                                : totaleSaldo.bleche < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}>
                              {totaleSaldo.bleche}
                            </span>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="mt-6 pt-4 border-t space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-bold">+</span>
                  <span>Tegoed Arno Straver / to be received Arno Straver / noch zu erhalten Arno Straver</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold">-</span>
                  <span>Tegoed klant / to be received customer / kunde noch zu erhalten</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Overzicht exporteren</DialogTitle>
              <DialogDescription>
                Kies de jaartallen en het bestandsformaat voor{' '}
                {partijInfo.nummer || 'deze partij'}
                {partijInfo.naam ? ` (${partijInfo.naam})` : ''}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">Jaartallen</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllYears}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Alles
                    </button>
                    <span className="text-xs text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={selectNoYears}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Niets
                    </button>
                  </div>
                </div>
                {availableYears.length === 0 ? (
                  <p className="text-sm text-gray-500">Geen jaren beschikbaar</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableYears.map((year) => {
                      const checked = selectedYears.includes(year);
                      return (
                        <label
                          key={year}
                          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                            checked
                              ? 'border-blue-300 bg-blue-50 text-blue-800'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleYear(year)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          {year}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Formaat</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`rounded-md border px-3 py-3 text-sm text-left transition-colors ${
                      exportFormat === 'pdf'
                        ? 'border-blue-300 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-semibold block">PDF</span>
                    <span className="text-xs text-gray-500">A4 staand</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('xlsx')}
                    className={`rounded-md border px-3 py-3 text-sm text-left transition-colors ${
                      exportFormat === 'xlsx'
                        ? 'border-blue-300 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-semibold block">XLSX</span>
                    <span className="text-xs text-gray-500">Excel-overzicht</span>
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExportOpen(false)}
                disabled={exporting}
              >
                Annuleren
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting || selectedYears.length === 0}
              >
                {exporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Bezig...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Downloaden
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default function PartijDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 ml-64 p-8">
            <p className="text-gray-500">Laden...</p>
          </main>
        </div>
      }
    >
      <PartijDetailPageContent />
    </Suspense>
  );
}
