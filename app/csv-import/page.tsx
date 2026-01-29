'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, XCircle, Download, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface ImportResult {
  success: boolean;
  totalRows: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export default function CSVImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [showDetails, setShowDetails] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
      setResult(null);
      
      // Preview van CSV
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').slice(0, 6); // Eerste 6 regels
        const previewData = lines.map(line => {
          // Simpele CSV parsing (geen quotes handling voor preview)
          return line.split(',').map(cell => cell.trim());
        });
        setPreview(previewData);
      };
      reader.readAsText(selectedFile);
    } else {
      alert('Selecteer een CSV bestand');
    }
  }

  async function handleImport() {
    if (!file) {
      alert('Selecteer eerst een CSV bestand');
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/mutaties/csv-import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          totalRows: data.totalRows || 0,
          successful: data.successful || 0,
          failed: data.failed || 0,
          errors: data.errors || [],
        });
      } else {
        setResult({
          success: false,
          totalRows: 0,
          successful: 0,
          failed: 0,
          errors: [{ row: 0, error: data.error || 'Onbekende fout' }],
        });
      }
    } catch (error) {
      setResult({
        success: false,
        totalRows: 0,
        successful: 0,
        failed: 0,
        errors: [{ row: 0, error: 'Fout bij uploaden bestand' }],
      });
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const csvContent = `partij_nummer,datum,partij_type,geladen_cactag6,geladen_bleche,gelost_cactag6,gelost_bleche
12345,2024-01-15,klant,10,5,2,1
67890,2024-01-16,leverancier,0,0,20,10`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mutaties-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CSV Import</h1>
          <div className="text-gray-600 mt-2">
            <p>
              Upload een CSV bestand om meerdere mutaties tegelijk te importeren. Het systeem controleert automatisch of alle gegevens correct zijn en maakt nieuwe partijen aan indien nodig.
            </p>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Minder informatie
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Meer informatie
                </>
              )}
            </button>
            {showDetails && (
              <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-2">
                <p>
                  <strong>Belangrijke vereisten:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>CSV bestand moet de volgende kolommen bevatten: <code className="bg-white px-1 rounded">partij_nummer</code>, <code className="bg-white px-1 rounded">datum</code>, <code className="bg-white px-1 rounded">partij_type</code>, <code className="bg-white px-1 rounded">geladen_cactag6</code>, <code className="bg-white px-1 rounded">geladen_bleche</code>, <code className="bg-white px-1 rounded">gelost_cactag6</code>, <code className="bg-white px-1 rounded">gelost_bleche</code></li>
                  <li>Datum formaat moet <code className="bg-white px-1 rounded">YYYY-MM-DD</code> zijn (bijvoorbeeld: 2024-01-15)</li>
                  <li><code className="bg-white px-1 rounded">partij_type</code> moet exact <code className="bg-white px-1 rounded">klant</code> of <code className="bg-white px-1 rounded">leverancier</code> zijn</li>
                  <li>Numerieke velden kunnen leeg zijn (worden dan als 0 behandeld)</li>
                  <li>Als een partij nog niet bestaat, wordt deze automatisch aangemaakt</li>
                </ul>
                <p className="pt-2">
                  <strong>Tip:</strong> Download het template om te zien hoe je CSV bestand eruit moet zien.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>CSV Bestand Uploaden</CardTitle>
                <CardDescription>
                  Upload een CSV bestand met mutatie gegevens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">CSV Bestand</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                  <p className="text-sm text-gray-500">
                    Selecteer een CSV bestand met mutatie gegevens
                  </p>
                </div>

                {file && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">{file.name}</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={handleImport}
                    disabled={!file || loading}
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {loading ? 'Bezig met importeren...' : 'Importeer CSV'}
                  </Button>
                  <Button
                    onClick={downloadTemplate}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">CSV Formaat:</h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li><strong>partij_nummer</strong> (verplicht) - Klant/Kweker nummer</li>
                    <li><strong>datum</strong> (verplicht) - Datum in formaat YYYY-MM-DD</li>
                    <li><strong>partij_type</strong> (verplicht) - klant of leverancier</li>
                    <li><strong>geladen_cactag6</strong> (optioneel) - Aantal geladen CC-TAG6</li>
                    <li><strong>geladen_bleche</strong> (optioneel) - Aantal geladen Bleche</li>
                    <li><strong>gelost_cactag6</strong> (optioneel) - Aantal gelost CC-TAG6</li>
                    <li><strong>gelost_bleche</strong> (optioneel) - Aantal gelost Bleche</li>
                  </ul>
                </div>
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
                <CardTitle>Preview</CardTitle>
                <CardDescription>Eerste regels van het CSV bestand</CardDescription>
              </CardHeader>
              <CardContent>
                {preview.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {preview[0]?.map((header, idx) => (
                            <th key={idx} className="text-left p-2 font-semibold">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(1).map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-b">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="p-2 text-gray-600">
                                {cell || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Selecteer een CSV bestand om preview te zien
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Import Resultaat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {result.totalRows}
                      </div>
                      <div className="text-sm text-gray-600">Totaal regels</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {result.successful}
                      </div>
                      <div className="text-sm text-green-700">Succesvol</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {result.failed}
                      </div>
                      <div className="text-sm text-red-700">Gefaald</div>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Fouten:
                      </h3>
                      <ul className="text-sm text-red-800 space-y-1">
                        {result.errors.map((error, idx) => (
                          <li key={idx}>
                            Regel {error.row}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
