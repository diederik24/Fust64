'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { Calendar, ArrowUp, ArrowDown, Save, Hash, Clock } from 'lucide-react';

export default function MutatiePage() {
  const [partijNummer, setPartijNummer] = useState('');
  const [partijType, setPartijType] = useState<'klant' | 'leverancier'>('klant');
  const today = new Date();
  const [dag, setDag] = useState('');
  const [maand, setMaand] = useState('');
  const [jaar, setJaar] = useState('');
  const [gelostCactag6, setGelostCactag6] = useState<string>('0');
  const [gelostBleche, setGelostBleche] = useState<string>('0');
  const [geladenCactag6, setGeladenCactag6] = useState<string>('0');
  const [geladenBleche, setGeladenBleche] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recenteMutaties, setRecenteMutaties] = useState<any[]>([]);

  useEffect(() => {
    loadRecenteMutaties();
    loadLaatsteMutatieDatum();
  }, []);

  async function loadLaatsteMutatieDatum() {
    try {
      const response = await fetch('/api/mutaties');
      if (!response.ok) {
        // Als er geen mutaties zijn, gebruik vandaag als default
        const today = new Date();
        setDag(today.getDate().toString());
        setMaand((today.getMonth() + 1).toString());
        setJaar(today.getFullYear().toString());
        return;
      }
      
      const data = await response.json();
      if (data.error || !Array.isArray(data) || data.length === 0) {
        // Als er geen mutaties zijn, gebruik vandaag als default
        const today = new Date();
        setDag(today.getDate().toString());
        setMaand((today.getMonth() + 1).toString());
        setJaar(today.getFullYear().toString());
        return;
      }
      
      // Sorteer op created_at en neem de nieuwste
      const sortedMutaties = [...data].sort((a: any, b: any) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      
      const laatsteMutatie = sortedMutaties[0];
      if (laatsteMutatie && laatsteMutatie.datum) {
        const datum = new Date(laatsteMutatie.datum);
        setDag(datum.getDate().toString());
        setMaand((datum.getMonth() + 1).toString());
        setJaar(datum.getFullYear().toString());
      } else {
        // Fallback naar vandaag
        const today = new Date();
        setDag(today.getDate().toString());
        setMaand((today.getMonth() + 1).toString());
        setJaar(today.getFullYear().toString());
      }
    } catch (error) {
      console.error('Fout bij laden laatste mutatie datum:', error);
      // Fallback naar vandaag bij error
      const today = new Date();
      setDag(today.getDate().toString());
      setMaand((today.getMonth() + 1).toString());
      setJaar(today.getFullYear().toString());
    }
  }

  async function loadRecenteMutaties() {
    try {
      const response = await fetch('/api/mutaties');
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Fout bij laden mutaties:', errorData);
        setRecenteMutaties([]);
        return;
      }
      const data = await response.json();
      if (data.error) {
        console.error('API error:', data.error);
        setRecenteMutaties([]);
        return;
      }
      
      // Sorteer op created_at (nieuwste eerst) en neem eerste 10
      const sortedMutaties = Array.isArray(data) 
        ? [...data].sort((a: any, b: any) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA; // Nieuwste eerst
          })
        : [];
      
      setRecenteMutaties(sortedMutaties.slice(0, 10));
    } catch (error) {
      console.error('Fout bij laden mutaties:', error);
      setRecenteMutaties([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!partijNummer.trim()) {
      setMessage({ type: 'error', text: 'Voer een klant/leverancier nummer in' });
      setLoading(false);
      return;
    }

    try {
      // Format datum als YYYY-MM-DD
      const datumString = `${jaar}-${maand.padStart(2, '0')}-${dag.padStart(2, '0')}`;
      
      // Valideer dat de datum niet in de toekomst ligt
      const ingevoerdeDatum = new Date(datumString);
      const vandaag = new Date();
      vandaag.setHours(23, 59, 59, 999); // Zet op einde van vandaag
      
      if (ingevoerdeDatum > vandaag) {
        setMessage({ type: 'error', text: 'Je kunt geen mutaties invoeren voor toekomstige datums' });
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/mutaties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partij_nummer: partijNummer.trim(),
          partij_type: partijType,
          datum: datumString,
          geladen: (parseInt(geladenCactag6) || 0) + (parseInt(geladenBleche) || 0),
          gelost: (parseInt(gelostCactag6) || 0) + (parseInt(gelostBleche) || 0),
          geladen_cactag6: parseInt(geladenCactag6) || 0,
          geladen_bleche: parseInt(geladenBleche) || 0,
          gelost_cactag6: parseInt(gelostCactag6) || 0,
          gelost_bleche: parseInt(gelostBleche) || 0,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Mutatie succesvol ingevoerd!' });
        setPartijNummer('');
        setGelostCactag6('0');
        setGelostBleche('0');
        setGeladenCactag6('0');
        setGeladenBleche('0');
        // Behoud de datum (niet resetten naar vandaag)
        // Herlaad recente mutaties
        loadRecenteMutaties();
      } else {
        setMessage({ type: 'error', text: data.error || 'Fout bij invoeren mutatie' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fout bij communiceren met server' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fust Mutatie Invoeren</h1>
          <p className="text-gray-600 mt-2">Voeg een nieuwe fust mutatie toe</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Nieuwe Mutatie</CardTitle>
                <CardDescription>Voer de details van de mutatie in</CardDescription>
              </CardHeader>
              <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="partij-nummer" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    {partijType === 'leverancier' ? 'Kweker Nummer' : 'Klant Nummer'}
                  </Label>
                  <Input
                    id="partij-nummer"
                    type="text"
                    value={partijNummer}
                    onChange={(e) => setPartijNummer(e.target.value)}
                    placeholder={partijType === 'leverancier' ? 'Voer kweker nummer in' : 'Voer klant nummer in'}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partij-type" className="flex items-center gap-2">
                    Type
                  </Label>
                  <Select value={partijType} onValueChange={(value: 'klant' | 'leverancier') => setPartijType(value)} required>
                    <SelectTrigger id="partij-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="klant">Klant</SelectItem>
                      <SelectItem value="leverancier">Leverancier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Datum
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dag" className="text-xs text-muted-foreground">
                      Dag
                    </Label>
                    <Input
                      id="dag"
                      type="number"
                      min="1"
                      max={new Date(parseInt(jaar) || new Date().getFullYear(), parseInt(maand) || new Date().getMonth() + 1, 0).getDate()}
                      value={dag}
                      onChange={(e) => {
                        const value = e.target.value;
                        const maxDag = new Date(parseInt(jaar) || new Date().getFullYear(), parseInt(maand) || new Date().getMonth() + 1, 0).getDate();
                        if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= maxDag)) {
                          setDag(value);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="DD"
                      required
                      className="text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maand" className="text-xs text-muted-foreground">
                      Maand
                    </Label>
                    <Input
                      id="maand"
                      type="number"
                      min="1"
                      max="12"
                      value={maand}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 12)) {
                          setMaand(value);
                          // Reset dag als het niet meer geldig is voor de nieuwe maand
                          const currentDag = parseInt(dag);
                          const maxDag = new Date(parseInt(jaar) || new Date().getFullYear(), parseInt(value) || 1, 0).getDate();
                          if (currentDag > maxDag) {
                            setDag(maxDag.toString());
                          }
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="MM"
                      required
                      className="text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jaar" className="text-xs text-muted-foreground">
                      Jaar
                    </Label>
                    <Input
                      id="jaar"
                      type="number"
                      min="2000"
                      max={new Date().getFullYear()}
                      value={jaar}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Sta alle numerieke invoer toe tijdens het typen
                        if (value === '' || /^\d+$/.test(value)) {
                          setJaar(value);
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        const currentYear = new Date().getFullYear();
                        
                        if (value === '') {
                          setJaar(currentYear.toString());
                          return;
                        }
                        
                        const numValue = parseInt(value);
                        
                        // Als het een 2-cijferig getal is (bijv. 25), maak er 20XX van
                        if (value.length === 2 && numValue >= 0 && numValue <= 99) {
                          const currentCentury = Math.floor(currentYear / 100) * 100;
                          const fullYear = currentCentury + numValue;
                          // Als het jaar in de toekomst is, gebruik vorige eeuw
                          if (fullYear > currentYear) {
                            setJaar((currentCentury - 100 + numValue).toString());
                          } else {
                            setJaar(fullYear.toString());
                          }
                        } else if (isNaN(numValue) || numValue < 2000 || numValue > currentYear) {
                          // Zet terug naar huidig jaar als ongeldig of in de toekomst
                          setJaar(currentYear.toString());
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="YYYY"
                      required
                      className="text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-4 block">
                    <ArrowUp className="inline h-4 w-4 text-green-600 mr-2" />
                    Aantal Gelost
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Label htmlFor="gelost-cactag6" className="text-sm cursor-pointer hover:text-primary transition-colors">
                            CC-TAG6
                          </Label>
                        </DialogTrigger>
                        <DialogContent className="max-w-md p-4">
                          <img 
                            src="/ContainerCentralen_CC_TAG6-on-container.webp" 
                            alt="CC-TAG6 Container"
                            className="w-full h-auto rounded-lg"
                          />
                        </DialogContent>
                      </Dialog>
                      <Input
                        id="gelost-cactag6"
                        type="number"
                        min="0"
                        value={gelostCactag6}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Als het veld leeg is, zet het op 0
                          if (value === '') {
                            setGelostCactag6('0');
                          } else {
                            // Verwijder leading zeros behalve als het alleen 0 is
                            const numValue = value.replace(/^0+/, '') || '0';
                            setGelostCactag6(numValue);
                          }
                        }}
                        onFocus={(e) => {
                          // Selecteer de 0 zodat het direct wordt vervangen bij typen
                          if (e.target.value === '0') {
                            e.target.select();
                          }
                        }}
                        onBlur={(e) => {
                          // Zet op 0 als het veld leeg is wanneer je het veld verlaat
                          if (e.target.value === '') {
                            setGelostCactag6('0');
                          }
                        }}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Label htmlFor="gelost-bleche" className="text-sm cursor-pointer hover:text-primary transition-colors">
                            Bleche
                          </Label>
                        </DialogTrigger>
                        <DialogContent className="max-w-md p-4">
                          <img 
                            src="/plaat_zwaar.jpg" 
                            alt="Bleche"
                            className="w-full h-auto rounded-lg"
                          />
                        </DialogContent>
                      </Dialog>
                      <Input
                        id="gelost-bleche"
                        type="number"
                        min="0"
                        value={gelostBleche}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setGelostBleche('0');
                          } else {
                            const numValue = value.replace(/^0+/, '') || '0';
                            setGelostBleche(numValue);
                          }
                        }}
                        onFocus={(e) => {
                          if (e.target.value === '0') {
                            e.target.select();
                          }
                        }}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-4 block">
                    <ArrowDown className="inline h-4 w-4 text-blue-600 mr-2" />
                    Aantal Geladen
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Label htmlFor="geladen-cactag6" className="text-sm cursor-pointer hover:text-primary transition-colors">
                            CC-TAG6
                          </Label>
                        </DialogTrigger>
                        <DialogContent className="max-w-md p-4">
                          <img 
                            src="/ContainerCentralen_CC_TAG6-on-container.webp" 
                            alt="CC-TAG6 Container"
                            className="w-full h-auto rounded-lg"
                          />
                        </DialogContent>
                      </Dialog>
                      <Input
                        id="geladen-cactag6"
                        type="number"
                        min="0"
                        value={geladenCactag6}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setGeladenCactag6('0');
                          } else {
                            const numValue = value.replace(/^0+/, '') || '0';
                            setGeladenCactag6(numValue);
                          }
                        }}
                        onFocus={(e) => {
                          if (e.target.value === '0') {
                            e.target.select();
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') {
                            setGeladenCactag6('0');
                          }
                        }}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Label htmlFor="geladen-bleche" className="text-sm cursor-pointer hover:text-primary transition-colors">
                            Bleche
                          </Label>
                        </DialogTrigger>
                        <DialogContent className="max-w-md p-4">
                          <img 
                            src="/plaat_zwaar.jpg" 
                            alt="Bleche"
                            className="w-full h-auto rounded-lg"
                          />
                        </DialogContent>
                      </Dialog>
                      <Input
                        id="geladen-bleche"
                        type="number"
                        min="0"
                        value={geladenBleche}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setGeladenBleche('0');
                          } else {
                            const numValue = value.replace(/^0+/, '') || '0';
                            setGeladenBleche(numValue);
                          }
                        }}
                        onFocus={(e) => {
                          if (e.target.value === '0') {
                            e.target.select();
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') {
                            setGeladenBleche('0');
                          }
                        }}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Bezig...' : 'Mutatie Invoeren'}
              </Button>
            </form>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recente Mutaties
              </CardTitle>
              <CardDescription>Laatst ingevoerde mutaties</CardDescription>
            </CardHeader>
            <CardContent>
              {recenteMutaties.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nog geen mutaties ingevoerd
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Datum</TableHead>
                        <TableHead>Klant/Kweker Nummer</TableHead>
                        <TableHead className="text-right">Gelost</TableHead>
                        <TableHead className="text-right">Geladen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recenteMutaties.map((mutatie) => (
                        <TableRow key={mutatie.id}>
                          <TableCell className="font-medium">
                            {new Date(mutatie.datum).toLocaleDateString('nl-NL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{mutatie.partij_nummer || 'Onbekend'}</div>
                              {mutatie.partij_naam && (
                                <div className="text-xs text-muted-foreground">{mutatie.partij_naam}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-sm space-y-1">
                              <div className="text-green-600 font-semibold">
                                CC-TAG6: {mutatie.gelost_cactag6 || 0}
                              </div>
                              <div className="text-green-600 font-semibold">
                                Bleche: {mutatie.gelost_bleche || 0}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-sm space-y-1">
                              <div className="text-blue-600 font-semibold">
                                CC-TAG6: {mutatie.geladen_cactag6 || 0}
                              </div>
                              <div className="text-blue-600 font-semibold">
                                Bleche: {mutatie.geladen_bleche || 0}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </main>
    </div>
  );
}

