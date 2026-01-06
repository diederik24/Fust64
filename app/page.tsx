'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { getOverzicht, getMutaties } from './actions';
import { Package, TrendingUp, TrendingDown, Users } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totaalPartijen: 0,
    totaalKlanten: 0,
    totaalLeveranciers: 0,
    totaalGeladen: 0,
    totaalGelost: 0,
  });
  const [recenteMutaties, setRecenteMutaties] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [overzicht, mutaties] = await Promise.all([
      getOverzicht(),
      getMutaties(),
    ]);

    const totaalPartijen = overzicht.length;
    const totaalKlanten = overzicht.filter(p => p.type === 'klant').length;
    const totaalLeveranciers = overzicht.filter(p => p.type === 'leverancier').length;
    const totaalGeladen = overzicht.reduce((sum, p) => sum + p.totaal_geladen, 0);
    const totaalGelost = overzicht.reduce((sum, p) => sum + p.totaal_gelost, 0);

    setStats({
      totaalPartijen,
      totaalKlanten,
      totaalLeveranciers,
      totaalGeladen,
      totaalGelost,
    });

    setRecenteMutaties(mutaties.slice(0, 5));
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Overzicht van fust beheer</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totaal Partijen</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="text-2xl font-bold"
                >
                  {stats.totaalPartijen}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Klanten</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="text-2xl font-bold text-green-600"
                >
                  {stats.totaalKlanten}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leveranciers</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="text-2xl font-bold text-blue-600"
                >
                  {stats.totaalLeveranciers}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totaal Geladen</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="text-2xl font-bold"
                >
                  {stats.totaalGeladen}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recente Mutaties</CardTitle>
              <CardDescription>Laatste 5 mutaties</CardDescription>
            </CardHeader>
            <CardContent>
              {recenteMutaties.length === 0 ? (
                <p className="text-gray-500">Geen mutaties gevonden</p>
              ) : (
                <div className="space-y-4">
                  {recenteMutaties.map((mutatie, index) => (
                    <motion.div
                      key={mutatie.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div>
                        <p className="font-semibold">{mutatie.partij_nummer} - {mutatie.partij_naam || 'Geen naam'}</p>
                        <p className="text-sm text-gray-500">{new Date(mutatie.datum).toLocaleDateString('nl-NL')}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Geladen</p>
                          <p className="font-semibold text-green-600">{mutatie.geladen}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Gelost</p>
                          <p className="font-semibold text-blue-600">{mutatie.gelost}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

