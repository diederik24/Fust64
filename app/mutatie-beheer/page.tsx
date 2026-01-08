'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Mutatie {
  id: number;
  partij_nummer?: string;
  partij_naam?: string;
  partij_type?: string;
  datum: string;
  geladen: number;
  gelost: number;
  geladen_cactag6?: number;
  geladen_bleche?: number;
  gelost_cactag6?: number;
  gelost_bleche?: number;
  created_at: string;
}

export default function MutatieBeheerPage() {
  const [mutaties, setMutaties] = useState<Mutatie[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mutatieToDelete, setMutatieToDelete] = useState<Mutatie | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadMutaties();
  }, []);

  async function loadMutaties() {
    setLoading(true);
    try {
      const response = await fetch('/api/mutaties');
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Fout bij laden mutaties:', errorData);
        setMessage({ type: 'error', text: 'Fout bij laden mutaties' });
        setMutaties([]);
        return;
      }
      const data = await response.json();
      if (data.error) {
        console.error('API error:', data.error);
        setMessage({ type: 'error', text: data.error });
        setMutaties([]);
        return;
      }
      setMutaties(Array.isArray(data) ? data : []);
      setMessage(null);
    } catch (error) {
      console.error('Fout bij laden mutaties:', error);
      setMessage({ type: 'error', text: 'Fout bij communiceren met server' });
      setMutaties([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(mutatie: Mutatie) {
    setDeletingId(mutatie.id);
    try {
      const response = await fetch(`/api/mutaties/${mutatie.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Mutatie succesvol verwijderd' });
        setDeleteDialogOpen(false);
        setMutatieToDelete(null);
        // Herlaad mutaties
        await loadMutaties();
      } else {
        setMessage({ type: 'error', text: data.error || 'Fout bij verwijderen mutatie' });
      }
    } catch (error) {
      console.error('Fout bij verwijderen mutatie:', error);
      setMessage({ type: 'error', text: 'Fout bij communiceren met server' });
    } finally {
      setDeletingId(null);
    }
  }

  function openDeleteDialog(mutatie: Mutatie) {
    setMutatieToDelete(mutatie);
    setDeleteDialogOpen(true);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mutatie Beheer</h1>
          <p className="text-gray-600 mt-2">Beheer en verwijder mutaties</p>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alle Mutaties</CardTitle>
                  <CardDescription>
                    Totaal: {mutaties.length} mutatie{mutaties.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Button
                  onClick={loadMutaties}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
                        <TableHead>Klant/Kweker</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Gelost</TableHead>
                        <TableHead>Geladen</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mutaties.map((mutatie, index) => (
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
                          <TableCell>
                            <div>
                              <p className="font-semibold">{mutatie.partij_nummer || 'Onbekend'}</p>
                              {mutatie.partij_naam && (
                                <p className="text-sm text-gray-500">{mutatie.partij_naam}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                mutatie.partij_type === 'klant'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {mutatie.partij_type === 'klant' ? 'Klant' : 'Leverancier'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>CC-TAG6: <span className="font-semibold text-green-600">{mutatie.gelost_cactag6 || 0}</span></p>
                              <p>Bleche: <span className="font-semibold text-green-600">{mutatie.gelost_bleche || 0}</span></p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>CC-TAG6: <span className="font-semibold text-blue-600">{mutatie.geladen_cactag6 || 0}</span></p>
                              <p>Bleche: <span className="font-semibold text-blue-600">{mutatie.geladen_bleche || 0}</span></p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog open={deleteDialogOpen && mutatieToDelete?.id === mutatie.id} onOpenChange={setDeleteDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => openDeleteDialog(mutatie)}
                                  className="flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Verwijderen
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Mutatie verwijderen?</DialogTitle>
                                  <DialogDescription>
                                    Weet je zeker dat je deze mutatie wilt verwijderen?
                                    <br />
                                    <br />
                                    <strong>Datum:</strong> {new Date(mutatie.datum).toLocaleDateString('nl-NL')}
                                    <br />
                                    <strong>Klant/Kweker:</strong> {mutatie.partij_nummer} {mutatie.partij_naam ? `- ${mutatie.partij_naam}` : ''}
                                    <br />
                                    <strong>Gelost:</strong> CC-TAG6: {mutatie.gelost_cactag6 || 0}, Bleche: {mutatie.gelost_bleche || 0}
                                    <br />
                                    <strong>Geladen:</strong> CC-TAG6: {mutatie.geladen_cactag6 || 0}, Bleche: {mutatie.geladen_bleche || 0}
                                    <br />
                                    <br />
                                    Deze actie kan niet ongedaan worden gemaakt.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setDeleteDialogOpen(false);
                                      setMutatieToDelete(null);
                                    }}
                                  >
                                    Annuleren
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleDelete(mutatie)}
                                    disabled={deletingId === mutatie.id}
                                  >
                                    {deletingId === mutatie.id ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                        Verwijderen...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Verwijderen
                                      </>
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
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

