'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { List, UserCheck, Truck, Filter } from 'lucide-react';

interface Overzicht {
  id: number;
  nummer: string;
  naam: string | null;
  type: 'klant' | 'leverancier';
  totaal_geladen: number;
  totaal_gelost: number;
  balans: number;
}

export default function OverzichtPage() {
  const [overzicht, setOverzicht] = useState<Overzicht[]>([]);
  const [filter, setFilter] = useState<'all' | 'klant' | 'leverancier'>('all');

  useEffect(() => {
    loadOverzicht();
  }, []);

  async function loadOverzicht() {
    console.log('OverzichtPage: Loading overzicht...');
    try {
      const response = await fetch('/api/overzicht');
      console.log('OverzichtPage: Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('OverzichtPage: Response not OK:', errorData);
        return;
      }
      
      const data = await response.json();
      console.log('OverzichtPage: Data received:', {
        isArray: Array.isArray(data),
        count: Array.isArray(data) ? data.length : 'N/A',
        hasError: !!data.error,
        data: data
      });
      
      if (data.error) {
        console.error('OverzichtPage: API error:', data.error);
        return;
      }
      
      setOverzicht(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('OverzichtPage: Exception:', error);
    }
  }

  const gefilterd = filter === 'all' 
    ? overzicht 
    : overzicht.filter(item => item.type === filter);

  const klanten = gefilterd.filter(item => item.type === 'klant');
  const leveranciers = gefilterd.filter(item => item.type === 'leverancier');

  function getBalansTekst(item: Overzicht) {
    if (item.type === 'klant') {
      if (item.balans > 0) {
        return { tekst: `Wij moeten ${item.balans} terugkrijgen`, class: 'text-green-600' };
      } else if (item.balans < 0) {
        return { tekst: `Wij moeten ${Math.abs(item.balans)} teruggeven`, class: 'text-red-600' };
      } else {
        return { tekst: 'In balans', class: 'text-gray-600' };
      }
    } else {
      if (item.balans > 0) {
        return { tekst: `Wij moeten ${item.balans} teruggeven`, class: 'text-red-600' };
      } else if (item.balans < 0) {
        return { tekst: `Wij moeten ${Math.abs(item.balans)} terugkrijgen`, class: 'text-green-600' };
      } else {
        return { tekst: 'In balans', class: 'text-gray-600' };
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fust Overzicht</h1>
          <p className="text-gray-600 mt-2">Balans per klant en leverancier</p>
        </div>

        <div className="flex gap-4 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            <List className="mr-2 h-4 w-4" />
            Alles
          </Button>
          <Button
            variant={filter === 'klant' ? 'default' : 'outline'}
            onClick={() => setFilter('klant')}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Klanten
          </Button>
          <Button
            variant={filter === 'leverancier' ? 'default' : 'outline'}
            onClick={() => setFilter('leverancier')}
          >
            <Truck className="mr-2 h-4 w-4" />
            Leveranciers
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {klanten.length > 0 && (filter === 'all' || filter === 'klant') && (
            <motion.div
              key="klanten"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-semibold text-green-600 mb-4">Klanten</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {klanten.map((item, index) => {
                  const balans = getBalansTekst(item);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{item.nummer}</CardTitle>
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                              Klant
                            </span>
                          </div>
                          {item.naam && (
                            <CardDescription>{item.naam}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Totaal Geladen:</span>
                            <span className="font-semibold">{item.totaal_geladen}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Totaal Gelost:</span>
                            <span className="font-semibold">{item.totaal_gelost}</span>
                          </div>
                          <div className="pt-3 border-t">
                            <p className={`font-bold ${balans.class}`}>{balans.tekst}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {leveranciers.length > 0 && (filter === 'all' || filter === 'leverancier') && (
            <motion.div
              key="leveranciers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-2xl font-semibold text-blue-600 mb-4">Leveranciers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leveranciers.map((item, index) => {
                  const balans = getBalansTekst(item);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{item.nummer}</CardTitle>
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                              Leverancier
                            </span>
                          </div>
                          {item.naam && (
                            <CardDescription>{item.naam}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Totaal Geladen:</span>
                            <span className="font-semibold">{item.totaal_geladen}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Totaal Gelost:</span>
                            <span className="font-semibold">{item.totaal_gelost}</span>
                          </div>
                          <div className="pt-3 border-t">
                            <p className={`font-bold ${balans.class}`}>{balans.tekst}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {gefilterd.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">Geen data beschikbaar</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

