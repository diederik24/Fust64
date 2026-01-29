'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

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
}

interface MutatieMetSaldo extends Mutatie {
  saldo_cactag6: number;
  saldo_bleche: number;
}

export default function PartijDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partijId = params.partij_id as string;
  
  const [mutaties, setMutaties] = useState<Mutatie[]>([]);
  const [loading, setLoading] = useState(true);
  const [partijInfo, setPartijInfo] = useState<{ nummer?: string; naam?: string; type?: string }>({});

  useEffect(() => {
    if (partijId) {
      loadMutaties();
    }
  }, [partijId]);

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
        // Probeer partij info op te halen zelfs als er geen mutaties zijn
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
      // Sorteer op datum (oudste eerst) voor cumulatieve saldo berekening
      // Als datum gelijk is, sorteer op created_at (oudste eerst)
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => {
        const dateDiff = new Date(a.datum).getTime() - new Date(b.datum).getTime();
        if (dateDiff !== 0) return dateDiff;
        // Tie-breaker: sorteer op created_at
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

  // Bereken cumulatieve saldo's en verschil
  // Eerst berekenen we het totaal saldo vanaf het begin
  const totaleSaldoVooraf = useMemo(() => {
    let saldoCactag6 = 0;
    let saldoBleche = 0;
    
    mutaties.forEach((mutatie) => {
      saldoCactag6 += (mutatie.gelost_cactag6 || 0) - (mutatie.geladen_cactag6 || 0);
      saldoBleche += (mutatie.gelost_bleche || 0) - (mutatie.geladen_bleche || 0);
    });
    
    return { cactag6: saldoCactag6, bleche: saldoBleche };
  }, [mutaties]);

  // Bereken saldo per mutatie (van oud naar nieuw, cumulatief)
  // We berekenen eerst alle saldi van oud naar nieuw
  const mutatiesMetSaldo = useMemo(() => {
    let saldoCactag6 = 0;
    let saldoBleche = 0;

    const mutatiesMetSaldoBerekend = mutaties.map((mutatie): MutatieMetSaldo => {
      const gelostCactag6 = mutatie.gelost_cactag6 || 0;
      const geladenCactag6 = mutatie.geladen_cactag6 || 0;
      const gelostBleche = mutatie.gelost_bleche || 0;
      const geladenBleche = mutatie.geladen_bleche || 0;

      // Saldo = vorige saldo + gelost - geladen
      saldoCactag6 = saldoCactag6 + gelostCactag6 - geladenCactag6;
      saldoBleche = saldoBleche + gelostBleche - geladenBleche;

      return {
        ...mutatie,
        saldo_cactag6: saldoCactag6,
        saldo_bleche: saldoBleche,
      };
    });
    
    // Retourneer zonder reverse - oudste eerst (zoals gesorteerd)
    return mutatiesMetSaldoBerekend;
  }, [mutaties]);

  // Bereken totale saldo's - gebruik de vooraf berekende totale saldo
  const totaleSaldo = totaleSaldoVooraf;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/fust-overzicht')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar overzicht
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            KLANT: {partijInfo.nummer || 'Laden...'}
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
                <Button
                  onClick={loadMutaties}
                  disabled={loading}
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Vernieuwen
                </Button>
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
                        const isLaatsteRij = index === mutatiesMetSaldo.length - 1;
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
                              // Bereken het verschil voor deze specifieke mutatie: gelost - geladen
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
                              // Bereken het verschil voor deze specifieke mutatie: gelost - geladen
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
                      {/* Totaal rij */}
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
              {/* Legenda */}
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
      </main>
    </div>
  );
}
